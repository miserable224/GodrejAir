using System.Globalization;
using System.Security.Claims;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.JsonWebTokens;
using SecurityOps.Api.Auth;
using SecurityOps.Api.Services.Chat;
using SecurityOps.Application.Common.Interfaces;
using SecurityOps.Application.Common.Models;
using SecurityOps.Domain.Entities.Community;

namespace SecurityOps.Api.Controllers.Community;

/// <summary>
/// Community chat orchestrator.
/// English question → LLM picks tool → backend hits DB → LLM rewrites
/// answer in English. Falls back to a rule-based parser when no LLM
/// key is configured.
/// </summary>
[ApiController]
[Route("api/chat")]
[Tags("Community")]
[Authorize(Roles = AppRoles.AllAuthenticated)]
public sealed class ChatController : ControllerBase
{
    private readonly IApplicationDbContext _db;
    private readonly ILlmChatService _llm;

    public ChatController(IApplicationDbContext db, ILlmChatService llm)
    {
        _db = db;
        _llm = llm;
    }

    private static readonly string[] DefaultSuggestions =
    {
        "Today's classes",
        "Events this week",
        "Fruit vendor today",
        "Pool timings",
    };

    [HttpPost("message")]
    public async Task<ActionResult<ApiResponse<ChatResponse>>> SendMessage(
        [FromBody] ChatRequest? request,
        CancellationToken ct)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.Message))
            return BadRequest(ApiResponse<ChatResponse>.Fail("Message is required."));

        var userId = GetUserId() ?? "anonymous";
        var session = await GetOrCreateSessionAsync(userId, request.SessionId, ct);
        var sessionIdStr = session.Id.ToString("N");

        // Load prior turns (oldest → newest) so the model can resolve "what about Friday?" etc.
        var priorHistory = await LoadHistoryAsync(session.Id, takeLastN: 12, ct);

        // Load any resident facts so the prompt can be personalized.
        var facts = await LoadFactsAsync(userId, ct);
        var systemPrompt = BuildSystemPromptWithFacts(facts);

        // ── LLM path (tool calling) ───────────────────────────────────────────
        if (_llm.IsEnabled)
        {
            var tools = BuildToolDefinitions();
            var llmReply = await _llm.ChatAsync(
                request.Message,
                tools,
                (name, args, c) => ExecuteToolForUserAsync(name, args, userId, c),
                priorHistory,
                systemPrompt,
                ct);

            if (llmReply is not null)
            {
                await PersistTurnAsync(session, request.Message, llmReply.ReplyText, ct);

                return Ok(ApiResponse<ChatResponse>.Ok(new ChatResponse(
                    Reply: llmReply.ReplyText,
                    Data: llmReply.Data,
                    Intent: llmReply.Intent,
                    SessionId: sessionIdStr,
                    Suggestions: llmReply.Suggestions ?? DefaultSuggestions)));
            }
        }

        // ── Rule-based fallback ───────────────────────────────────────────────
        var (intent, slots) = ParseIntentRuleBased(request.Message);
        var fallback = intent switch
        {
            "get_classes" => await HandleClasses(slots, ct),
            "get_events" => await HandleEvents(slots, ct),
            "get_vendors" => await HandleVendors(slots, ct),
            "greet" => Greeting(),
            _ => Fallback(),
        };

        await PersistTurnAsync(session, request.Message, fallback.Reply, ct);

        return Ok(ApiResponse<ChatResponse>.Ok(fallback with
        {
            SessionId = sessionIdStr,
            Intent = intent,
            Suggestions = fallback.Suggestions ?? DefaultSuggestions,
        }));
    }

    // ── Memory + identity helpers ───────────────────────────────────────────

    private string? GetUserId()
    {
        return User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub)
            ?? User.Identity?.Name;
    }

    private async Task<ChatSession> GetOrCreateSessionAsync(
        string userId, string? requestedId, CancellationToken ct)
    {
        if (!string.IsNullOrWhiteSpace(requestedId)
            && Guid.TryParse(requestedId, out var sid))
        {
            var existing = await _db.ChatSessions
                .FirstOrDefaultAsync(s => s.Id == sid && s.UserId == userId, ct);
            if (existing != null)
            {
                existing.LastAt = DateTime.UtcNow;
                return existing;
            }
        }

        var fresh = new ChatSession
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            CreatedAt = DateTime.UtcNow,
            LastAt = DateTime.UtcNow,
        };
        _db.ChatSessions.Add(fresh);
        await _db.SaveChangesAsync(ct);
        return fresh;
    }

    private async Task<IReadOnlyList<PriorTurn>> LoadHistoryAsync(
        Guid sessionId, int takeLastN, CancellationToken ct)
    {
        var rows = await _db.ChatMessages.AsNoTracking()
            .Where(m => m.SessionId == sessionId
                        && (m.Role == "user" || m.Role == "assistant"))
            .OrderByDescending(m => m.CreatedAt)
            .Take(takeLastN)
            .Select(m => new { m.Role, m.Content, m.CreatedAt })
            .ToListAsync(ct);

        return rows
            .OrderBy(r => r.CreatedAt)
            .Select(r => new PriorTurn(r.Role, r.Content))
            .ToList();
    }

    private async Task<Dictionary<string, string>> LoadFactsAsync(string userId, CancellationToken ct)
    {
        var rows = await _db.ResidentFacts.AsNoTracking()
            .Where(f => f.UserId == userId)
            .Select(f => new { f.FactKey, f.FactValue })
            .ToListAsync(ct);
        return rows.ToDictionary(r => r.FactKey, r => r.FactValue, StringComparer.OrdinalIgnoreCase);
    }

    private static string BuildSystemPromptWithFacts(IReadOnlyDictionary<string, string> facts)
    {
        var basePrompt =
            "You are the friendly concierge for Godrej Air residential society. "
            + "You answer in conversational English. "
            + "Use the provided tools to fetch live data about classes, events, society vendors, "
            + "and to read knowledge-base entries (rules, FAQ, emergency contacts). "
            + "Never make up class names, dates, prices, or phone numbers — only use values returned by tools. "
            + "If the user asks something none of the tools can answer, say it isn't supported yet.\n\n"
            + "MEMORY (extremely important — be proactive):\n"
            + " • Whenever the user mentions ANY personal fact (flat number, tower, dietary preference, "
              + "family details, kids' names/ages, languages, allergies, mobility needs, preferred "
              + "timings, favourite vendors, occupation), IMMEDIATELY call `remember_fact` BEFORE "
              + "replying with text. Do not just acknowledge in words — actually call the tool.\n"
            + " • Use stable snake_case keys: 'flat_number', 'tower', 'dietary', 'kids_ages', "
              + "'kids_names', 'languages', 'allergies', 'mobility', 'preferred_vendor', "
              + "'wake_time', 'occupation', etc.\n"
            + " • Examples that MUST trigger remember_fact:\n"
            + "   - \"I'm in flat A-204\" → remember_fact(key='flat_number', value='A-204')\n"
            + "   - \"I'm vegetarian\" → remember_fact(key='dietary', value='vegetarian')\n"
            + "   - \"my kids are 5 and 7\" → remember_fact(key='kids_ages', value='5, 7')\n"
            + "   - \"I prefer Sunny Greens\" → remember_fact(key='preferred_vendor', value='Sunny Greens')\n"
            + " • If the user says \"forget that\" / \"actually I moved\" → call `forget_fact` then "
              + "(if applicable) `remember_fact` with the new value.\n"
            + " • If asked \"what do you know about me?\" → call `list_facts`.\n"
            + " • Personalise replies based on the USER PROFILE block below; do NOT repeat the profile verbatim.\n\n"
            + "FORMAT:\n"
            + " • Keep replies SHORT (one sentence headline). The app renders rich cards below.\n"
            + " • For classes today: \"✅ Yes — Yoga is on today!\"\n"
            + " • For classes not today: \"ℹ️ Piano isn't on today. Next session: Wednesday.\"\n"
            + " • For unknown classes: a polite one-line apology + the available list.\n"
            + " • For knowledge-base answers, quote the relevant fact in 1–2 short sentences.";

        if (facts.Count == 0)
            return basePrompt + "\n\nUSER PROFILE: (none yet — feel free to ask about flat number, household, preferences when relevant).";

        var profileLines = facts
            .OrderBy(kv => kv.Key)
            .Select(kv => $" • {kv.Key.Replace('_', ' ')}: {kv.Value}");

        return basePrompt + "\n\nUSER PROFILE:\n" + string.Join("\n", profileLines);
    }

    private async Task PersistTurnAsync(
        ChatSession session, string userText, string assistantText, CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        _db.ChatMessages.Add(new ChatMessage
        {
            Id = Guid.NewGuid(),
            SessionId = session.Id,
            Role = "user",
            Content = userText,
            CreatedAt = now,
        });
        _db.ChatMessages.Add(new ChatMessage
        {
            Id = Guid.NewGuid(),
            SessionId = session.Id,
            Role = "assistant",
            Content = assistantText ?? string.Empty,
            // Persist a couple of ms later so ORDER BY created_at preserves order.
            CreatedAt = now.AddMilliseconds(1),
        });
        session.LastAt = now;
        await _db.SaveChangesAsync(ct);
    }

    // ── Tool definitions exposed to the LLM ─────────────────────────────────

    private static IReadOnlyList<ChatToolDef> BuildToolDefinitions() => new[]
    {
        new ChatToolDef(
            Name: "get_classes",
            Description: "Get society classes (yoga, karate, piano, bharatanatyam, kathak, " +
                         "freestyle dance, zumba, gym, kids drawing, etc.). " +
                         "If `class_name` is provided, look up that specific class regardless of " +
                         "day — useful for answering 'when is yoga?' or 'do we have boxing?'. " +
                         "Otherwise the tool returns classes scheduled on the given `date`. " +
                         "An empty `items` array means the class does not exist in the society.",
            ParametersSchema: new
            {
                type = "object",
                properties = new
                {
                    date = new
                    {
                        type = "string",
                        description = "Date in ISO yyyy-MM-dd, or 'today' / 'tomorrow'. Defaults to today. " +
                                      "Ignored when class_name is provided.",
                    },
                    category = new
                    {
                        type = "string",
                        description = "Optional broad category filter. Valid values: " +
                                      "'Wellness' (yoga, meditation), 'Music' (piano, guitar, violin, singing), " +
                                      "'Dance' (bharatanatyam, kathak, freestyle, ballet, salsa, zumba), " +
                                      "'Martial Arts' (karate, taekwondo, kickboxing, judo, boxing), " +
                                      "'Fitness' (gym, aerobics). Use category when the user asks broadly " +
                                      "(\"any martial arts?\", \"music lessons today?\").",
                    },
                    class_name = new
                    {
                        type = "string",
                        description = "Optional specific class name/keyword (e.g. 'yoga', 'karate', 'piano'). " +
                                      "Use this for SPECIFIC class queries. " +
                                      "When set, returns the class and its full weekly schedule " +
                                      "even if it doesn't run on `date`. " +
                                      "Prefer `category` over `class_name` for broad questions.",
                    },
                },
            }),
        new ChatToolDef(
            Name: "get_events",
            Description: "Get society events (programmes, festivals, board meetings, " +
                         "celebrations) happening within a date window. Default window is the " +
                         "next 7 days from today.",
            ParametersSchema: new
            {
                type = "object",
                properties = new
                {
                    from = new
                    {
                        type = "string",
                        description = "Start date in yyyy-MM-dd or 'today'/'tomorrow'. Defaults to today.",
                    },
                    to = new
                    {
                        type = "string",
                        description = "End date in yyyy-MM-dd. Defaults to 7 days after `from`.",
                    },
                    category = new
                    {
                        type = "string",
                        description = "Optional category filter.",
                    },
                },
            }),
        new ChatToolDef(
            Name: "get_vendors",
            Description: "Get society-approved vendors (fruit cart, milk man, vegetable vendor, " +
                         "dhobi/laundry, courier, etc.) available on a given date.",
            ParametersSchema: new
            {
                type = "object",
                properties = new
                {
                    date = new
                    {
                        type = "string",
                        description = "Date in yyyy-MM-dd or 'today'/'tomorrow'. Defaults to today.",
                    },
                    category = new
                    {
                        type = "string",
                        description = "Vendor category, e.g. Fruits, Dairy, Vegetables, Laundry.",
                    },
                },
            }),

        // ── Long-term per-user memory ──────────────────────────────────────
        new ChatToolDef(
            Name: "remember_fact",
            Description: "Store a long-term fact about the CURRENT user (resident). " +
                         "Use whenever the user shares personal context like flat number, " +
                         "dietary preference, family details, languages, mobility needs, " +
                         "preferred vendors, wake time, allergies, etc. The fact persists " +
                         "across sessions and is auto-injected into future system prompts.",
            ParametersSchema: new
            {
                type = "object",
                required = new[] { "key", "value" },
                properties = new
                {
                    key = new
                    {
                        type = "string",
                        description = "Stable snake_case key, e.g. 'flat_number', 'dietary', " +
                                      "'kids_ages', 'languages', 'preferred_vendor', 'allergies'.",
                    },
                    value = new
                    {
                        type = "string",
                        description = "The fact value as a plain string. Numbers, lists, etc. should be stringified.",
                    },
                },
            }),
        new ChatToolDef(
            Name: "forget_fact",
            Description: "Remove a previously stored fact about the current user.",
            ParametersSchema: new
            {
                type = "object",
                required = new[] { "key" },
                properties = new
                {
                    key = new { type = "string", description = "The fact_key to delete." },
                },
            }),
        new ChatToolDef(
            Name: "list_facts",
            Description: "List all stored facts about the current user. Use when the user " +
                         "asks 'what do you know about me?' or wants to review their profile.",
            ParametersSchema: new
            {
                type = "object",
                properties = new { },
            }),

        // ── Society knowledge base (RAG via Postgres FTS) ──────────────────
        new ChatToolDef(
            Name: "search_society_docs",
            Description: "Search the society knowledge base — rules (pet policy, parking, garbage), " +
                         "amenities (clubhouse, pool, gym), finance (bills, payments), security " +
                         "(visitor rules), emergency contacts, office hours, etc. " +
                         "Always call this tool for ANY question about rules, policies, fees, " +
                         "timings, contacts, procedures, or 'how do I…' questions. " +
                         "Returns the top matching documents with title + content snippet.",
            ParametersSchema: new
            {
                type = "object",
                required = new[] { "query" },
                properties = new
                {
                    query = new
                    {
                        type = "string",
                        description = "Natural-language search terms, e.g. 'how to book clubhouse', " +
                                      "'pet policy', 'emergency number', 'pool timings', " +
                                      "'late maintenance fee'.",
                    },
                    category = new
                    {
                        type = "string",
                        description = "Optional category filter: rules, amenities, finance, " +
                                      "emergency, security, admin.",
                    },
                },
            }),
    };

    private async Task<string> ExecuteToolForUserAsync(
        string name, JsonElement args, string userId, CancellationToken ct)
    {
        switch (name)
        {
            case "get_classes":
            {
                var classDate = ParseDateArg(args, "date") ?? DateOnly.FromDateTime(DateTime.UtcNow);
                var className = GetStringArg(args, "class_name");
                var rows = await QueryClasses(
                    classDate,
                    GetStringArg(args, "category"),
                    className,
                    ct);
                return JsonSerializer.Serialize(new
                {
                    items = SerializeClasses(rows),
                    queriedDate = classDate.ToString("yyyy-MM-dd"),
                    queriedClassName = className,
                    queriedDay = DayShortName((short)classDate.DayOfWeek),
                });
            }
            case "get_events":
            {
                var rows = await QueryEvents(
                    ParseDateArg(args, "from") ?? DateOnly.FromDateTime(DateTime.UtcNow),
                    ParseDateArg(args, "to"),
                    GetStringArg(args, "category"),
                    ct);
                return JsonSerializer.Serialize(new { items = rows });
            }
            case "get_vendors":
            {
                var rows = await QueryVendors(
                    ParseDateArg(args, "date") ?? DateOnly.FromDateTime(DateTime.UtcNow),
                    GetStringArg(args, "category"),
                    ct);
                return JsonSerializer.Serialize(new { items = rows });
            }

            // ── Per-user memory tools ────────────────────────────────────
            case "remember_fact":
            {
                var key = GetStringArg(args, "key");
                var value = GetStringArg(args, "value");
                if (string.IsNullOrWhiteSpace(key) || string.IsNullOrWhiteSpace(value))
                    return JsonSerializer.Serialize(new { error = "Both key and value are required." });

                var keyNorm = key.Trim().ToLowerInvariant().Replace(' ', '_');
                var existing = await _db.ResidentFacts
                    .FirstOrDefaultAsync(f => f.UserId == userId && f.FactKey == keyNorm, ct);
                if (existing is null)
                {
                    _db.ResidentFacts.Add(new ResidentFact
                    {
                        UserId = userId,
                        FactKey = keyNorm,
                        FactValue = value.Trim(),
                        Source = "self_declared",
                        UpdatedAt = DateTime.UtcNow,
                    });
                }
                else
                {
                    existing.FactValue = value.Trim();
                    existing.UpdatedAt = DateTime.UtcNow;
                }
                await _db.SaveChangesAsync(ct);
                return JsonSerializer.Serialize(new { ok = true, key = keyNorm, value = value.Trim() });
            }
            case "forget_fact":
            {
                var key = GetStringArg(args, "key");
                if (string.IsNullOrWhiteSpace(key))
                    return JsonSerializer.Serialize(new { error = "key is required." });
                var keyNorm = key.Trim().ToLowerInvariant().Replace(' ', '_');
                var existing = await _db.ResidentFacts
                    .FirstOrDefaultAsync(f => f.UserId == userId && f.FactKey == keyNorm, ct);
                if (existing != null)
                {
                    _db.ResidentFacts.Remove(existing);
                    await _db.SaveChangesAsync(ct);
                }
                return JsonSerializer.Serialize(new { ok = true, deleted = existing != null, key = keyNorm });
            }
            case "list_facts":
            {
                var facts = await LoadFactsAsync(userId, ct);
                return JsonSerializer.Serialize(new
                {
                    items = facts.Select(kv => new { key = kv.Key, value = kv.Value }).ToList(),
                });
            }

            // ── RAG: society knowledge base ─────────────────────────────
            case "search_society_docs":
            {
                var query = GetStringArg(args, "query");
                if (string.IsNullOrWhiteSpace(query))
                    return JsonSerializer.Serialize(new { items = Array.Empty<object>() });
                var category = GetStringArg(args, "category");
                var hits = await SearchSocietyDocsAsync(query, category, take: 4, ct);
                return JsonSerializer.Serialize(new { items = hits });
            }

            default:
                return JsonSerializer.Serialize(new { error = $"Unknown tool '{name}'." });
        }
    }

    private async Task<List<object>> SearchSocietyDocsAsync(
        string query, string? category, int take, CancellationToken ct)
    {
        // Postgres full-text search ranked by ts_rank, snippet truncated to 600 chars.
        // Two branches keep parameterisation safe (no string concatenation into SQL).
        List<SocietyDocSearchRow> rows;
        if (string.IsNullOrWhiteSpace(category))
        {
            rows = await _db.Database
                .SqlQuery<SocietyDocSearchRow>($@"
                    SELECT
                        id          AS ""Id"",
                        title       AS ""Title"",
                        category    AS ""Category"",
                        LEFT(content, 600) AS ""Content"",
                        ts_rank(search_vec, plainto_tsquery('english', {query})) AS ""Rank""
                    FROM public.society_docs
                    WHERE is_active = TRUE
                      AND search_vec @@ plainto_tsquery('english', {query})
                    ORDER BY ""Rank"" DESC
                    LIMIT {take}")
                .ToListAsync(ct);
        }
        else
        {
            rows = await _db.Database
                .SqlQuery<SocietyDocSearchRow>($@"
                    SELECT
                        id          AS ""Id"",
                        title       AS ""Title"",
                        category    AS ""Category"",
                        LEFT(content, 600) AS ""Content"",
                        ts_rank(search_vec, plainto_tsquery('english', {query})) AS ""Rank""
                    FROM public.society_docs
                    WHERE is_active = TRUE
                      AND lower(category) = lower({category})
                      AND search_vec @@ plainto_tsquery('english', {query})
                    ORDER BY ""Rank"" DESC
                    LIMIT {take}")
                .ToListAsync(ct);
        }

        return rows.Select(r => (object)new
        {
            title = r.Title,
            category = r.Category,
            content = r.Content,
            score = Math.Round((double)r.Rank, 4),
        }).ToList();
    }

    private sealed record SocietyDocSearchRow(
        Guid Id, string Title, string Category, string Content, float Rank);

    // ── DB queries (shared between LLM tools + rule-based handlers) ──────────

    private async Task<List<ClassInfo>> QueryClasses(
        DateOnly date,
        string? category,
        string? name,
        CancellationToken ct)
    {
        var dow = (short)date.DayOfWeek;
        List<Guid> classIds;

        if (!string.IsNullOrWhiteSpace(name))
        {
            // Name search — ignore day-of-week filter so we can tell the user
            // when the class DOES run (e.g. "Yoga is on Tue & Thu").
            var nameLower = name!.Trim().ToLower();
            var nameQ = _db.Classes.AsNoTracking()
                .Where(c => c.Active && c.DeletedAt == null
                            && (c.ClassName.ToLower().Contains(nameLower)
                                || c.Category.ToLower().Contains(nameLower)));
            if (!string.IsNullOrWhiteSpace(category))
                nameQ = nameQ.Where(c => c.Category.ToLower() == category!.Trim().ToLower());
            classIds = await nameQ.Select(c => c.Id).Distinct().ToListAsync(ct);
        }
        else
        {
            // 1) Find class IDs that have an active slot on the requested day
            var matchingIdsQuery =
                from s in _db.ClassSchedules.AsNoTracking()
                join c in _db.Classes.AsNoTracking() on s.ClassId equals c.Id
                where c.Active && c.DeletedAt == null
                      && s.Status == "active"
                      && s.DayOfWeek == dow
                      && (s.StartDate == null || s.StartDate <= date)
                      && (s.EndDate == null || s.EndDate >= date)
                select new { c.Id, c.Category };

            if (!string.IsNullOrWhiteSpace(category))
                matchingIdsQuery = matchingIdsQuery
                    .Where(x => x.Category.ToLower() == category!.Trim().ToLower());

            classIds = await matchingIdsQuery
                .Select(x => x.Id)
                .Distinct()
                .ToListAsync(ct);
        }

        if (classIds.Count == 0) return new List<ClassInfo>();

        // 2) Fetch class metadata
        var classes = await _db.Classes.AsNoTracking()
            .Where(c => classIds.Contains(c.Id))
            .Select(c => new
            {
                c.Id,
                c.ClassName,
                c.Category,
                c.Description,
                c.InstructorName,
                c.InstructorPhone,
                c.InstructorEmail,
                c.Venue,
                c.AgeGroup,
                c.Capacity,
                c.FeeMonthly,
            })
            .ToListAsync(ct);

        // 3) Fetch full recurring schedule across all weekdays (active only)
        var allSlots = await _db.ClassSchedules.AsNoTracking()
            .Where(s => classIds.Contains(s.ClassId) && s.Status == "active")
            .Select(s => new { s.ClassId, s.DayOfWeek, s.StartTime, s.EndTime })
            .ToListAsync(ct);

        var slotsByClass = allSlots
            .GroupBy(s => s.ClassId)
            .ToDictionary(g => g.Key, g => g.Select(x => new ScheduleSlot(x.DayOfWeek, x.StartTime, x.EndTime)).ToList());

        return classes
            .Select(c =>
            {
                var slots = slotsByClass.TryGetValue(c.Id, out var list) ? list : new List<ScheduleSlot>();
                var todayStart = slots.Where(s => s.DayOfWeek == dow)
                    .OrderBy(s => s.StartTime)
                    .Select(s => (TimeOnly?)s.StartTime)
                    .FirstOrDefault();
                return new ClassInfo(
                    ClassName: c.ClassName,
                    Category: c.Category,
                    Description: c.Description,
                    InstructorName: c.InstructorName,
                    InstructorPhone: c.InstructorPhone,
                    InstructorEmail: c.InstructorEmail,
                    Venue: c.Venue,
                    AgeGroup: c.AgeGroup,
                    Capacity: c.Capacity,
                    FeeMonthly: c.FeeMonthly,
                    TodayStartTime: todayStart,
                    Slots: slots);
            })
            .OrderBy(x => x.TodayStartTime ?? TimeOnly.MaxValue)
            .ThenBy(x => x.ClassName)
            .ToList();
    }

    private async Task<List<EventRow>> QueryEvents(DateOnly from, DateOnly? to, string? category, CancellationToken ct)
    {
        var toDate = to ?? from.AddDays(7);
        if (toDate < from) toDate = from.AddDays(7);

        var fromUtc = from.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
        var toUtc = toDate.ToDateTime(TimeOnly.MaxValue, DateTimeKind.Utc);

        var q = _db.Events.AsNoTracking()
            .Where(e => e.Active && e.DeletedAt == null)
            .Where(e => e.StartDatetime < toUtc && e.EndDatetime >= fromUtc);

        if (!string.IsNullOrWhiteSpace(category))
            q = q.Where(e => e.Category.ToLower() == category!.Trim().ToLower());

        var rows = await q.OrderBy(e => e.StartDatetime).Take(20)
            .Select(e => new
            {
                e.Title,
                e.Category,
                e.Venue,
                e.StartDatetime,
                e.EndDatetime,
                e.OrganizerName,
                e.EntryFee,
            })
            .ToListAsync(ct);

        return rows.Select(r => new EventRow(
            r.Title, r.Category, r.Venue,
            r.StartDatetime, r.EndDatetime, r.OrganizerName, r.EntryFee)).ToList();
    }

    private async Task<List<VendorRow>> QueryVendors(DateOnly date, string? category, CancellationToken ct)
    {
        var dayName = date.DayOfWeek.ToString().ToLowerInvariant();

        var q = _db.SocietyVendors.AsNoTracking()
            .Where(v => v.Active && v.DeletedAt == null)
            .Where(v => v.StartDate == null || v.StartDate <= date)
            .Where(v => v.EndDate == null || v.EndDate >= date);

        if (!string.IsNullOrWhiteSpace(category))
            q = q.Where(v => v.Category.ToLower() == category!.Trim().ToLower());

        var rows = await q.ToListAsync(ct);

        bool MatchesDay(string[]? days)
        {
            if (days is null || days.Length == 0) return true;
            return days.Any(d =>
                d.Equals(dayName, StringComparison.OrdinalIgnoreCase) ||
                d.StartsWith(dayName[..3], StringComparison.OrdinalIgnoreCase));
        }

        return rows
            .Where(v => MatchesDay(v.AvailableDays))
            .OrderBy(v => v.AvailableFrom ?? TimeOnly.MinValue)
            .Select(v => new VendorRow(
                v.VendorName, v.Category, v.StallLocation ?? v.StallName,
                v.PhoneNumber, v.AvailableFrom, v.AvailableTo, v.Verified, v.Rating))
            .ToList();
    }

    // ── Rule-based parser (fallback) ────────────────────────────────────────

    private static readonly string[] KnownClassKeywords =
    {
        "yoga", "karate", "piano", "bharatanatyam", "kathak",
        "freestyle", "zumba", "gym", "fitness", "drawing",
        "boxing", "skating", "swimming", "tennis", "badminton",
        "guitar", "violin", "singing", "music", "art", "painting",
        "carnatic", "hindustani", "western", "ballet", "salsa",
        "taekwondo", "judo", "kickboxing", "yoga", "meditation",
    };

    private static string? ExtractClassNameKeyword(string text)
    {
        foreach (var k in KnownClassKeywords)
        {
            if (Regex.IsMatch(text, $@"\b{k}\b", RegexOptions.IgnoreCase))
                return k;
        }
        return null;
    }

    private static (string intent, Slots slots) ParseIntentRuleBased(string msg)
    {
        var text = msg.ToLowerInvariant().Trim();
        var slots = new Slots
        {
            Date = ExtractDate(text),
            Category = ExtractCategory(text),
            ClassName = ExtractClassNameKeyword(text),
        };

        if (Regex.IsMatch(text, @"^(hi|hello|hey|namaste|namaskara)\b"))
            return ("greet", slots);
        if (slots.ClassName != null
            || Regex.IsMatch(text, @"\b(class(es)?|trainer|workout|aerobic|dance)\b"))
            return ("get_classes", slots);
        if (Regex.IsMatch(text, @"\b(event(s)?|programme(s)?|program(s)?|function(s)?|celebration(s)?|festival(s)?|meeting(s)?|gathering(s)?|party|parties)\b"))
            return ("get_events", slots);
        if (Regex.IsMatch(text, @"\b(vendor(s)?|fruit(s)?|milk|veg(etable(s)?)?|grocery|groceries|dhobi|laundry|cart(s)?|delivery|deliveries|coming today)\b"))
            return ("get_vendors", slots);
        if (Regex.IsMatch(text, @"\b(pool|swim)\b"))
            return ("get_vendors", slots with { Category = "Amenity" });
        return ("fallback", slots);
    }

    private static DateOnly ExtractDate(string text)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        if (Regex.IsMatch(text, @"\btomorrow\b")) return today.AddDays(1);
        if (Regex.IsMatch(text, @"\byesterday\b")) return today.AddDays(-1);
        if (Regex.IsMatch(text, @"\bthis week\b|\bthis weekend\b|\bsaturday\b|\bsunday\b"))
            return NextDayOfWeekWithin(today, text);
        if (Regex.IsMatch(text, @"\btoday\b|\bnow\b|\btonight\b")) return today;
        return today;
    }

    private static DateOnly NextDayOfWeekWithin(DateOnly from, string text)
    {
        var map = new Dictionary<string, DayOfWeek>
        {
            ["monday"] = DayOfWeek.Monday,
            ["tuesday"] = DayOfWeek.Tuesday,
            ["wednesday"] = DayOfWeek.Wednesday,
            ["thursday"] = DayOfWeek.Thursday,
            ["friday"] = DayOfWeek.Friday,
            ["saturday"] = DayOfWeek.Saturday,
            ["sunday"] = DayOfWeek.Sunday,
        };
        foreach (var kv in map)
        {
            if (Regex.IsMatch(text, $@"\b{kv.Key}\b"))
            {
                var diff = ((int)kv.Value - (int)from.DayOfWeek + 7) % 7;
                if (diff == 0) diff = 7;
                return from.AddDays(diff);
            }
        }
        return from;
    }

    private static string? ExtractCategory(string text)
    {
        if (Regex.IsMatch(text, @"\b(fruit|apple|banana|orange)\b")) return "Fruits";
        if (Regex.IsMatch(text, @"\b(milk|dairy|curd)\b")) return "Dairy";
        if (Regex.IsMatch(text, @"\b(veg|vegetable|sabzi)\b")) return "Vegetables";
        if (Regex.IsMatch(text, @"\b(yoga)\b")) return "Yoga";
        if (Regex.IsMatch(text, @"\b(zumba)\b")) return "Zumba";
        if (Regex.IsMatch(text, @"\b(kids|child|children)\b")) return "Kids";
        return null;
    }

    private async Task<ChatResponse> HandleClasses(Slots slots, CancellationToken ct)
    {
        var todayDow = (short)slots.Date.DayOfWeek;

        // Name-based lookup ("yoga", "boxing", …) — answer about that specific class
        // even when it isn't running on the requested day. We deliberately drop the
        // sloppy `category` slot here because "yoga" maps to BOTH category and class
        // name in the rule extractor (false negatives when category != class name).
        if (!string.IsNullOrWhiteSpace(slots.ClassName))
        {
            var named = await QueryClasses(slots.Date, null, slots.ClassName, ct);
            if (named.Count == 0)
            {
                var available = await ListAvailableClassNames(ct);
                var msg =
                    $"Sorry — there's no '{Capitalize(slots.ClassName)}' class running in the society right now.";
                if (available.Count > 0)
                    msg += $"\nWe currently offer: {string.Join(", ", available)}.";
                return new ChatResponse(msg, Data: new { items = Array.Empty<object>() });
            }

            // Keep the textual reply to a single headline — the rich card below
            // shows trainer / schedule / fee / venue / age group already.
            string headline;
            if (named.Count == 1)
            {
                var r = named[0];
                var runsToday = r.Slots.Any(s => s.DayOfWeek == todayDow);
                if (runsToday)
                {
                    headline = $"✅ Yes — {r.ClassName} is on today!";
                }
                else
                {
                    var nextDate = NextOccurrence(slots.Date, r.Slots);
                    var nextLabel = nextDate.HasValue ? FormatDate(nextDate.Value) : "soon";
                    headline = $"ℹ️ {r.ClassName} isn't on today. Next session: {nextLabel}.";
                }
            }
            else
            {
                var anyToday = named.Any(n => n.Slots.Any(s => s.DayOfWeek == todayDow));
                headline = anyToday
                    ? $"Found {named.Count} matching classes — some are on today."
                    : $"Found {named.Count} matching classes (none on today).";
            }
            return new ChatResponse(headline, Data: new { items = SerializeClasses(named) });
        }

        // Day-based lookup (no specific class) — list everything for that day.
        var rows = await QueryClasses(slots.Date, slots.Category, null, ct);
        if (rows.Count == 0)
        {
            return new ChatResponse(
                $"No classes scheduled for {FormatDate(slots.Date)}{(slots.Category != null ? $" in {slots.Category}" : "")}.",
                Data: new { items = Array.Empty<object>() });
        }

        var header = slots.Date == DateOnly.FromDateTime(DateTime.UtcNow) ? "Today" : FormatDate(slots.Date);
        var dayHeadline = $"{header} · {rows.Count} class{(rows.Count == 1 ? "" : "es")}";
        return new ChatResponse(dayHeadline, Data: new { items = SerializeClasses(rows) });
    }

    private static DateOnly? NextOccurrence(DateOnly from, IReadOnlyList<ScheduleSlot> slots)
    {
        if (slots.Count == 0) return null;
        for (var i = 1; i <= 7; i++)
        {
            var candidate = from.AddDays(i);
            var dow = (short)candidate.DayOfWeek;
            if (slots.Any(s => s.DayOfWeek == dow)) return candidate;
        }
        return null;
    }

    private async Task<List<string>> ListAvailableClassNames(CancellationToken ct) =>
        await _db.Classes.AsNoTracking()
            .Where(c => c.Active && c.DeletedAt == null)
            .OrderBy(c => c.ClassName)
            .Select(c => c.ClassName)
            .Distinct()
            .Take(20)
            .ToListAsync(ct);

    private static string Capitalize(string s) =>
        string.IsNullOrEmpty(s) ? s : char.ToUpper(s[0]) + s.Substring(1).ToLower();

    private static IEnumerable<object> SerializeClasses(IEnumerable<ClassInfo> rows) =>
        rows.Select(r => new
        {
            name = r.ClassName,
            category = r.Category,
            description = r.Description,
            instructor = r.InstructorName,
            instructorPhone = r.InstructorPhone,
            instructorEmail = r.InstructorEmail,
            venue = r.Venue,
            ageGroup = r.AgeGroup,
            capacity = r.Capacity,
            feeMonthly = r.FeeMonthly,
            todayStartTime = r.TodayStartTime?.ToString("HH:mm"),
            schedule = FormatSchedule(r.Slots),
            slots = r.Slots.Select(s => new
            {
                day = DayShortName(s.DayOfWeek),
                dayOfWeek = (int)s.DayOfWeek,
                startTime = s.StartTime.ToString("HH:mm"),
                endTime = s.EndTime.ToString("HH:mm"),
            }),
        });

    /// <summary>"Mon & Wed · 6:00–7:00 PM" or, with multiple slots, "Mon · 6 AM | Sat · 8 AM".</summary>
    private static string FormatSchedule(IReadOnlyList<ScheduleSlot> slots)
    {
        if (slots is null || slots.Count == 0) return string.Empty;

        var grouped = slots
            .GroupBy(s => (s.StartTime, s.EndTime))
            .OrderBy(g => g.Key.StartTime)
            .ThenBy(g => g.Key.EndTime)
            .Select(g => new
            {
                Time = $"{FormatTime(g.Key.StartTime)}–{FormatTime(g.Key.EndTime)}",
                Days = g.Select(s => s.DayOfWeek).Distinct().OrderBy(d => d).ToList(),
            })
            .ToList();

        var parts = grouped.Select(g =>
        {
            var names = g.Days.Select(DayShortName).ToList();
            string daysText = names.Count switch
            {
                1 => names[0],
                2 => $"{names[0]} & {names[1]}",
                _ => string.Join(", ", names.Take(names.Count - 1)) + " & " + names[^1],
            };
            return $"{daysText} · {g.Time}";
        });

        return string.Join(" | ", parts);
    }

    private static string DayShortName(short dow)
    {
        return dow switch
        {
            0 => "Sun",
            1 => "Mon",
            2 => "Tue",
            3 => "Wed",
            4 => "Thu",
            5 => "Fri",
            6 => "Sat",
            _ => "?",
        };
    }

    private async Task<ChatResponse> HandleEvents(Slots slots, CancellationToken ct)
    {
        var rows = await QueryEvents(slots.Date, null, slots.Category, ct);
        if (rows.Count == 0)
            return new ChatResponse("No events in the next 7 days.", Data: new { items = Array.Empty<object>() });

        // Headline only — the cards below carry title / date / venue.
        return new ChatResponse(
            $"Upcoming events · {rows.Count}",
            Data: new { items = rows });
    }

    private async Task<ChatResponse> HandleVendors(Slots slots, CancellationToken ct)
    {
        var rows = await QueryVendors(slots.Date, slots.Category, ct);
        if (rows.Count == 0)
            return new ChatResponse(
                $"No {slots.Category ?? "vendors"} listed for {FormatDate(slots.Date)}.",
                Data: new { items = Array.Empty<object>() });

        var header = slots.Date == DateOnly.FromDateTime(DateTime.UtcNow) ? "Today" : FormatDate(slots.Date);
        // Headline only — the cards below carry name / phone / location / hours.
        return new ChatResponse(
            $"{header} · {rows.Count} vendor{(rows.Count == 1 ? "" : "s")}",
            Data: new
            {
                items = rows.Select(v => new
                {
                    name = v.VendorName,
                    category = v.Category,
                    location = v.Location,
                    phone = v.Phone,
                    availableFrom = v.AvailableFrom?.ToString("HH:mm"),
                    availableTo = v.AvailableTo?.ToString("HH:mm"),
                    verified = v.Verified,
                    rating = v.Rating,
                }),
            });
    }

    private static ChatResponse Greeting() => new(
        "Hi! I can help with society classes, events, and vendors. Try \"What classes are happening today?\".",
        Data: new { items = Array.Empty<object>() });

    private static ChatResponse Fallback() => new(
        "I can help with classes, events, and society vendors. Try one of these:",
        Data: new { items = Array.Empty<object>() });

    // ── helpers ─────────────────────────────────────────────────────────────

    private static string? GetStringArg(JsonElement el, string name)
    {
        if (el.ValueKind != JsonValueKind.Object) return null;
        if (!el.TryGetProperty(name, out var v)) return null;
        if (v.ValueKind != JsonValueKind.String) return null;
        var s = v.GetString();
        return string.IsNullOrWhiteSpace(s) ? null : s;
    }

    private static DateOnly? ParseDateArg(JsonElement el, string name)
    {
        var s = GetStringArg(el, name);
        if (s is null) return null;
        var lower = s.Trim().ToLowerInvariant();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        return lower switch
        {
            "today" => today,
            "tomorrow" => today.AddDays(1),
            "yesterday" => today.AddDays(-1),
            _ when DateOnly.TryParse(lower, out var iso) => iso,
            _ when DateOnly.TryParseExact(lower, "dd/MM/yyyy", null,
                DateTimeStyles.None, out var dmy) => dmy,
            _ => null,
        };
    }

    private static string FormatTime(TimeOnly t) =>
        t.ToString("h:mm tt", CultureInfo.InvariantCulture);

    private static string FormatDate(DateOnly d) =>
        d.ToString("dddd, dd MMM", CultureInfo.InvariantCulture);

    // ── contract types ───────────────────────────────────────────────────────

    public sealed record ChatRequest(string Message, string? SessionId);

    public sealed record ChatResponse(
        string Reply,
        object? Data = null,
        string? Intent = null,
        string? SessionId = null,
        IReadOnlyList<string>? Suggestions = null);

    private sealed record Slots
    {
        public DateOnly Date { get; init; } = DateOnly.FromDateTime(DateTime.UtcNow);
        public string? Category { get; init; }
        public string? ClassName { get; init; }
    }

    private sealed record ClassInfo(
        string ClassName,
        string Category,
        string? Description,
        string InstructorName,
        string? InstructorPhone,
        string? InstructorEmail,
        string? Venue,
        string? AgeGroup,
        int? Capacity,
        decimal FeeMonthly,
        TimeOnly? TodayStartTime,
        IReadOnlyList<ScheduleSlot> Slots);

    private sealed record ScheduleSlot(short DayOfWeek, TimeOnly StartTime, TimeOnly EndTime);

    private sealed record EventRow(
        string Title, string Category, string? Venue,
        DateTime StartDatetime, DateTime EndDatetime, string? OrganizerName, decimal EntryFee);

    private sealed record VendorRow(
        string VendorName, string Category, string? Location,
        string? Phone, TimeOnly? AvailableFrom, TimeOnly? AvailableTo,
        bool Verified, decimal? Rating);
}
