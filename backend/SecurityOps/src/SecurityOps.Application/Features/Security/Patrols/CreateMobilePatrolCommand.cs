using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SecurityOps.Application.Common;
using SecurityOps.Application.Common.Interfaces;
using SecurityOps.Application.Contracts;
using SecurityOps.Domain.Entities;

namespace SecurityOps.Application.Features.Patrols;

public sealed record CreateMobilePatrolCommand(CreateMobilePatrolRequest Body) : IRequest<PatrolResponse>;

public sealed class CreateMobilePatrolCommandHandler : IRequestHandler<CreateMobilePatrolCommand, PatrolResponse>
{
    private readonly IApplicationDbContext _db;
    private readonly ILogger<CreateMobilePatrolCommandHandler> _logger;

    public CreateMobilePatrolCommandHandler(IApplicationDbContext db, ILogger<CreateMobilePatrolCommandHandler> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<PatrolResponse> Handle(CreateMobilePatrolCommand request, CancellationToken cancellationToken)
    {
        var body = request.Body;
        var patrolTime = body.PatrolTime == default
            ? DateTime.UtcNow
            : UtcDates.ToUtc(body.PatrolTime);
        var patrolStaff = await SecurityOpsResolver.GetOrCreateStaffByNameAsync(_db, body.StaffName, cancellationToken);

        var recorder = await SecurityOpsResolver.ResolveRecorderStaffAsync(_db, patrolStaff, cancellationToken);
        var shift = await SecurityOpsResolver.GetOrCreateDayShiftAsync(
            _db,
            DateOnly.FromDateTime(patrolTime),
            cancellationToken);

        var remarks = body.Remarks;
        if (!string.IsNullOrWhiteSpace(body.LocationName))
        {
            var prefix = $"[Location: {body.LocationName.Trim()}]";
            remarks = string.IsNullOrWhiteSpace(remarks) ? prefix : $"{prefix} {remarks.Trim()}";
        }

        var patrolId = Guid.Empty;
        await using var tx = await _db.BeginTransactionAsync(cancellationToken);
        try
        {
            var log = new PatrolLog
            {
                ShiftId = shift.Id,
                RecordedBy = recorder.Id,
                PatrolTime = patrolTime,
                PatrolType = string.IsNullOrWhiteSpace(body.PatrolType) ? "REGULAR" : body.PatrolType.Trim(),
                Remarks = remarks,
                Latitude = body.Latitude,
                Longitude = body.Longitude,
            };
            _db.PatrolLogs.Add(log);
            await _db.SaveChangesAsync(cancellationToken);
            patrolId = log.Id;

            _db.PatrolLogStaff.Add(new PatrolLogStaff { PatrolLogId = log.Id, StaffId = patrolStaff.Id });

            var order = 0;
            foreach (var url in body.PhotoUrls.Where(u => !string.IsNullOrWhiteSpace(u)).Distinct())
            {
                _db.PatrolPhotos.Add(new PatrolPhoto
                {
                    PatrolLogId = log.Id,
                    PhotoUrl = url.Trim(),
                    DisplayOrder = order++,
                });
            }

            await _db.SaveChangesAsync(cancellationToken);
            await tx.CommitAsync(cancellationToken);
        }
        catch
        {
            await tx.RollbackAsync(cancellationToken);
            _logger.LogError("Mobile patrol creation failed for staff {StaffName}", body.StaffName);
            throw;
        }

        _logger.LogInformation("Created mobile patrol {PatrolId} for staff {StaffName}", patrolId, body.StaffName);

        var created = await _db.PatrolLogs.AsNoTracking()
            .Include(x => x.Staff).ThenInclude(s => s.Staff)
            .Include(x => x.Photos)
            .FirstAsync(x => x.Id == patrolId, cancellationToken);

        return new PatrolResponse(
            created.Id,
            created.ShiftId,
            created.RecordedBy,
            created.PatrolTime,
            created.PatrolType,
            created.Remarks,
            created.Latitude,
            created.Longitude,
            created.Staff.Select(s => new PatrolStaffResponse(s.StaffId, s.Staff?.Name)).ToList(),
            created.Photos.OrderBy(p => p.DisplayOrder).Select(p => new PatrolPhotoResponse(p.Id, p.PhotoUrl, p.DisplayOrder)).ToList());
    }
}

public sealed class CreateMobilePatrolCommandValidator : AbstractValidator<CreateMobilePatrolCommand>
{
    public CreateMobilePatrolCommandValidator()
    {
        RuleFor(x => x.Body.StaffName).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Body.PhotoUrls).NotEmpty().WithMessage("At least one patrol photo is required.");
        RuleFor(x => x.Body.PhotoUrls).Must(p => p.Count <= 10).WithMessage("Patrol photos cannot exceed 10.");
        RuleForEach(x => x.Body.PhotoUrls).Must(u => !string.IsNullOrWhiteSpace(u)).WithMessage("Photo URL cannot be empty.");
    }
}
