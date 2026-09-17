// Pure calculation helpers. No database access here, so they are easy to unit test.

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Calculate one quotation line.
 *
 * baseAmount     = quantity * unitPrice
 * discountAmount = baseAmount * discountPct / 100
 * taxableAmount  = baseAmount - discountAmount
 * gstAmount      = taxableAmount * gstPct / 100
 * lineAmount     = taxableAmount + gstAmount
 */
function calculateLine(item) {
  const quantity = Number(item.quantity);
  const unitPrice = Number(item.unitPrice);
  const discountPct = Number(item.discountPct || 0);
  const gstPct = Number(item.gstPct || 0);

  const baseAmount = quantity * unitPrice;
  const discountAmount = (baseAmount * discountPct) / 100;
  const taxableAmount = baseAmount - discountAmount;
  const gstAmount = (taxableAmount * gstPct) / 100;
  const lineAmount = round2(taxableAmount + gstAmount);

  return {
    productId: Number(item.productId),
    quantity,
    unitPrice: round2(unitPrice),
    discountPct,
    gstPct,
    baseAmount: round2(baseAmount),
    taxableAmount: round2(taxableAmount),
    gstAmount: round2(gstAmount),
    lineAmount,
  };
}

/**
 * Calculate all lines + the quotation total.
 * The backend always uses this result; any total sent by the client is ignored.
 */
function calculateQuotation(items) {
  const calculated = items.map(calculateLine);
  const totalAmount = round2(
    calculated.reduce((sum, line) => sum + line.lineAmount, 0)
  );

  return {
    // Shape matches the QuotationItem model columns
    items: calculated.map((line) => ({
      productId: line.productId,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      discountPct: line.discountPct,
      gstPct: line.gstPct,
      lineAmount: line.lineAmount,
    })),
    breakdown: calculated,
    totalAmount,
  };
}

function availableQty(inventory) {
  return Number(inventory.physicalQty) - Number(inventory.reservedQty);
}

module.exports = { round2, calculateLine, calculateQuotation, availableQty };
