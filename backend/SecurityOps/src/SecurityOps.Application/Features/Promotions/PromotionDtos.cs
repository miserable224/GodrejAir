namespace SecurityOps.Application.Features.Promotions;

public sealed record LookupDto(Guid Id, string Name);

public sealed record VendorOptionDto(
    Guid Id,
    string VendorName,
    string? ContactPerson,
    string? Phone);

public sealed record BoardMemberOptionDto(
    Guid Id,
    string Name,
    string? Role,
    string? Phone);

public sealed record PromotionListItemDto(
    Guid Id,
    string? PromotionTitle,
    string PromotionType,
    string VendorName,
    int Quantity,
    decimal UnitPrice,
    decimal SubtotalAmount,
    decimal GstPercentage,
    decimal GstAmount,
    decimal TotalAmount,
    decimal AmountCollected,
    decimal PendingAmount,
    string PaymentStatus,
    string PromotionStatus,
    DateOnly StartDate,
    DateOnly EndDate,
    DateTime CreatedAt);

public sealed record PromotionPaymentDto(
    Guid Id,
    DateOnly PaymentDate,
    decimal Amount,
    string? PaymentMode,
    string? PaymentReferenceNumber,
    string? ReceiptUrl,
    string? Notes,
    DateTime CreatedAt);

public sealed record PromotionDetailDto(
    Guid Id,
    Guid PromotionTypeId,
    string PromotionType,
    Guid VendorId,
    string VendorName,
    Guid? BoardMemberId,
    string? BoardMemberName,
    string? PromotionTitle,
    int Quantity,
    decimal UnitPrice,
    decimal SubtotalAmount,
    decimal GstPercentage,
    decimal GstAmount,
    decimal TotalAmount,
    decimal AmountCollected,
    decimal PendingAmount,
    string PaymentStatus,
    string PromotionStatus,
    DateOnly StartDate,
    DateOnly EndDate,
    string? Notes,
    DateTime CreatedAt,
    DateTime? UpdatedAt,
    IReadOnlyList<PromotionPaymentDto> Payments);

public sealed record PromotionStatusCountDto(string Status, int Count);

public sealed record PromotionDashboardDto(
    int TotalPromotions,
    int ActiveCount,
    int UpcomingCount,
    int ExpiredCount,
    decimal TotalRevenue,
    decimal TotalCollected,
    decimal TotalPending,
    IReadOnlyList<PromotionStatusCountDto> ByStatus,
    IReadOnlyList<PromotionListItemDto> Recent);

public sealed record BulkCreatePromotionsRequest(IReadOnlyList<PromotionCreateItemDto> Items);

public sealed record PromotionCreateItemDto(
    Guid PromotionTypeId,
    int Quantity,
    decimal UnitPrice,
    Guid? VendorId = null,
    Guid? BoardMemberId = null,
    string? PromotionTitle = null,
    DateOnly? StartDate = null,
    DateOnly? EndDate = null,
    string? Notes = null);

public sealed record UpdatePromotionRequest(
    Guid? PromotionTypeId,
    Guid? VendorId,
    Guid? BoardMemberId,
    string? PromotionTitle,
    int? Quantity,
    decimal? UnitPrice,
    DateOnly? StartDate,
    DateOnly? EndDate,
    string? PaymentStatus,
    string? PromotionStatus,
    string? Notes);

public sealed record AddPromotionPaymentRequest(
    DateOnly PaymentDate,
    decimal Amount,
    string? PaymentMode,
    string? PaymentReferenceNumber,
    string? ReceiptUrl,
    string? Notes);

public sealed record UploadReceiptResponse(string Url, string Path, Guid? DocumentId);
