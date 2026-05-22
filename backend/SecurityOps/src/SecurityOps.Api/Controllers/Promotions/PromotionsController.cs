using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SecurityOps.Application.Common.Models;
using SecurityOps.Application.Features.Promotions;
using SecurityOps.Application.Features.Promotions.Commands;
using SecurityOps.Application.Features.Promotions.Queries;

namespace SecurityOps.Api.Controllers.Promotions;

[ApiController]
[Route("api/promotions")]
[Tags("Promotions")]
[Authorize(Roles = "SUPER_ADMIN,ADMIN,SECURITY_SUPERVISOR,SUPERVISOR,FM,AFM")]
public sealed class PromotionsController : ControllerBase
{
    private const long MaxReceiptBytes = 10 * 1024 * 1024;
    private readonly IMediator _mediator;

    public PromotionsController(IMediator mediator) => _mediator = mediator;

    [HttpGet]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<PromotionListItemDto>>>> List(
        [FromQuery] int limit = 200,
        CancellationToken ct = default)
    {
        var rows = await _mediator.Send(new ListPromotionsQuery(limit), ct);
        return Ok(ApiResponse<IReadOnlyList<PromotionListItemDto>>.Ok(rows));
    }

    [HttpGet("dashboard")]
    public async Task<ActionResult<ApiResponse<PromotionDashboardDto>>> Dashboard(CancellationToken ct)
    {
        var data = await _mediator.Send(new GetPromotionDashboardQuery(), ct);
        return Ok(ApiResponse<PromotionDashboardDto>.Ok(data));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<PromotionDetailDto>>> GetById(Guid id, CancellationToken ct)
    {
        var row = await _mediator.Send(new GetPromotionByIdQuery(id), ct);
        if (row is null)
            return NotFound(ApiResponse<PromotionDetailDto>.Fail("Promotion not found."));
        return Ok(ApiResponse<PromotionDetailDto>.Ok(row));
    }

    /// <summary>Create a single promotion.</summary>
    [HttpPost]
    public async Task<ActionResult<ApiResponse<int>>> Create(
        [FromBody] PromotionCreateItemDto item,
        CancellationToken ct)
    {
        if (item is null)
            return BadRequest(ApiResponse<int>.Fail("Promotion payload is required."));

        return await BulkCreate(new BulkCreatePromotionsRequest(new[] { item }), ct);
    }

    [HttpPost("bulk-create")]
    public async Task<ActionResult<ApiResponse<int>>> BulkCreate(
        [FromBody] BulkCreatePromotionsRequest request,
        CancellationToken ct)
    {
        try
        {
            var count = await _mediator.Send(
                new BulkCreatePromotionsCommand(request?.Items ?? Array.Empty<PromotionCreateItemDto>()),
                ct);
            return Ok(ApiResponse<int>.Ok(count));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<int>.Fail(ex.Message));
        }
    }

    /// <summary>Legacy alias for bulk-create.</summary>
    [HttpPost("bulk")]
    public Task<ActionResult<ApiResponse<int>>> BulkCreateLegacy(
        [FromBody] BulkCreatePromotionsRequest request,
        CancellationToken ct) =>
        BulkCreate(request, ct);

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ApiResponse<PromotionDetailDto>>> Update(
        Guid id,
        [FromBody] UpdatePromotionRequest request,
        CancellationToken ct)
    {
        try
        {
            var row = await _mediator.Send(new UpdatePromotionCommand(id, request), ct);
            if (row is null)
                return NotFound(ApiResponse<PromotionDetailDto>.Fail("Promotion not found."));
            return Ok(ApiResponse<PromotionDetailDto>.Ok(row));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<PromotionDetailDto>.Fail(ex.Message));
        }
    }

    [HttpPost("{id:guid}/payment")]
    public async Task<ActionResult<ApiResponse<PromotionPaymentDto>>> AddPayment(
        Guid id,
        [FromBody] AddPromotionPaymentRequest request,
        CancellationToken ct)
    {
        try
        {
            var payment = await _mediator.Send(new AddPromotionPaymentCommand(id, request), ct);
            if (payment is null)
                return NotFound(ApiResponse<PromotionPaymentDto>.Fail("Promotion not found."));
            return Ok(ApiResponse<PromotionPaymentDto>.Ok(payment));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<PromotionPaymentDto>.Fail(ex.Message));
        }
    }

    /// <summary>Alias for POST /api/upload-receipt.</summary>
    [HttpPost("upload-receipt")]
    [RequestSizeLimit(MaxReceiptBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = MaxReceiptBytes)]
    public Task<ActionResult<ApiResponse<UploadReceiptResponse>>> UploadReceipt(
        IFormFile? file,
        [FromQuery] Guid? promotionId,
        CancellationToken ct) =>
        UploadReceiptCore(file, promotionId, ct);

    private async Task<ActionResult<ApiResponse<UploadReceiptResponse>>> UploadReceiptCore(
        IFormFile? file,
        Guid? promotionId,
        CancellationToken ct)
    {
        if (file is null || file.Length == 0)
            return BadRequest(ApiResponse<UploadReceiptResponse>.Fail("Receipt file is required."));

        if (file.Length > MaxReceiptBytes)
            return BadRequest(ApiResponse<UploadReceiptResponse>.Fail("Receipt must be 10 MB or smaller."));

        try
        {
            var contentType = string.IsNullOrWhiteSpace(file.ContentType) ? "application/pdf" : file.ContentType;
            await using var stream = file.OpenReadStream();
            var baseUrl = $"{Request.Scheme}://{Request.Host}";
            var result = await _mediator.Send(
                new UploadPromotionReceiptCommand(stream, contentType, file.FileName, promotionId, baseUrl),
                ct);
            return Ok(ApiResponse<UploadReceiptResponse>.Ok(result));
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(ApiResponse<UploadReceiptResponse>.Fail(ex.Message));
        }
    }

    [HttpGet("board-members")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<BoardMemberOptionDto>>>> BoardMembers(CancellationToken ct)
    {
        var rows = await _mediator.Send(new ListBoardMembersQuery(), ct);
        return Ok(ApiResponse<IReadOnlyList<BoardMemberOptionDto>>.Ok(rows));
    }

    /// <summary>Legacy alias — use GET /api/promotion-types.</summary>
    [HttpGet("types")]
    public Task<ActionResult<ApiResponse<IReadOnlyList<LookupDto>>>> TypesLegacy(CancellationToken ct) =>
        RedirectTypes(ct);

    private async Task<ActionResult<ApiResponse<IReadOnlyList<LookupDto>>>> RedirectTypes(CancellationToken ct)
    {
        var rows = await _mediator.Send(new ListPromotionTypesQuery(), ct);
        return Ok(ApiResponse<IReadOnlyList<LookupDto>>.Ok(rows));
    }

    /// <summary>Legacy alias — use GET /api/vendors.</summary>
    [HttpGet("vendors")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<VendorOptionDto>>>> VendorsLegacy(CancellationToken ct)
    {
        var rows = await _mediator.Send(new ListPromotionVendorsQuery(), ct);
        return Ok(ApiResponse<IReadOnlyList<VendorOptionDto>>.Ok(rows));
    }
}
