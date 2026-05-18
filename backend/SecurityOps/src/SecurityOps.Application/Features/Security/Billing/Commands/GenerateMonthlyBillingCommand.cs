using MediatR;
using Microsoft.EntityFrameworkCore;
using SecurityOps.Application.Common.Interfaces;
using SecurityOps.Domain.Entities;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace SecurityOps.Application.Features.Billing.Commands;

public record GenerateMonthlyBillingCommand(string Month) : IRequest<Guid>;

public class GenerateMonthlyBillingCommandHandler : IRequestHandler<GenerateMonthlyBillingCommand, Guid>
{
    private readonly IApplicationDbContext _context;
    private readonly IMediator _mediator;

    public GenerateMonthlyBillingCommandHandler(IApplicationDbContext context, IMediator mediator)
    {
        _context = context;
        _mediator = mediator;
    }

    public async Task<Guid> Handle(GenerateMonthlyBillingCommand request, CancellationToken cancellationToken)
    {
        // 1. Get Calculation
        var calc = await _mediator.Send(new Queries.GetMonthlyBillingCalculationQuery(request.Month), cancellationToken);
        if (!string.IsNullOrEmpty(calc.Message))
            throw new InvalidOperationException(calc.Message);

        var activeContract = await _context.SecurityVendorContracts
            .Where(x => x.IsActive)
            .OrderByDescending(x => x.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);

        if (activeContract == null) throw new Exception("No active contract found");

        // Check if already exists
        var existing = await _context.SecurityMonthlyBillings
            .FirstOrDefaultAsync(x => x.BillingMonth == request.Month && x.ContractId == activeContract.Id, cancellationToken);
        
        if (existing != null)
        {
            _context.SecurityMonthlyBillings.Remove(existing);
        }

        var billing = new SecurityMonthlyBilling
        {
            ContractId = activeContract.Id,
            BillingMonth = request.Month,
            GeneratedAt = DateTime.UtcNow,
            GrossServiceAmount = calc.GrossBase,
            TotalShortageDeduction = calc.TotalShortageDeduction,
            HighShortagePenalty = calc.HighShortagePenalty,
            NetBeforeTax = calc.NetBeforeTax,
            ServiceChargeAmount = calc.ServiceCharge,
            GstAmount = calc.Gst,
            GrandTotal = calc.GrandTotal,
            Status = "PENDING",
            InvoiceNumber = $"INV/{request.Month.Replace("-", "")}/{DateTime.UtcNow.Ticks.ToString().Substring(10)}"
        };

        foreach (var item in calc.Items)
        {
            billing.Items.Add(new SecurityMonthlyBillingItem
            {
                Description = item.Description,
                Amount = item.Amount,
                IsDeduction = item.IsDeduction
            });
        }

        _context.SecurityMonthlyBillings.Add(billing);
        await _context.SaveChangesAsync(cancellationToken);

        return billing.Id;
    }
}
