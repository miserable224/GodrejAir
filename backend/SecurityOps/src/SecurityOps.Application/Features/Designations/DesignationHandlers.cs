using AutoMapper;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SecurityOps.Application.Common.Interfaces;
using SecurityOps.Application.Common.Models;
using SecurityOps.Application.Contracts;
using SecurityOps.Domain;
using SecurityOps.Domain.Entities;

namespace SecurityOps.Application.Features.Designations;

public sealed record GetDesignationListQuery(string Module, bool? Active, int Page, int PageSize)
    : IRequest<PagedResult<DesignationResponse>>;

public sealed class GetDesignationListQueryHandler
    : IRequestHandler<GetDesignationListQuery, PagedResult<DesignationResponse>>
{
    private readonly IApplicationDbContext _db;
    private readonly IMapper _mapper;

    public GetDesignationListQueryHandler(IApplicationDbContext db, IMapper mapper)
    {
        _db = db;
        _mapper = mapper;
    }

    public async Task<PagedResult<DesignationResponse>> Handle(
        GetDesignationListQuery request,
        CancellationToken cancellationToken)
    {
        var module = DesignationModuleRules.Normalize(request.Module);
        if (request.Active is not false)
            await DesignationSeeder.EnsureDefaultsAsync(_db, module, cancellationToken);

        var q = _db.DutyDesignations.AsNoTracking().Where(x => x.Module == module);
        if (request.Active is { } active)
            q = q.Where(x => x.IsActive == active);

        var total = await q.CountAsync(cancellationToken);
        var items = await q
            .OrderBy(x => x.SortOrder)
            .ThenBy(x => x.Title)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        return new PagedResult<DesignationResponse>
        {
            Items = _mapper.Map<IReadOnlyList<DesignationResponse>>(items),
            TotalCount = total,
            Page = request.Page,
            PageSize = request.PageSize,
        };
    }
}

public sealed record EnsureDefaultDesignationsCommand(string Module) : IRequest<int>;

public sealed class EnsureDefaultDesignationsCommandHandler : IRequestHandler<EnsureDefaultDesignationsCommand, int>
{
    private readonly IApplicationDbContext _db;

    public EnsureDefaultDesignationsCommandHandler(IApplicationDbContext db) => _db = db;

    public Task<int> Handle(EnsureDefaultDesignationsCommand request, CancellationToken cancellationToken) =>
        DesignationSeeder.EnsureDefaultsAsync(_db, request.Module, cancellationToken);
}

public sealed record CreateDesignationCommand(CreateDesignationRequest Body) : IRequest<DesignationResponse>;

public sealed class CreateDesignationCommandHandler : IRequestHandler<CreateDesignationCommand, DesignationResponse>
{
    private readonly IApplicationDbContext _db;
    private readonly IMapper _mapper;
    private readonly ILogger<CreateDesignationCommandHandler> _logger;

    public CreateDesignationCommandHandler(
        IApplicationDbContext db,
        IMapper mapper,
        ILogger<CreateDesignationCommandHandler> logger)
    {
        _db = db;
        _mapper = mapper;
        _logger = logger;
    }

    public async Task<DesignationResponse> Handle(
        CreateDesignationCommand request,
        CancellationToken cancellationToken)
    {
        var module = DesignationModuleRules.Normalize(request.Body.Module);
        var title = request.Body.Title.Trim();
        await DesignationDuplicateRules.EnsureTitleAvailableAsync(
            _db, module, title, excludeId: null, cancellationToken);

        var maxSort = await _db.DutyDesignations
            .Where(x => x.Module == module)
            .Select(x => (int?)x.SortOrder)
            .MaxAsync(cancellationToken) ?? 0;

        var e = new DutyDesignation
        {
            Module = module,
            Title = title,
            SortOrder = maxSort + 1,
            IsActive = true,
        };
        _db.DutyDesignations.Add(e);
        await _db.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Created duty designation {Id} {Title} ({Module})", e.Id, e.Title, e.Module);
        return _mapper.Map<DesignationResponse>(e);
    }
}

public sealed record UpdateDesignationCommand(Guid Id, UpdateDesignationRequest Body)
    : IRequest<DesignationResponse?>;

public sealed class UpdateDesignationCommandHandler : IRequestHandler<UpdateDesignationCommand, DesignationResponse?>
{
    private readonly IApplicationDbContext _db;
    private readonly IMapper _mapper;
    private readonly ILogger<UpdateDesignationCommandHandler> _logger;

    public UpdateDesignationCommandHandler(
        IApplicationDbContext db,
        IMapper mapper,
        ILogger<UpdateDesignationCommandHandler> logger)
    {
        _db = db;
        _mapper = mapper;
        _logger = logger;
    }

    public async Task<DesignationResponse?> Handle(
        UpdateDesignationCommand request,
        CancellationToken cancellationToken)
    {
        var e = await _db.DutyDesignations.FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);
        if (e is null) return null;

        var title = request.Body.Title.Trim();
        var module = DesignationModuleRules.Normalize(request.Body.Module);

        if (DesignationDuplicateRules.NormalizeTitle(e.Title)
            == DesignationDuplicateRules.NormalizeTitle(title))
        {
            e.IsActive = request.Body.IsActive;
            e.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(cancellationToken);
            return _mapper.Map<DesignationResponse>(e);
        }

        await DesignationDuplicateRules.EnsureTitleAvailableAsync(
            _db, module, title, excludeId: e.Id, cancellationToken);

        e.Module = module;
        e.Title = title;
        e.IsActive = request.Body.IsActive;
        e.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Updated duty designation {Id}", e.Id);
        return _mapper.Map<DesignationResponse>(e);
    }
}

public sealed record DeleteDesignationCommand(Guid Id) : IRequest<bool>;

public sealed class DeleteDesignationCommandHandler : IRequestHandler<DeleteDesignationCommand, bool>
{
    private readonly IApplicationDbContext _db;
    private readonly ILogger<DeleteDesignationCommandHandler> _logger;

    public DeleteDesignationCommandHandler(IApplicationDbContext db, ILogger<DeleteDesignationCommandHandler> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<bool> Handle(DeleteDesignationCommand request, CancellationToken cancellationToken)
    {
        var e = await _db.DutyDesignations.FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);
        if (e is null) return false;
        e.IsActive = false;
        e.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Soft-deleted duty designation {Id}", e.Id);
        return true;
    }
}

public static class DesignationModuleRules
{
    public static string Normalize(string? module)
    {
        var key = (module ?? "").Trim().ToLowerInvariant();
        return key switch
        {
            DeploymentModules.Housekeeping or "hk" or "fm_hk" => DeploymentModules.Housekeeping,
            _ => DeploymentModules.Security,
        };
    }

    public static bool IsAllowed(string? module)
    {
        var normalized = Normalize(module);
        return normalized is DeploymentModules.Security or DeploymentModules.Housekeeping;
    }
}

public sealed class CreateDesignationCommandValidator : AbstractValidator<CreateDesignationCommand>
{
    public CreateDesignationCommandValidator()
    {
        RuleFor(x => x.Body.Title).NotEmpty().MaximumLength(120);
        RuleFor(x => x.Body.Module)
            .NotEmpty()
            .WithMessage("Module is required.")
            .Must(DesignationModuleRules.IsAllowed)
            .WithMessage("Module must be security or housekeeping.");
    }
}

public sealed class UpdateDesignationCommandValidator : AbstractValidator<UpdateDesignationCommand>
{
    public UpdateDesignationCommandValidator()
    {
        RuleFor(x => x.Body.Title).NotEmpty().MaximumLength(120);
        RuleFor(x => x.Body.Module)
            .Must(DesignationModuleRules.IsAllowed)
            .WithMessage("Module must be security or housekeeping.");
    }
}
