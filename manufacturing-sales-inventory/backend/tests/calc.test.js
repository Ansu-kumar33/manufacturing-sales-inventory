const { calculateLine, calculateQuotation, round2 } = require("../src/services/calc");

describe("Quotation calculation (unit tests)", () => {
  test("base amount = quantity x unit price when there is no discount or GST", () => {
    const line = calculateLine({
      productId: 1,
      quantity: 10,
      unitPrice: 100,
      discountPct: 0,
      gstPct: 0,
    });
    expect(line.baseAmount).toBe(1000);
    expect(line.lineAmount).toBe(1000);
  });

  test("discount and GST are applied correctly (1000 -> 900 -> 1062)", () => {
    const line = calculateLine({
      productId: 1,
      quantity: 10,
      unitPrice: 100,
      discountPct: 10,
      gstPct: 18,
    });
    expect(line.baseAmount).toBe(1000);
    expect(line.taxableAmount).toBe(900);
    expect(line.gstAmount).toBe(162);
    expect(line.lineAmount).toBe(1062);
  });

  test("quotation total is the sum of all line amounts", () => {
    const result = calculateQuotation([
      { productId: 1, quantity: 10, unitPrice: 100, discountPct: 10, gstPct: 18 },
      { productId: 2, quantity: 2, unitPrice: 500, discountPct: 0, gstPct: 18 },
    ]);
    // 1062 + 1180 = 2242
    expect(result.totalAmount).toBe(2242);
    expect(result.items).toHaveLength(2);
  });

  test("amounts are rounded to two decimals", () => {
    expect(round2(10.005)).toBe(10.01);
    const result = calculateQuotation([
      { productId: 1, quantity: 3, unitPrice: 82.5, discountPct: 2.5, gstPct: 18 },
    ]);
    expect(result.totalAmount).toBe(284.75);
  });
});
