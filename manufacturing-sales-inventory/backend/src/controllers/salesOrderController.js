const prisma = require("../prismaClient");
const AppError = require("../utils/AppError");
const { parseId, requireFields } = require("../utils/validate");
const { nextDispatchNo } = require("../services/numbering");

// GET /api/sales-orders
async function listSalesOrders(req, res, next) {
  try {
    const orders = await prisma.salesOrder.findMany({
      include: {
        customer: true,
        quotation: true,
        items: { include: { product: true } },
        dispatch: true,
      },
      orderBy: { id: "desc" },
    });
    res.json({ success: true, data: orders });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/sales-orders/:id/confirm   (ADMIN)
 *
 * Reserves inventory inside one transaction:
 * 1. start transaction
 * 2. lock the inventory rows (SELECT ... FOR UPDATE)
 * 3. available = physicalQty - reservedQty
 * 4. verify sufficient stock for every item
 * 5. increase reservedQty (physicalQty is NOT changed)
 * 6. set order status to CONFIRMED
 * 7. commit (any error rolls everything back)
 */
async function confirmSalesOrder(req, res, next) {
  try {
    const id = parseId(req.params.id, "sales order id");

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.salesOrder.findUnique({
        where: { id },
        include: { items: { include: { product: true } } },
      });
      if (!order) throw new AppError(404, "Sales order not found");

      if (order.status !== "PENDING") {
        throw new AppError(
          400,
          `Only a PENDING order can be confirmed. Current status: ${order.status}`
        );
      }

      const productIds = order.items.map((i) => i.productId);

      // Row level lock so two simultaneous confirmations cannot over-reserve stock.
      await tx.$queryRawUnsafe(
        'SELECT id FROM "Inventory" WHERE "productId" = ANY($1::int[]) FOR UPDATE',
        productIds
      );

      // Check stock for every line before changing anything.
      for (const item of order.items) {
        const inv = await tx.inventory.findUnique({
          where: { productId: item.productId },
        });
        if (!inv) {
          throw new AppError(400, `No inventory record for product ${item.product.code}`);
        }

        const available = inv.physicalQty - inv.reservedQty;
        if (available < item.quantity) {
          throw new AppError(
            400,
            `Insufficient stock for ${item.product.code}: available ${available}, required ${item.quantity}`
          );
        }
      }

      // Reserve. physicalQty stays the same.
      for (const item of order.items) {
        await tx.inventory.update({
          where: { productId: item.productId },
          data: { reservedQty: { increment: item.quantity } },
        });
      }

      return tx.salesOrder.update({
        where: { id },
        data: { status: "CONFIRMED" },
        include: {
          customer: true,
          items: { include: { product: true } },
        },
      });
    });

    res.json({ success: true, message: "Order confirmed and stock reserved", data: result });
  } catch (err) {
    next(err);
  }
}

// POST /api/sales-orders/:id/cancel   (ADMIN)
async function cancelSalesOrder(req, res, next) {
  try {
    const id = parseId(req.params.id, "sales order id");

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.salesOrder.findUnique({
        where: { id },
        include: { items: true },
      });
      if (!order) throw new AppError(404, "Sales order not found");

      if (order.status === "DISPATCHED") {
        throw new AppError(400, "A dispatched order cannot be cancelled");
      }
      if (order.status === "CANCELLED") {
        throw new AppError(409, "Order is already cancelled");
      }

      // Release the reservation if stock was already reserved.
      if (order.status === "CONFIRMED") {
        for (const item of order.items) {
          await tx.inventory.update({
            where: { productId: item.productId },
            data: { reservedQty: { decrement: item.quantity } },
          });
        }
      }

      return tx.salesOrder.update({
        where: { id },
        data: { status: "CANCELLED" },
        include: { customer: true, items: { include: { product: true } } },
      });
    });

    res.json({ success: true, message: "Order cancelled", data: result });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/sales-orders/:id/dispatch   (ADMIN)
 *
 * Only a CONFIRMED order can be dispatched.
 * Physical and reserved quantities both decrease, inside one transaction.
 */
async function dispatchSalesOrder(req, res, next) {
  try {
    const id = parseId(req.params.id, "sales order id");
    requireFields(req.body, ["vehicleNo", "driverName"]);
    const vehicleNo = String(req.body.vehicleNo).trim();
    const driverName = String(req.body.driverName).trim();

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.salesOrder.findUnique({
        where: { id },
        include: { items: { include: { product: true } }, dispatch: true },
      });
      if (!order) throw new AppError(404, "Sales order not found");

      if (order.dispatch) {
        throw new AppError(409, `Order already dispatched (${order.dispatch.dispatchNo})`);
      }
      if (order.status !== "CONFIRMED") {
        throw new AppError(
          400,
          `Only a CONFIRMED order can be dispatched. Current status: ${order.status}`
        );
      }

      const productIds = order.items.map((i) => i.productId);
      await tx.$queryRawUnsafe(
        'SELECT id FROM "Inventory" WHERE "productId" = ANY($1::int[]) FOR UPDATE',
        productIds
      );

      // Validate before changing anything: never allow negative inventory.
      for (const item of order.items) {
        const inv = await tx.inventory.findUnique({
          where: { productId: item.productId },
        });
        if (!inv) {
          throw new AppError(400, `No inventory record for product ${item.product.code}`);
        }
        if (item.quantity > inv.reservedQty) {
          throw new AppError(
            400,
            `Cannot dispatch more than reserved for ${item.product.code}: reserved ${inv.reservedQty}, requested ${item.quantity}`
          );
        }
        if (item.quantity > inv.physicalQty) {
          throw new AppError(
            400,
            `Insufficient physical stock for ${item.product.code}`
          );
        }
      }

      // Dispatch: reduce both physical and reserved.
      for (const item of order.items) {
        await tx.inventory.update({
          where: { productId: item.productId },
          data: {
            physicalQty: { decrement: item.quantity },
            reservedQty: { decrement: item.quantity },
          },
        });
      }

      const dispatchNo = await nextDispatchNo(tx);

      const dispatch = await tx.dispatch.create({
        data: {
          dispatchNo,
          salesOrderId: order.id,
          vehicleNo,
          driverName,
          items: {
            create: order.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
            })),
          },
        },
        include: { items: true },
      });

      await tx.salesOrder.update({
        where: { id },
        data: { status: "DISPATCHED" },
      });

      return dispatch;
    });

    res.status(201).json({ success: true, message: "Order dispatched", data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listSalesOrders,
  confirmSalesOrder,
  cancelSalesOrder,
  dispatchSalesOrder,
};
