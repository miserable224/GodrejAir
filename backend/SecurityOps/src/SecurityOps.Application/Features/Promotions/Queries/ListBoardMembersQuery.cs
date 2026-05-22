using MediatR;
using Microsoft.EntityFrameworkCore;
using SecurityOps.Application.Common.Interfaces;

namespace SecurityOps.Application.Features.Promotions.Queries;

public sealed record ListBoardMembersQuery : IRequest<IReadOnlyList<BoardMemberOptionDto>>;

public sealed class ListBoardMembersQueryHandler
    : IRequestHandler<ListBoardMembersQuery, IReadOnlyList<BoardMemberOptionDto>>
{
    private readonly IApplicationDbContext _db;

    public ListBoardMembersQueryHandler(IApplicationDbContext db) => _db = db;

    public async Task<IReadOnlyList<BoardMemberOptionDto>> Handle(ListBoardMembersQuery request, CancellationToken ct) =>
        await _db.BoardMembers
            .AsNoTracking()
            .Where(b => b.IsActive)
            .OrderBy(b => b.Name)
            .Select(b => new BoardMemberOptionDto(b.Id, b.Name, b.Role, b.Phone))
            .ToListAsync(ct);
}
