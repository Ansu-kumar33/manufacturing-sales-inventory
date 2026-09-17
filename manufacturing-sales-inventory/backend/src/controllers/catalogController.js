const prisma = require("../prismaClient");
const { availableQty } = require("../services/calc");
const { parseId } = require("../utils/validate");
const AppError = require("../utils/AppError");

// GET /api/products
async function listProducts(req, res, next) {
  try {
    const products = await prisma.product.findMany({ orderBy: { code: "asc" } });
    res.json({ success: true, data: products });
  } catch (err) {
    next(err);
  }
}

// GET /api/inventory  -> includes calculated available quantity
async function listInventory(req, res, next) {
  try {
    const rows = await prisma.inventory.findMany({
      include: { product: true },
      orderBy: { productId: "asc" },
    });

    const data = rows.map((row) => ({
      id: row.id,
      productId: row.productId,
      productCode: row.product.code,
      productName: row.product.name,
      unit: row.product.unit,
      physicalQty: row.physicalQty,
      reservedQty: row.reservedQty,
      availableQty: availableQty(row),
    }));

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/inventory/:productId  (ADMIN only) - adjust physical stock
async function updateInventory(req, res, next) {
  try {
    const productId = parseId(req.params.productId, "productId");
    const physicalQty = Number(req.body.physicalQty);

    if (!Number.isInteger(physicalQty) || physicalQty < 0) {
      throw new AppError(400, "physicalQty must be an integer >= 0");
    }

    const inventory = await prisma.inventory.findUnique({ where: { productId } });
    if (!inventory) throw new AppError(404, "Inventory record not found");

    if (physicalQty < inventory.reservedQty) {
      throw new AppError(
        400,
        `physicalQty cannot be less than reserved quantity (${inventory.reservedQty})`
      );
    }

    const updated = await prisma.inventory.update({
      where: { productId },
      data: { physicalQty },
      include: { product: true },
    });

    res.json({
      success: true,
      data: {
        productId: updated.productId,
        productCode: updated.product.code,
        physicalQty: updated.physicalQty,
        reservedQty: updated.reservedQty,
        availableQty: availableQty(updated),
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { listProducts, listInventory, updateInventory };
