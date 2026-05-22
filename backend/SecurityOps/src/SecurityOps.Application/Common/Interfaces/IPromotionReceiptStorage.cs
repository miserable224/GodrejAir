namespace SecurityOps.Application.Common.Interfaces;

public interface IPromotionReceiptStorage
{
    Task<string> SaveAsync(
        Stream content,
        string contentType,
        string? originalFileName,
        CancellationToken cancellationToken = default);
}
