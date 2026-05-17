using AutoMapper;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SecurityOps.Application.Common.Interfaces;
using SecurityOps.Application.Common.Models;
using SecurityOps.Application.Contracts;
using SecurityOps.Domain.Entities;

namespace SecurityOps.Application.Features.Locations;

public sealed record GetLocationsQuery(int Page, int PageSize) : IRequest<PagedResult<LocationResponse>>;
public sealed class GetLocationsQueryHandler : IRequestHandler<GetLocationsQuery, PagedResult<LocationResponse>>
{
    private readonly IApplicationDbContext _db;
    private readonly IMapper _mapper;
    public GetLocationsQueryHandler(IApplicationDbContext db, IMapper mapper) { _db = db; _mapper = mapper; }
    public async Task<PagedResult<LocationResponse>> Handle(GetLocationsQuery request, CancellationToken cancellationToken)
    {
        var q = _db.SecurityLocations.AsNoTracking().Where(x => x.IsActive);
        var total = await q.CountAsync(cancellationToken);
        var items = await q.OrderBy(x => x.Name).Skip((request.Page - 1) * request.PageSize).Take(request.PageSize).ToListAsync(cancellationToken);
        return new PagedResult<LocationResponse> { Items = _mapper.Map<IReadOnlyList<LocationResponse>>(items), TotalCount = total, Page = request.Page, PageSize = request.PageSize };
    }
}

public sealed record GetLocationByIdQuery(Guid Id) : IRequest<LocationResponse?>;
public sealed class GetLocationByIdQueryHandler : IRequestHandler<GetLocationByIdQuery, LocationResponse?>
{
    private readonly IApplicationDbContext _db;
    private readonly IMapper _mapper;
    public GetLocationByIdQueryHandler(IApplicationDbContext db, IMapper mapper) { _db = db; _mapper = mapper; }
    public async Task<LocationResponse?> Handle(GetLocationByIdQuery request, CancellationToken cancellationToken)
    {
        var e = await _db.SecurityLocations.AsNoTracking().FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);
        return e is null ? null : _mapper.Map<LocationResponse>(e);
    }
}

public sealed record CreateLocationCommand(CreateLocationRequest Body) : IRequest<LocationResponse>;
public sealed class CreateLocationCommandHandler : IRequestHandler<CreateLocationCommand, LocationResponse>
{
    private readonly IApplicationDbContext _db;
    private readonly IMapper _mapper;
    private readonly ILogger<CreateLocationCommandHandler> _logger;
    public CreateLocationCommandHandler(IApplicationDbContext db, IMapper mapper, ILogger<CreateLocationCommandHandler> logger) { _db = db; _mapper = mapper; _logger = logger; }
    public async Task<LocationResponse> Handle(CreateLocationCommand request, CancellationToken cancellationToken)
    {
        var e = new SecurityLocation { Name = request.Body.Name, Code = request.Body.Code, Description = request.Body.Description, Latitude = request.Body.Latitude, Longitude = request.Body.Longitude, IsActive = true };
        _db.SecurityLocations.Add(e);
        await _db.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Created location {Id}", e.Id);
        return _mapper.Map<LocationResponse>(e);
    }
}

public sealed record UpdateLocationCommand(Guid Id, UpdateLocationRequest Body) : IRequest<LocationResponse?>;
public sealed class UpdateLocationCommandHandler : IRequestHandler<UpdateLocationCommand, LocationResponse?>
{
    private readonly IApplicationDbContext _db;
    private readonly IMapper _mapper;
    private readonly ILogger<UpdateLocationCommandHandler> _logger;
    public UpdateLocationCommandHandler(IApplicationDbContext db, IMapper mapper, ILogger<UpdateLocationCommandHandler> logger) { _db = db; _mapper = mapper; _logger = logger; }
    public async Task<LocationResponse?> Handle(UpdateLocationCommand request, CancellationToken cancellationToken)
    {
        var e = await _db.SecurityLocations.FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);
        if (e is null) return null;
        e.Name = request.Body.Name; e.Code = request.Body.Code; e.Description = request.Body.Description; e.Latitude = request.Body.Latitude; e.Longitude = request.Body.Longitude; e.IsActive = request.Body.IsActive; e.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Updated location {Id}", e.Id);
        return _mapper.Map<LocationResponse>(e);
    }
}

public sealed record DeleteLocationCommand(Guid Id) : IRequest<bool>;
public sealed class DeleteLocationCommandHandler : IRequestHandler<DeleteLocationCommand, bool>
{
    private readonly IApplicationDbContext _db;
    public DeleteLocationCommandHandler(IApplicationDbContext db) => _db = db;
    public async Task<bool> Handle(DeleteLocationCommand request, CancellationToken cancellationToken)
    {
        var e = await _db.SecurityLocations.FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);
        if (e is null) return false;
        e.IsActive = false; e.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);
        return true;
    }
}

public sealed class CreateLocationRequestValidator : AbstractValidator<CreateLocationCommand>
{
    public CreateLocationRequestValidator() => RuleFor(x => x.Body.Name).NotEmpty();
}
