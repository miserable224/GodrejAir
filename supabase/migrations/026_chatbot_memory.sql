-- ─────────────────────────────────────────────────────────────────────────────
-- 026 · Chatbot memory: conversation history, resident facts, society knowledge
-- ─────────────────────────────────────────────────────────────────────────────
-- 1. chat_sessions / chat_messages  — multi-turn conversation memory
-- 2. resident_facts                  — per-user long-term memory
-- 3. society_docs                    — RAG knowledge base (FAQ, bylaws, contacts)
-- All tables are idempotent; safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. CHAT SESSIONS & MESSAGES ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.chat_sessions (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      TEXT         NOT NULL,
    title        TEXT,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    last_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_chat_sessions_user_last
    ON public.chat_sessions (user_id, last_at DESC);

CREATE TABLE IF NOT EXISTS public.chat_messages (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id   UUID         NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
    role         TEXT         NOT NULL,
    content      TEXT         NOT NULL DEFAULT '',
    tool_name    TEXT,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ck_chat_messages_role
        CHECK (role IN ('user', 'assistant', 'tool', 'system'))
);

CREATE INDEX IF NOT EXISTS ix_chat_messages_session_time
    ON public.chat_messages (session_id, created_at);

-- ── 2. RESIDENT FACTS ───────────────────────────────────────────────────────
-- One row per (user, key). The LLM extracts these via tool calls.
-- Examples of fact_keys: flat_number, dietary, kids_ages, languages,
--                       mobility, preferred_vendor, wake_time, etc.

CREATE TABLE IF NOT EXISTS public.resident_facts (
    user_id      TEXT         NOT NULL,
    fact_key     TEXT         NOT NULL,
    fact_value   TEXT         NOT NULL,
    source       TEXT         NOT NULL DEFAULT 'self_declared',
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, fact_key)
);

CREATE INDEX IF NOT EXISTS ix_resident_facts_user
    ON public.resident_facts (user_id);

-- ── 3. SOCIETY KNOWLEDGE BASE (RAG via Postgres FTS) ────────────────────────
-- Postgres' built-in full-text search; no pgvector dependency.
-- Supabase rejects to_tsvector inside a GENERATED column (immutability check),
-- so search_vec is a plain column maintained by a BEFORE INSERT/UPDATE trigger.

CREATE TABLE IF NOT EXISTS public.society_docs (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    title        TEXT         NOT NULL,
    category     TEXT         NOT NULL DEFAULT 'general',
    content      TEXT         NOT NULL,
    tags         TEXT[]       DEFAULT '{}',
    is_active    BOOLEAN      NOT NULL DEFAULT true,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    search_vec   TSVECTOR
);

CREATE OR REPLACE FUNCTION public.society_docs_refresh_search_vec()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vec :=
        setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(NEW.content, '')), 'B') ||
        setweight(to_tsvector('english',
            coalesce(array_to_string(NEW.tags, ' '), '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_society_docs_search_vec ON public.society_docs;
CREATE TRIGGER trg_society_docs_search_vec
    BEFORE INSERT OR UPDATE OF title, content, tags ON public.society_docs
    FOR EACH ROW EXECUTE FUNCTION public.society_docs_refresh_search_vec();

CREATE INDEX IF NOT EXISTS ix_society_docs_fts
    ON public.society_docs USING GIN(search_vec);
CREATE INDEX IF NOT EXISTS ix_society_docs_category
    ON public.society_docs (category) WHERE is_active = true;

-- ── 4. STARTER KNOWLEDGE BASE CONTENT ───────────────────────────────────────
-- A handful of representative documents so the bot has something to retrieve
-- on day one. Safe to re-run: only inserts when title doesn't already exist.

DO $$
DECLARE
    doc_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO doc_count FROM public.society_docs;
    IF doc_count = 0 THEN

        INSERT INTO public.society_docs (title, category, content, tags) VALUES
        (
            'Clubhouse Booking Rules',
            'amenities',
            'Residents can book the clubhouse halls (Hall A — up to 80 guests, Hall B — up to 30 guests) ' ||
            'through the resident portal or by calling the manager at 080-12345678. ' ||
            'Bookings open 30 days in advance and close 24 hours before the event. ' ||
            'Booking fee: ₹2,500 for Hall A, ₹1,200 for Hall B. A refundable security deposit of ₹5,000 ' ||
            'is collected at the time of booking. Cancellations more than 48 hours before the event ' ||
            'receive a full refund minus a ₹250 service fee. Decorations using nails, tapes, or paint ' ||
            'on the walls are not permitted. Music must stop by 10:00 PM as per BBMP noise norms.',
            ARRAY['clubhouse', 'booking', 'hall', 'event', 'party']
        ),
        (
            'Pet Policy',
            'rules',
            'Godrej Air welcomes responsible pet owners. All residents owning pets must register them ' ||
            'with the management office (Block-A ground floor) within 30 days of moving in. ' ||
            'Pets must be on a leash in all common areas including lifts, corridors, and walkways. ' ||
            'The designated pet relief area is the strip behind D-Block adjacent to the boundary wall. ' ||
            'Owners are expected to clean up after their pets — disposable bags are provided at the ' ||
            'pet station. Loud barking between 10 PM and 7 AM may attract a warning, followed by a ' ||
            '₹500 fine per repeat instance. Pets are NOT permitted inside the gym, swimming pool deck, ' ||
            'or indoor amenities. The terrace garden is dog-friendly only on weekends between 7–9 AM.',
            ARRAY['pet', 'dog', 'cat', 'animal', 'rules', 'policy']
        ),
        (
            'Swimming Pool Timings & Rules',
            'amenities',
            'Swimming pool hours: Tue–Sun 6:00 AM – 10:00 AM and 4:00 PM – 8:00 PM. ' ||
            'Closed on Mondays for chlorination & maintenance. ' ||
            'Children under 12 must be accompanied by an adult. Lifeguard is on duty during ' ||
            'all open hours. Swim caps mandatory. No food, drinks, or glass containers on the deck. ' ||
            'A lifeguard whistle indicates immediate exit. Pool parties may be booked through the ' ||
            'clubhouse manager for a fee of ₹3,000 (capacity 25).',
            ARRAY['pool', 'swim', 'swimming', 'timing', 'amenities']
        ),
        (
            'Gym Access',
            'amenities',
            'The fitness centre is open 24/7 to registered residents using their RFID card. ' ||
            'A one-time induction with the trainer (Mr. Suresh — 9876500011) is mandatory before ' ||
            'first use. Personal training sessions are available 6 AM – 9 AM and 5 PM – 9 PM at ' ||
            '₹500/session. Wipe down equipment after use. No outside footwear inside the gym floor.',
            ARRAY['gym', 'fitness', 'workout', 'training']
        ),
        (
            'Emergency Contact Numbers',
            'emergency',
            'Security desk (24×7): 080-1111-0000. Fire emergency: 101 or society fire line 080-1111-0001. ' ||
            'Medical emergency: society medical line 080-1111-0002 (panel hospital pickup within 8 minutes). ' ||
            'Ambulance: 108. Police (Whitefield station): 080-2845-0050. Electricity outage (BESCOM): 1912. ' ||
            'Water issue (society plumbing): 080-1111-0003. ' ||
            'Maintenance manager (Mr. Ramesh): 9876500099. ' ||
            'Society secretary (Mr. Vinod): 9876500088.',
            ARRAY['emergency', 'security', 'fire', 'medical', 'ambulance', 'police', 'contact', 'phone']
        ),
        (
            'Maintenance Bill & Payment',
            'finance',
            'Monthly maintenance bills are generated on the 1st of every month and are due by the 10th. ' ||
            'Payment options: 1) Online via the resident portal (UPI, NetBanking, Cards). ' ||
            '2) Bank transfer to Society Account — A/C: 12345678901, IFSC: HDFC0001234. ' ||
            'Late payments after the 10th attract a 2% per-month penalty. ' ||
            'For billing questions contact accounts@godrejair.in or call 080-1111-0010. ' ||
            'Annual maintenance: ₹3.50 per sq.ft. Optional services (gym extra, pool extra, parking) ' ||
            'are billed separately.',
            ARRAY['maintenance', 'bill', 'payment', 'fee', 'invoice', 'dues', 'finance']
        ),
        (
            'Visitor & Delivery Rules',
            'security',
            'All visitors must register at the security gate with photo ID. Residents receive an ' ||
            'OTP-based approval request via the MyGate app. Food & parcel deliveries: the resident ' ||
            'is notified and may choose "Send up" or "Leave at reception". ' ||
            'Maids and drivers require a society-issued ID card (valid 1 year, renewable). ' ||
            'Construction or repair workers must be pre-approved with the maintenance office and ' ||
            'are allowed inside only Mon–Sat 9 AM – 6 PM.',
            ARRAY['visitor', 'delivery', 'security', 'gate', 'mygate', 'maid', 'driver']
        ),
        (
            'Parking Rules',
            'rules',
            'Each apartment is allotted one covered parking slot. Additional vehicles must be ' ||
            'registered with the management and parked in the open visitor lot (subject to availability). ' ||
            'EV charging points are available at slots P1-15 to P1-22 (Tower A basement) on a ' ||
            'first-come basis. Charging fee is added to the monthly maintenance bill at ₹14/kWh. ' ||
            'Two-wheelers park on basement level 2. Towing of unauthorised vehicles is at owner risk.',
            ARRAY['parking', 'car', 'vehicle', 'ev', 'charging', 'two-wheeler']
        ),
        (
            'Garbage Segregation',
            'rules',
            'Wet waste (green bin), dry waste (blue bin), and reject waste (red bin) must be ' ||
            'segregated at source. Collection: wet daily 7–9 AM, dry on Mon/Wed/Fri, reject on Sat. ' ||
            'E-waste, batteries, and bulbs are collected on the 1st Saturday of every month at the ' ||
            'central collection point near the clubhouse. Failure to segregate may attract a ₹100 fine.',
            ARRAY['garbage', 'waste', 'segregation', 'recycling']
        ),
        (
            'Society Office Hours',
            'admin',
            'Management office (Block-A ground floor): Mon–Sat 9:30 AM – 6:30 PM, closed Sunday. ' ||
            'Society secretary available Mon, Wed, Fri 5 PM – 7 PM. ' ||
            'Walk-ins welcome; for complex matters please book a slot via the resident portal.',
            ARRAY['office', 'admin', 'manager', 'secretary', 'hours']
        );

        RAISE NOTICE 'Seeded % starter society documents', 10;
    ELSE
        RAISE NOTICE 'society_docs already populated (% rows), skipping seed', doc_count;
    END IF;
END $$;
