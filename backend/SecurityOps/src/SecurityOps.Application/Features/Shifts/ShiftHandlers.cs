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

namespace SecurityOps.Application.Features.Shifts;

public sealed record GetShiftsQuery(DateOnly? Date, string? Month, string? ShiftType, Guid? SupervisorId, int Page, int PageSize)
    : IRequest<PagedResult<ShiftResponse>>;

public sealed class GetShiftsQueryHandler : IRequestHandler<GetShiftsQuery, PagedResult<ShiftResponse>>
{
    private readonly IApplicationDbContext _db;
    private readonly IMapper _mapper;

    public GetShiftsQueryHandler(IApplicationDbContext db, IMapper mapper)
    {
        _db = db;
        _mapper = mapper;
    }

    public async Task<PagedResult<ShiftResponse>> Handle(GetShiftsQuery request, CancellationToken cancellationToken)
    {
        var q = _db.SecurityShifts.AsNoTracking();
        if (request.Date is { } d)
            q = q.Where(x => x.ShiftDate == d);
        if (!string.IsNullOrWhiteSpace(request.Month) && DateOnly.TryParse(request.Month + "-01", out var first))
        {
            var y = first.Year;
            var m = first.Month;
            q = q.Where(x => x.ShiftDate.Year == y && x.ShiftDate.Month == m);
        }
        if (!string.IsNullOrWhiteSpace(request.ShiftType))
            q = q.Where(x => x.ShiftType == request.ShiftType.ToUpperInvariant());
        if (request.SupervisorId is { } sid)
            q = q.Where(x => x.SupervisorId == sid);

        var total = await q.CountAsync(cancellationToken);
        var items = await q.OrderByDescending(x => x.ShiftDate).ThenBy(x => x.ShiftType)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        return new PagedResult<ShiftResponse>
        {
            Items = _mapper.Map<IReadOnlyList<ShiftResponse>>(items),
            TotalCount = total,
            Page = request.Page,
            PageSize = request.PageSize
        };
    }
}

public sealed record GetShiftByIdQuery(Guid Id) : IRequest<ShiftResponse?>;
public sealed class GetShiftByIdQueryHandler : IRequestHandler<GetShiftByIdQuery, ShiftResponse?>
{
    private readonly IApplicationDbContext _db;
    private readonly IMapper _mapper;
    public GetShiftByIdQueryHandler(IApplicationDbContext db, IMapper mapper) { _db = db; _mapper = mapper; }
    public async Task<ShiftResponse?> Handle(GetShiftByIdQuery request, CancellationToken cancellationToken)
    {
        var e = await _db.SecurityShifts.AsNoTracking().FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);
        return e is null ? null : _mapper.Map<ShiftResponse>(e);
    }
}

public sealed record CreateShiftCommand(CreateShiftRequest Body) : IRequest<ShiftResponse>;
public sealed class CreateShiftCommandHandler : IRequestHandler<CreateShiftCommand, ShiftResponse>
{
    private readonly IApplicationDbContext _db;
    private readonly IMapper _mapper;
    private readonly ILogger<CreateShiftCommandHandler> _logger;
    public CreateShiftCommandHandler(IApplicationDbContext db, IMapper mapper, ILogger<CreateShiftCommandHandler> logger) { _db = db; _mapper = mapper; _logger = logger; }
    public async Task<ShiftResponse> Handle(CreateShiftCommand request, CancellationToken cancellationToken)
    {
        var e = new SecurityShift
        {
            ShiftDate = request.Body.ShiftDate,
            ShiftType = request.Body.ShiftType.ToUpperInvariant(),
            SupervisorId = request.Body.SupervisorId,
            Notes = request.Body.Notes,
            Status = request.Body.Status
        };
        _db.SecurityShifts.Add(e);
        await _db.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Created shift {ShiftId} {Date} {Type}", e.Id, e.ShiftDate, e.ShiftType);
        return _mapper.Map<ShiftResponse>(e);
    }
}

public sealed record UpdateShiftCommand(Guid Id, UpdateShiftRequest Body) : IRequest<ShiftResponse?>;
public sealed class UpdateShiftCommandHandler : IRequestHandler<UpdateShiftCommand, ShiftResponse?>
{
    private readonly IApplicationDbContext _db;
    private readonly IMapper _mapper;
    private readonly ILogger<UpdateShiftCommandHandler> _logger;
    public UpdateShiftCommandHandler(IApplicationDbContext db, IMapper mapper, ILogger<UpdateShiftCommandHandler> logger) { _db = db; _mapper = mapper; _logger = logger; }
    public async Task<ShiftResponse?> Handle(UpdateShiftCommand request, CancellationToken cancellationToken)
    {
        var e = await _db.SecurityShifts.FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);
        if (e is null) return null;
        e.ShiftDate = request.Body.ShiftDate;
        e.ShiftType = request.Body.ShiftType.ToUpperInvariant();
        e.SupervisorId = request.Body.SupervisorId;
        e.Notes = request.Body.Notes;
        e.Status = request.Body.Status;
        e.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Updated shift {ShiftId}", e.Id);
        return _mapper.Map<ShiftResponse>(e);
    }
}

public sealed record DeleteShiftCommand(Guid Id) : IRequest<bool>;
public sealed class DeleteShiftCommandHandler : IRequestHandler<DeleteShiftCommand, bool>
{
    private readonly IApplicationDbContext _db;
    public DeleteShiftCommandHandler(IApplicationDbContext db) => _db = db;
    public async Task<bool> Handle(DeleteShiftCommand request, CancellationToken cancellationToken)
    {
        var e = await _db.SecurityShifts.FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);
        if (e is null) return false;
        _db.SecurityShifts.Remove(e);
        await _db.SaveChangesAsync(cancellationToken);
        return true;
    }
}

public sealed class CreateShiftCommandValidator : AbstractValidator<CreateShiftCommand>
{
    public CreateShiftCommandValidator()
    {
        RuleFor(x => x.Body.ShiftDate).Must(d => d != default).WithMessage("Shift date is required.");
        RuleFor(x => x.Body.ShiftType).NotEmpty().Must(ShiftTypes.IsValid).WithMessage("ShiftType must be DAY or NIGHT.");
    }
}

public sealed class UpdateShiftCommandValidator : AbstractValidator<UpdateShiftCommand>
{
    public UpdateShiftCommandValidator()
    {
        RuleFor(x => x.Body.ShiftDate).Must(d => d != default).WithMessage("Shift date is required.");
        RuleFor(x => x.Body.ShiftType).NotEmpty().Must(ShiftTypes.IsValid).WithMessage("ShiftType must be DAY or NIGHT.");
    }
}
