using AutoMapper;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SecurityOps.Application.Common.Interfaces;
using SecurityOps.Application.Common.Models;
using SecurityOps.Application.Contracts;
using SecurityOps.Domain.Entities;

namespace SecurityOps.Application.Features.Staff;

public sealed record GetStaffListQuery(string? Role, bool? Active, int Page, int PageSize)
    : IRequest<PagedResult<StaffResponse>>;

public sealed class GetStaffListQueryHandler : IRequestHandler<GetStaffListQuery, PagedResult<StaffResponse>>
{
    private readonly IApplicationDbContext _db;
    private readonly IMapper _mapper;

    public GetStaffListQueryHandler(IApplicationDbContext db, IMapper mapper)
    {
        _db = db;
        _mapper = mapper;
    }

    public async Task<PagedResult<StaffResponse>> Handle(GetStaffListQuery request, CancellationToken cancellationToken)
    {
        var q = _db.SecurityStaff.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(request.Role))
            q = q.Where(x => x.Role == request.Role);
        if (request.Active is { } active)
            q = q.Where(x => x.IsActive == active);

        var total = await q.CountAsync(cancellationToken);
        var items = await q
            .OrderBy(x => x.Name)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        return new PagedResult<StaffResponse>
        {
            Items = _mapper.Map<IReadOnlyList<StaffResponse>>(items),
            TotalCount = total,
            Page = request.Page,
            PageSize = request.PageSize
        };
    }
}

public sealed record GetStaffByIdQuery(Guid Id) : IRequest<StaffResponse?>;

public sealed class GetStaffByIdQueryHandler : IRequestHandler<GetStaffByIdQuery, StaffResponse?>
{
    private readonly IApplicationDbContext _db;
    private readonly IMapper _mapper;

    public GetStaffByIdQueryHandler(IApplicationDbContext db, IMapper mapper)
    {
        _db = db;
        _mapper = mapper;
    }

    public async Task<StaffResponse?> Handle(GetStaffByIdQuery request, CancellationToken cancellationToken)
    {
        var entity = await _db.SecurityStaff.AsNoTracking().FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);
        return entity is null ? null : _mapper.Map<StaffResponse>(entity);
    }
}

public sealed record CreateStaffCommand(CreateStaffRequest Body) : IRequest<StaffResponse>;

public sealed class CreateStaffCommandHandler : IRequestHandler<CreateStaffCommand, StaffResponse>
{
    private readonly IApplicationDbContext _db;
    private readonly IMapper _mapper;
    private readonly ILogger<CreateStaffCommandHandler> _logger;

    public CreateStaffCommandHandler(IApplicationDbContext db, IMapper mapper, ILogger<CreateStaffCommandHandler> logger)
    {
        _db = db;
        _mapper = mapper;
        _logger = logger;
    }

    public async Task<StaffResponse> Handle(CreateStaffCommand request, CancellationToken cancellationToken)
    {
        var e = new SecurityStaff
        {
            Name = request.Body.Name,
            BadgeNumber = request.Body.BadgeNumber,
            Role = request.Body.Role,
            Phone = request.Body.Phone,
            IsActive = true
        };
        _db.SecurityStaff.Add(e);
        await _db.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Created security staff {StaffId} {Name}", e.Id, e.Name);
        return _mapper.Map<StaffResponse>(e);
    }
}

public sealed record UpdateStaffCommand(Guid Id, UpdateStaffRequest Body) : IRequest<StaffResponse?>;

public sealed class UpdateStaffCommandHandler : IRequestHandler<UpdateStaffCommand, StaffResponse?>
{
    private readonly IApplicationDbContext _db;
    private readonly IMapper _mapper;
    private readonly ILogger<UpdateStaffCommandHandler> _logger;

    public UpdateStaffCommandHandler(IApplicationDbContext db, IMapper mapper, ILogger<UpdateStaffCommandHandler> logger)
    {
        _db = db;
        _mapper = mapper;
        _logger = logger;
    }

    public async Task<StaffResponse?> Handle(UpdateStaffCommand request, CancellationToken cancellationToken)
    {
        var e = await _db.SecurityStaff.FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);
        if (e is null) return null;
        e.Name = request.Body.Name;
        e.BadgeNumber = request.Body.BadgeNumber;
        e.Role = request.Body.Role;
        e.Phone = request.Body.Phone;
        e.IsActive = request.Body.IsActive;
        e.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Updated security staff {StaffId}", e.Id);
        return _mapper.Map<StaffResponse>(e);
    }
}

public sealed record DeleteStaffCommand(Guid Id) : IRequest<bool>;

public sealed class DeleteStaffCommandHandler : IRequestHandler<DeleteStaffCommand, bool>
{
    private readonly IApplicationDbContext _db;
    private readonly ILogger<DeleteStaffCommandHandler> _logger;

    public DeleteStaffCommandHandler(IApplicationDbContext db, ILogger<DeleteStaffCommandHandler> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<bool> Handle(DeleteStaffCommand request, CancellationToken cancellationToken)
    {
        var e = await _db.SecurityStaff.FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);
        if (e is null) return false;
        e.IsActive = false;
        e.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Soft-deleted security staff {StaffId}", e.Id);
        return true;
    }
}

public sealed class CreateStaffRequestValidator : AbstractValidator<CreateStaffCommand>
{
    public CreateStaffRequestValidator()
    {
        RuleFor(x => x.Body.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Body.Role).NotEmpty().MaximumLength(50);
    }
}

public sealed class UpdateStaffRequestValidator : AbstractValidator<UpdateStaffCommand>
{
    public UpdateStaffRequestValidator()
    {
        RuleFor(x => x.Body.Name).NotEmpty();
    }
}
