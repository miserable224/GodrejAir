using AutoMapper;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SecurityOps.Application.Common.Interfaces;
using SecurityOps.Application.Common.Models;
using SecurityOps.Application.Contracts;
using SecurityOps.Domain.Entities;
using SecurityOps.Domain.Enums;

namespace SecurityOps.Application.Features.Deployments;

public sealed record BulkReplaceDeploymentsCommand(BulkDeploymentRequest Body) : IRequest<IReadOnlyList<DeploymentResponse>>;

public sealed class BulkReplaceDeploymentsCommandHandler : IRequestHandler<BulkReplaceDeploymentsCommand, IReadOnlyList<DeploymentResponse>>
{
    private readonly IApplicationDbContext _db;
    private readonly IMapper _mapper;
    private readonly ILogger<BulkReplaceDeploymentsCommandHandler> _logger;

    public BulkReplaceDeploymentsCommandHandler(
        IApplicationDbContext db,
        IMapper mapper,
        ILogger<BulkReplaceDeploymentsCommandHandler> logger)
    {
        _db = db;
        _mapper = mapper;
        _logger = logger;
    }

    public async Task<IReadOnlyList<DeploymentResponse>> Handle(BulkReplaceDeploymentsCommand request, CancellationToken cancellationToken)
    {
        var shift = await _db.SecurityShifts
            .Include(x => x.Deployments)
            .FirstOrDefaultAsync(x => x.Id == request.Body.ShiftId, cancellationToken)
            ?? throw new InvalidOperationException("Shift not found.");

        await using var tx = await _db.BeginTransactionAsync(cancellationToken);
        try
        {
            _db.SecurityShiftDeployments.RemoveRange(shift.Deployments);
            await _db.SaveChangesAsync(cancellationToken);

            foreach (var line in request.Body.Deployments)
            {
                var d = new SecurityShiftDeployment
                {
                    ShiftId = shift.Id,
                    StaffId = line.StaffId,
                    LocationId = line.LocationId,
                    IsLastGuard = line.IsLastGuard
                };
                _db.SecurityShiftDeployments.Add(d);
            }

            await _db.SaveChangesAsync(cancellationToken);
            await tx.CommitAsync(cancellationToken);
        }
        catch
        {
            await tx.RollbackAsync(cancellationToken);
            _logger.LogError("Bulk deployment failed for shift {ShiftId}", request.Body.ShiftId);
            throw;
        }

        var list = await _db.SecurityShiftDeployments.AsNoTracking()
            .Where(x => x.ShiftId == shift.Id)
            .ToListAsync(cancellationToken);

        _logger.LogInformation("Replaced deployments for shift {ShiftId}; count {Count}", shift.Id, list.Count);
        return _mapper.Map<IReadOnlyList<DeploymentResponse>>(list);
    }
}

public sealed record GetDeploymentsQuery(Guid? ShiftId, DateOnly? Date, int Page, int PageSize)
    : IRequest<PagedResult<DeploymentResponse>>;

public sealed class GetDeploymentsQueryHandler : IRequestHandler<GetDeploymentsQuery, PagedResult<DeploymentResponse>>
{
    private readonly IApplicationDbContext _db;
    private readonly IMapper _mapper;

    public GetDeploymentsQueryHandler(IApplicationDbContext db, IMapper mapper)
    {
        _db = db;
        _mapper = mapper;
    }

    public async Task<PagedResult<DeploymentResponse>> Handle(GetDeploymentsQuery request, CancellationToken cancellationToken)
    {
        var q = _db.SecurityShiftDeployments.AsNoTracking().AsQueryable();
        if (request.ShiftId is { } sid)
            q = q.Where(x => x.ShiftId == sid);
        if (request.Date is { } d)
            q = q.Where(x => x.Shift!.ShiftDate == d);

        var total = await q.CountAsync(cancellationToken);
        var items = await q.OrderBy(x => x.Shift!.ShiftDate).ThenBy(x => x.StaffId)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        return new PagedResult<DeploymentResponse>
        {
            Items = _mapper.Map<IReadOnlyList<DeploymentResponse>>(items),
            TotalCount = total,
            Page = request.Page,
            PageSize = request.PageSize
        };
    }
}

public sealed record DeleteDeploymentCommand(Guid Id) : IRequest<bool>;

public sealed class DeleteDeploymentCommandHandler : IRequestHandler<DeleteDeploymentCommand, bool>
{
    private readonly IApplicationDbContext _db;
    private readonly ILogger<DeleteDeploymentCommandHandler> _logger;

    public DeleteDeploymentCommandHandler(IApplicationDbContext db, ILogger<DeleteDeploymentCommandHandler> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<bool> Handle(DeleteDeploymentCommand request, CancellationToken cancellationToken)
    {
        var e = await _db.SecurityShiftDeployments.FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);
        if (e is null) return false;
        _db.SecurityShiftDeployments.Remove(e);
        await _db.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Deleted deployment {DeploymentId}", request.Id);
        return true;
    }
}

public sealed class BulkReplaceDeploymentsCommandValidator : AbstractValidator<BulkReplaceDeploymentsCommand>
{
    public BulkReplaceDeploymentsCommandValidator()
    {
        RuleFor(x => x.Body.ShiftId).NotEmpty();
        RuleFor(x => x.Body.Deployments).NotEmpty().WithMessage("Deployments cannot be empty.");
        RuleForEach(x => x.Body.Deployments).ChildRules(line =>
        {
            line.RuleFor(l => l.StaffId).NotEmpty();
            line.RuleFor(l => l.LocationId).NotEmpty();
        });
    }
}

public sealed class BulkReplaceDeploymentsBusinessValidator : AbstractValidator<BulkReplaceDeploymentsCommand>
{
    public BulkReplaceDeploymentsBusinessValidator(IApplicationDbContext db)
    {
        RuleFor(x => x).CustomAsync(async (cmd, ctx, ct) =>
        {
            var shift = await db.SecurityShifts.AsNoTracking().FirstOrDefaultAsync(s => s.Id == cmd.Body.ShiftId, ct);
            if (shift is null)
            {
                ctx.AddFailure("ShiftId", "Shift not found.");
                return;
            }

            if (string.Equals(shift.ShiftType, ShiftTypes.Day, StringComparison.OrdinalIgnoreCase))
            {
                var lastGuards = cmd.Body.Deployments.Count(d => d.IsLastGuard);
                if (lastGuards != 1)
                    ctx.AddFailure("Deployments", "DAY shift requires exactly one last guard (IsLastGuard).");
            }
        });
    }
}
