const prisma = require("../prismaClient");
const AppError = require("../utils/AppError");
const { requireFields, parseId, parseQuantity } = require("../utils/validate");
const { nextEnquiryNo } = require("../services/numbering");

// POST /api/enquiries
async function createEnquiry(req, res, next) {
  try {
    requireFields(req.body, ["customerId"]);
    const customerId = parseId(req.body.customerId, "customerId");

    const items = req.body.items;
    if (!Array.isArray(items) || items.length === 0) {
      throw new AppError(400, "At least one enquiry item is required");
    }

    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new AppError(404, "Customer not found");

    // validate every item and make sure the product exists
    const cleanItems = [];
    for (const item of items) {
      const productId = parseId(item.productId, "productId");
      const quantity = parseQuantity(item.quantity);

      const product = await prisma.product.findUnique({ where: { id: productId } });
      if (!product) throw new AppError(404, `Product ${productId} not found`);

      cleanItems.push({ productId, quantity });
    }

    const enquiryNo = await nextEnquiryNo(prisma);

    const enquiry = await prisma.enquiry.create({
      data: {
        enquiryNo,
        customerId,
        requiredDate: req.body.requiredDate ? new Date(req.body.requiredDate) : null,
        notes: req.body.notes ? String(req.body.notes) : null,
        status: "NEW",
        items: { create: cleanItems },
      },
      include: { customer: true, items: { include: { product: true } } },
    });

    res.status(201).json({ success: true, data: enquiry });
  } catch (err) {
    next(err);
  }
}

// GET /api/enquiries
async function listEnquiries(req, res, next) {
  try {
    const enquiries = await prisma.enquiry.findMany({
      include: {
        customer: true,
        items: { include: { product: true } },
      },
      orderBy: { id: "desc" },
    });
    res.json({ success: true, data: enquiries });
  } catch (err) {
    next(err);
  }
}

module.exports = { createEnquiry, listEnquiries };
