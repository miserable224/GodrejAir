using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SecurityOps.Application.Common.Interfaces;
using SecurityOps.Application.Common.Models;
using SecurityOps.Application.Contracts;
using SecurityOps.Domain.Entities;

namespace SecurityOps.Application.Features.Patrols;

public sealed record CreatePatrolCommand(CreatePatrolRequest Body) : IRequest<PatrolResponse>;

public sealed class CreatePatrolCommandHandler : IRequestHandler<CreatePatrolCommand, PatrolResponse>
{
    private readonly IApplicationDbContext _db;
    private readonly ILogger<CreatePatrolCommandHandler> _logger;

    public CreatePatrolCommandHandler(IApplicationDbContext db, ILogger<CreatePatrolCommandHandler> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<PatrolResponse> Handle(CreatePatrolCommand request, CancellationToken cancellationToken)
    {
        var patrolId = Guid.Empty;
        await using var tx = await _db.BeginTransactionAsync(cancellationToken);
        try
        {
            var log = new PatrolLog
            {
                ShiftId = request.Body.ShiftId,
                RecordedBy = request.Body.RecordedBy,
                PatrolTime = request.Body.PatrolTime,
                PatrolType = request.Body.PatrolType,
                Remarks = request.Body.Remarks,
                Latitude = request.Body.Latitude,
                Longitude = request.Body.Longitude
            };
            _db.PatrolLogs.Add(log);
            await _db.SaveChangesAsync(cancellationToken);
            patrolId = log.Id;

            var order = 0;
            foreach (var staffId in request.Body.StaffIds.Distinct())
            {
                _db.PatrolLogStaff.Add(new PatrolLogStaff { PatrolLogId = log.Id, StaffId = staffId });
            }

            foreach (var url in request.Body.Photos)
            {
                _db.PatrolPhotos.Add(new PatrolPhoto
                {
                    PatrolLogId = log.Id,
                    PhotoUrl = url,
                    DisplayOrder = order++
                });
            }

            await _db.SaveChangesAsync(cancellationToken);
            await tx.CommitAsync(cancellationToken);
        }
        catch
        {
            await tx.RollbackAsync(cancellationToken);
            _logger.LogError("Patrol creation failed for shift {ShiftId}", request.Body.ShiftId);
            throw;
        }

        _logger.LogInformation("Created patrol {PatrolId} for shift {ShiftId}", patrolId, request.Body.ShiftId);

        var created = await _db.PatrolLogs.AsNoTracking()
            .Include(x => x.Staff).ThenInclude(s => s.Staff)
            .Include(x => x.Photos)
            .FirstAsync(x => x.Id == patrolId, cancellationToken);

        return MapPatrol(created);
    }

    private static PatrolResponse MapPatrol(PatrolLog x) =>
        new(
            x.Id,
            x.ShiftId,
            x.RecordedBy,
            x.PatrolTime,
            x.PatrolType,
            x.Remarks,
            x.Latitude,
            x.Longitude,
            x.Staff.Select(s => new PatrolStaffResponse(s.StaffId, s.Staff?.Name)).ToList(),
            x.Photos.OrderBy(p => p.DisplayOrder).Select(p => new PatrolPhotoResponse(p.Id, p.PhotoUrl, p.DisplayOrder)).ToList());
}

public sealed record GetPatrolsQuery(DateOnly? Date, string? Month, string? ShiftType, int Page, int PageSize)
    : IRequest<PagedResult<PatrolResponse>>;

public sealed class GetPatrolsQueryHandler : IRequestHandler<GetPatrolsQuery, PagedResult<PatrolResponse>>
{
    private readonly IApplicationDbContext _db;

    public GetPatrolsQueryHandler(IApplicationDbContext db) => _db = db;

    public async Task<PagedResult<PatrolResponse>> Handle(GetPatrolsQuery request, CancellationToken cancellationToken)
    {
        IQueryable<PatrolLog> q = _db.PatrolLogs.AsNoTracking()
            .Include(x => x.Shift)
            .Include(x => x.Staff).ThenInclude(s => s.Staff)
            .Include(x => x.Photos);

        if (request.Date is { } d)
            q = q.Where(x => DateOnly.FromDateTime(x.PatrolTime) == d);
        if (!string.IsNullOrWhiteSpace(request.Month) && DateOnly.TryParse(request.Month + "-01", out var first))
            q = q.Where(x => x.PatrolTime.Year == first.Year && x.PatrolTime.Month == first.Month);
        if (!string.IsNullOrWhiteSpace(request.ShiftType))
            q = q.Where(x => x.Shift!.ShiftType == request.ShiftType.ToUpperInvariant());

        var total = await q.CountAsync(cancellationToken);
        var items = await q.OrderByDescending(x => x.PatrolTime)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        var mapped = items.Select(x => new PatrolResponse(
            x.Id,
            x.ShiftId,
            x.RecordedBy,
            x.PatrolTime,
            x.PatrolType,
            x.Remarks,
            x.Latitude,
            x.Longitude,
            x.Staff.Select(s => new PatrolStaffResponse(s.StaffId, s.Staff?.Name)).ToList(),
            x.Photos.OrderBy(p => p.DisplayOrder).Select(p => new PatrolPhotoResponse(p.Id, p.PhotoUrl, p.DisplayOrder)).ToList()
        )).ToList();

        return new PagedResult<PatrolResponse>
        {
            Items = mapped,
            TotalCount = total,
            Page = request.Page,
            PageSize = request.PageSize
        };
    }
}

public sealed record GetPatrolByIdQuery(Guid Id) : IRequest<PatrolResponse?>;

public sealed class GetPatrolByIdQueryHandler : IRequestHandler<GetPatrolByIdQuery, PatrolResponse?>
{
    private readonly IApplicationDbContext _db;
    public GetPatrolByIdQueryHandler(IApplicationDbContext db) => _db = db;

    public async Task<PatrolResponse?> Handle(GetPatrolByIdQuery request, CancellationToken cancellationToken)
    {
        var x = await _db.PatrolLogs.AsNoTracking()
            .Include(p => p.Staff).ThenInclude(s => s.Staff)
            .Include(p => p.Photos)
            .FirstOrDefaultAsync(p => p.Id == request.Id, cancellationToken);
        if (x is null) return null;
        return new PatrolResponse(
            x.Id,
            x.ShiftId,
            x.RecordedBy,
            x.PatrolTime,
            x.PatrolType,
            x.Remarks,
            x.Latitude,
            x.Longitude,
            x.Staff.Select(s => new PatrolStaffResponse(s.StaffId, s.Staff?.Name)).ToList(),
            x.Photos.OrderBy(p => p.DisplayOrder).Select(p => new PatrolPhotoResponse(p.Id, p.PhotoUrl, p.DisplayOrder)).ToList());
    }
}

public sealed record DeletePatrolCommand(Guid Id) : IRequest<bool>;

public sealed class DeletePatrolCommandHandler : IRequestHandler<DeletePatrolCommand, bool>
{
    private readonly IApplicationDbContext _db;
    private readonly ILogger<DeletePatrolCommandHandler> _logger;

    public DeletePatrolCommandHandler(IApplicationDbContext db, ILogger<DeletePatrolCommandHandler> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<bool> Handle(DeletePatrolCommand request, CancellationToken cancellationToken)
    {
        var e = await _db.PatrolLogs.FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);
        if (e is null) return false;
        _db.PatrolLogs.Remove(e);
        await _db.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Deleted patrol {PatrolId}", request.Id);
        return true;
    }
}

public sealed class CreatePatrolCommandValidator : AbstractValidator<CreatePatrolCommand>
{
    public CreatePatrolCommandValidator()
    {
        RuleFor(x => x.Body.PatrolTime).Must(t => t != default).WithMessage("Patrol time is required.");
        RuleFor(x => x.Body.ShiftId).NotEmpty();
        RuleFor(x => x.Body.RecordedBy).NotEmpty();
        RuleFor(x => x.Body.PatrolType).NotEmpty().MaximumLength(50);
        RuleFor(x => x.Body.StaffIds).NotEmpty().WithMessage("At least one staff member is required.");
        RuleFor(x => x.Body.Photos).Must(p => p.Count <= 10).WithMessage("Patrol photos cannot exceed 10.");
        RuleForEach(x => x.Body.Photos).Must(u => !string.IsNullOrWhiteSpace(u)).WithMessage("Photo URL cannot be empty.");
    }
}
