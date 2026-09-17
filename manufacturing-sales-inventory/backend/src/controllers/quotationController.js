const prisma = require("../prismaClient");
const AppError = require("../utils/AppError");
const {
  requireFields,
  parseId,
  parseQuantity,
  parseNumberInRange,
} = require("../utils/validate");
const { calculateQuotation } = require("../services/calc");
const { nextQuotationNo, nextOrderNo } = require("../services/numbering");

// Allowed quotation status transitions
const STATUS_FLOW = {
  DRAFT: ["SENT", "REJECTED"],
  SENT: ["ACCEPTED", "REJECTED"],
  ACCEPTED: [],
  REJECTED: [],
};

// POST /api/quotations
async function createQuotation(req, res, next) {
  try {
    requireFields(req.body, ["customerId"]);
    const customerId = parseId(req.body.customerId, "customerId");

    const items = req.body.items;
    if (!Array.isArray(items) || items.length === 0) {
      throw new AppError(400, "At least one quotation item is required");
    }

    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new AppError(404, "Customer not found");

    let enquiryId = null;
    if (req.body.enquiryId !== undefined && req.body.enquiryId !== null && req.body.enquiryId !== "") {
      enquiryId = parseId(req.body.enquiryId, "enquiryId");
      const enquiry = await prisma.enquiry.findUnique({ where: { id: enquiryId } });
      if (!enquiry) throw new AppError(404, "Enquiry not found");
      if (enquiry.customerId !== customerId) {
        throw new AppError(400, "Enquiry does not belong to the selected customer");
      }
    }

    // Validate items. Unit price falls back to the product base price.
    const validated = [];
    for (const item of items) {
      const productId = parseId(item.productId, "productId");
      const quantity = parseQuantity(item.quantity);

      const product = await prisma.product.findUnique({ where: { id: productId } });
      if (!product) throw new AppError(404, `Product ${productId} not found`);

      const unitPrice =
        item.unitPrice === undefined || item.unitPrice === null || item.unitPrice === ""
          ? Number(product.basePrice)
          : parseNumberInRange(item.unitPrice, "unitPrice", 0, 100000000);

      const discountPct = parseNumberInRange(item.discountPct || 0, "discountPct", 0, 100);
      const gstPct =
        item.gstPct === undefined || item.gstPct === null || item.gstPct === ""
          ? 18
          : parseNumberInRange(item.gstPct, "gstPct", 0, 100);

      validated.push({ productId, quantity, unitPrice, discountPct, gstPct });
    }

    // Backend calculates the totals. Any totalAmount sent by the client is ignored.
    const { items: calculatedItems, totalAmount } = calculateQuotation(validated);

    const quotationNo = await nextQuotationNo(prisma);

    const quotation = await prisma.quotation.create({
      data: {
        quotationNo,
        customerId,
        enquiryId,
        status: "DRAFT",
        validUntil: req.body.validUntil ? new Date(req.body.validUntil) : null,
        totalAmount,
        items: { create: calculatedItems },
      },
      include: {
        customer: true,
        enquiry: true,
        items: { include: { product: true } },
      },
    });

    // Mark the linked enquiry as QUOTED
    if (enquiryId) {
      await prisma.enquiry.update({
        where: { id: enquiryId },
        data: { status: "QUOTED" },
      });
    }

    res.status(201).json({ success: true, data: quotation });
  } catch (err) {
    next(err);
  }
}

// GET /api/quotations
async function listQuotations(req, res, next) {
  try {
    const quotations = await prisma.quotation.findMany({
      include: {
        customer: true,
        enquiry: true,
        items: { include: { product: true } },
        salesOrder: true,
      },
      orderBy: { id: "desc" },
    });
    res.json({ success: true, data: quotations });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/quotations/:id/status
async function updateQuotationStatus(req, res, next) {
  try {
    const id = parseId(req.params.id, "quotation id");
    requireFields(req.body, ["status"]);
    const status = String(req.body.status).toUpperCase();

    if (!Object.keys(STATUS_FLOW).includes(status)) {
      throw new AppError(400, "Invalid quotation status");
    }

    const quotation = await prisma.quotation.findUnique({ where: { id } });
    if (!quotation) throw new AppError(404, "Quotation not found");

    if (!STATUS_FLOW[quotation.status].includes(status)) {
      throw new AppError(
        400,
        `Cannot change quotation status from ${quotation.status} to ${status}`
      );
    }

    const updated = await prisma.quotation.update({
      where: { id },
      data: { status },
      include: { customer: true, items: { include: { product: true } } },
    });

    // Keep the enquiry status in sync
    if (quotation.enquiryId) {
      if (status === "ACCEPTED") {
        await prisma.enquiry.update({
          where: { id: quotation.enquiryId },
          data: { status: "WON" },
        });
      } else if (status === "REJECTED") {
        await prisma.enquiry.update({
          where: { id: quotation.enquiryId },
          data: { status: "LOST" },
        });
      }
    }

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

// POST /api/quotations/:id/convert  -> creates a Sales Order
async function convertToSalesOrder(req, res, next) {
  try {
    const id = parseId(req.params.id, "quotation id");

    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: { items: true, salesOrder: true },
    });
    if (!quotation) throw new AppError(404, "Quotation not found");

    // Business rule: only an ACCEPTED quotation can become a Sales Order
    if (quotation.status !== "ACCEPTED") {
      throw new AppError(
        400,
        `Only an ACCEPTED quotation can be converted. Current status: ${quotation.status}`
      );
    }

    // Business rule: no duplicate conversion
    if (quotation.salesOrder) {
      throw new AppError(
        409,
        `Quotation already converted to sales order ${quotation.salesOrder.orderNo}`
      );
    }

    const orderNo = await nextOrderNo(prisma);

    const salesOrder = await prisma.salesOrder.create({
      data: {
        orderNo,
        customerId: quotation.customerId,
        quotationId: quotation.id,
        totalAmount: quotation.totalAmount,
        status: "PENDING",
        items: {
          create: quotation.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineAmount: item.lineAmount,
          })),
        },
      },
      include: {
        customer: true,
        quotation: true,
        items: { include: { product: true } },
      },
    });

    res.status(201).json({ success: true, data: salesOrder });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createQuotation,
  listQuotations,
  updateQuotationStatus,
  convertToSalesOrder,
};
