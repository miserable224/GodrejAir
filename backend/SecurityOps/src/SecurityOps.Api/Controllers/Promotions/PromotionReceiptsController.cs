using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SecurityOps.Application.Common.Models;
using SecurityOps.Application.Features.Promotions;
using SecurityOps.Application.Features.Promotions.Commands;

namespace SecurityOps.Api.Controllers.Promotions;

/// <summary>Receipt upload — matches recommended POST /upload-receipt.</summary>
[ApiController]
[Route("api/upload-receipt")]
[Tags("Promotions")]
[Authorize(Roles = "SUPER_ADMIN,ADMIN,SECURITY_SUPERVISOR,SUPERVISOR,FM,AFM")]
public sealed class PromotionReceiptsController : ControllerBase
{
    private const long MaxReceiptBytes = 10 * 1024 * 1024;
    private readonly IMediator _mediator;

    public PromotionReceiptsController(IMediator mediator) => _mediator = mediator;

    [HttpPost]
    [RequestSizeLimit(MaxReceiptBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = MaxReceiptBytes)]
    public async Task<ActionResult<ApiResponse<UploadReceiptResponse>>> Upload(
        IFormFile? file,
        [FromQuery] Guid? promotionId,
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
}
