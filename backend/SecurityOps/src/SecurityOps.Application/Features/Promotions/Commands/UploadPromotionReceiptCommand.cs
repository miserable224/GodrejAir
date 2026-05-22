using MediatR;
using Microsoft.EntityFrameworkCore;
using SecurityOps.Application.Common.Interfaces;
using SecurityOps.Domain.Entities;

namespace SecurityOps.Application.Features.Promotions.Commands;

public sealed record UploadPromotionReceiptCommand(
    Stream FileStream,
    string ContentType,
    string? FileName,
    Guid? PromotionId,
    string PublicBaseUrl) : IRequest<UploadReceiptResponse>;

public sealed class UploadPromotionReceiptCommandHandler
    : IRequestHandler<UploadPromotionReceiptCommand, UploadReceiptResponse>
{
    private readonly IApplicationDbContext _db;
    private readonly IPromotionReceiptStorage _storage;

    public UploadPromotionReceiptCommandHandler(
        IApplicationDbContext db,
        IPromotionReceiptStorage storage)
    {
        _db = db;
        _storage = storage;
    }

    public async Task<UploadReceiptResponse> Handle(UploadPromotionReceiptCommand request, CancellationToken ct)
    {
        var relativePath = await _storage.SaveAsync(
            request.FileStream,
            request.ContentType,
            request.FileName,
            ct);

        var url = $"{request.PublicBaseUrl.TrimEnd('/')}{relativePath}";
        Guid? documentId = null;

        if (request.PromotionId is { } pid && pid != Guid.Empty)
        {
            var exists = await _db.Promotions.AnyAsync(p => p.Id == pid, ct);
            if (!exists)
                throw new InvalidOperationException("Promotion not found.");

            var doc = new PromotionDocument
            {
                Id = Guid.NewGuid(),
                PromotionId = pid,
                FileName = request.FileName,
                FileUrl = url,
                DocumentType = "receipt",
                CreatedAt = DateTime.UtcNow,
            };
            _db.PromotionDocuments.Add(doc);
            await _db.SaveChangesAsync(ct);
            documentId = doc.Id;
        }

        return new UploadReceiptResponse(url, relativePath, documentId);
    }
}
