namespace SecurityOps.Application.Features.Promotions;

public static class PromotionAmounts
{
    public const decimal GstPercentage = 18m;

    public static (decimal Subtotal, decimal GstAmount, decimal Total) Calculate(int quantity, decimal unitPrice)
    {
        var subtotal = Math.Round(quantity * unitPrice, 2, MidpointRounding.AwayFromZero);
        var gstAmount = Math.Round(subtotal * (GstPercentage / 100m), 2, MidpointRounding.AwayFromZero);
        var total = subtotal + gstAmount;
        return (subtotal, gstAmount, total);
    }
}
