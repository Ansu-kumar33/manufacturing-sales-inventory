/**
 * API tests (Jest + Supertest).
 * These run against the real database, so make sure DATABASE_URL points to your
 * local PostgreSQL database and `npx prisma migrate dev` has been run.
 *
 * The suite clears the tables and creates its own small data set.
 */
require("dotenv").config();

const request = require("supertest");
const bcrypt = require("bcryptjs");

const app = require("../src/app");
const prisma = require("../src/prismaClient");

let adminToken;
let salesToken;
let customerId;
let productId;

async function clearDatabase() {
  await prisma.dispatchItem.deleteMany();
  await prisma.dispatch.deleteMany();
  await prisma.salesOrderItem.deleteMany();
  await prisma.salesOrder.deleteMany();
  await prisma.quotationItem.deleteMany();
  await prisma.quotation.deleteMany();
  await prisma.enquiryItem.deleteMany();
  await prisma.enquiry.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.product.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();
}

// Helper: create a quotation as SALES_USER and return it
async function createQuotation(quantity = 10) {
  const res = await request(app)
    .post("/api/quotations")
    .set("Authorization", `Bearer ${salesToken}`)
    .send({
      customerId,
      items: [
        { productId, quantity, unitPrice: 100, discountPct: 10, gstPct: 18 },
      ],
    });
  return res;
}

async function setStatus(quotationId, status) {
  return request(app)
    .patch(`/api/quotations/${quotationId}/status`)
    .set("Authorization", `Bearer ${salesToken}`)
    .send({ status });
}

beforeAll(async () => {
  await clearDatabase();

  await prisma.user.createMany({
    data: [
      {
        name: "Admin User",
        email: "admin@demo.com",
        passwordHash: await bcrypt.hash("Admin@123", 10),
        role: "ADMIN",
      },
      {
        name: "Sales User",
        email: "sales@demo.com",
        passwordHash: await bcrypt.hash("Sales@123", 10),
        role: "SALES_USER",
      },
    ],
  });

  const customer = await prisma.customer.create({
    data: {
      company: "Test Industries",
      contact: "Test Contact",
      mobile: "9999999999",
      email: "test@industries.com",
      city: "Pune",
    },
  });
  customerId = customer.id;

  // Physical = 100, Reserved = 30  ->  Available = 70 (matches the case study example)
  const product = await prisma.product.create({
    data: {
      code: "TST-001",
      name: "Test Product",
      category: "Test",
      unit: "NOS",
      basePrice: 100,
      inventory: { create: { physicalQty: 100, reservedQty: 30 } },
    },
  });
  productId = product.id;

  const adminLogin = await request(app)
    .post("/api/auth/login")
    .send({ email: "admin@demo.com", password: "Admin@123" });
  adminToken = adminLogin.body.token;

  const salesLogin = await request(app)
    .post("/api/auth/login")
    .send({ email: "sales@demo.com", password: "Sales@123" });
  salesToken = salesLogin.body.token;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Authentication", () => {
  test("login succeeds with correct credentials and returns a JWT", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@demo.com", password: "Admin@123" });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe("ADMIN");
  });

  test("login fails with a wrong password (401)", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@demo.com", password: "WrongPassword" });

    expect(res.status).toBe(401);
  });

  test("protected route without a token returns 401", async () => {
    const res = await request(app).get("/api/customers");
    expect(res.status).toBe(401);
  });
});

describe("Quotation totals are calculated by the backend", () => {
  test("client supplied total is ignored (10 x 100, -10%, +18% GST = 1062)", async () => {
    const res = await request(app)
      .post("/api/quotations")
      .set("Authorization", `Bearer ${salesToken}`)
      .send({
        customerId,
        totalAmount: 1, // fake total sent by the client
        items: [
          { productId, quantity: 10, unitPrice: 100, discountPct: 10, gstPct: 18 },
        ],
      });

    expect(res.status).toBe(201);
    expect(Number(res.body.data.totalAmount)).toBe(1062);
    expect(Number(res.body.data.items[0].lineAmount)).toBe(1062);
  });
});

describe("Sales order conversion rules", () => {
  test("a DRAFT quotation cannot become a Sales Order (400)", async () => {
    const quotation = await createQuotation();
    const res = await request(app)
      .post(`/api/quotations/${quotation.body.data.id}/convert`)
      .set("Authorization", `Bearer ${salesToken}`);

    expect(res.status).toBe(400);
  });

  test("a REJECTED quotation cannot become a Sales Order (400)", async () => {
    const quotation = await createQuotation();
    await setStatus(quotation.body.data.id, "REJECTED");

    const res = await request(app)
      .post(`/api/quotations/${quotation.body.data.id}/convert`)
      .set("Authorization", `Bearer ${salesToken}`);

    expect(res.status).toBe(400);
  });

  test("an ACCEPTED quotation converts once; the second attempt returns 409", async () => {
    const quotation = await createQuotation();
    const id = quotation.body.data.id;
    await setStatus(id, "SENT");
    await setStatus(id, "ACCEPTED");

    const first = await request(app)
      .post(`/api/quotations/${id}/convert`)
      .set("Authorization", `Bearer ${salesToken}`);
    expect(first.status).toBe(201);
    expect(first.body.data.status).toBe("PENDING");

    const second = await request(app)
      .post(`/api/quotations/${id}/convert`)
      .set("Authorization", `Bearer ${salesToken}`);
    expect(second.status).toBe(409);
  });
});

describe("Inventory reservation and dispatch", () => {
  test("insufficient stock is rejected and nothing is changed (available 70, order 80)", async () => {
    const quotation = await createQuotation(80);
    const id = quotation.body.data.id;
    await setStatus(id, "SENT");
    await setStatus(id, "ACCEPTED");

    const order = await request(app)
      .post(`/api/quotations/${id}/convert`)
      .set("Authorization", `Bearer ${salesToken}`);

    const before = await prisma.inventory.findUnique({ where: { productId } });

    const confirm = await request(app)
      .post(`/api/sales-orders/${order.body.data.id}/confirm`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(confirm.status).toBe(400);
    expect(confirm.body.message).toMatch(/Insufficient stock/i);

    const after = await prisma.inventory.findUnique({ where: { productId } });
    expect(after.physicalQty).toBe(before.physicalQty);
    expect(after.reservedQty).toBe(before.reservedQty);

    const unchanged = await prisma.salesOrder.findUnique({
      where: { id: order.body.data.id },
    });
    expect(unchanged.status).toBe("PENDING");
  });

  test("confirm reserves stock without reducing physical, dispatch reduces both", async () => {
    const quotation = await createQuotation(40);
    const id = quotation.body.data.id;
    await setStatus(id, "SENT");
    await setStatus(id, "ACCEPTED");

    const order = await request(app)
      .post(`/api/quotations/${id}/convert`)
      .set("Authorization", `Bearer ${salesToken}`);
    const orderId = order.body.data.id;

    const before = await prisma.inventory.findUnique({ where: { productId } });

    const confirm = await request(app)
      .post(`/api/sales-orders/${orderId}/confirm`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(confirm.status).toBe(200);

    const reserved = await prisma.inventory.findUnique({ where: { productId } });
    expect(reserved.physicalQty).toBe(before.physicalQty); // physical unchanged
    expect(reserved.reservedQty).toBe(before.reservedQty + 40);

    const dispatch = await request(app)
      .post(`/api/sales-orders/${orderId}/dispatch`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ vehicleNo: "MH12AB1234", driverName: "Ramesh" });
    expect(dispatch.status).toBe(201);

    const afterDispatch = await prisma.inventory.findUnique({ where: { productId } });
    expect(afterDispatch.physicalQty).toBe(before.physicalQty - 40);
    expect(afterDispatch.reservedQty).toBe(before.reservedQty);

    // duplicate dispatch is blocked
    const again = await request(app)
      .post(`/api/sales-orders/${orderId}/dispatch`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ vehicleNo: "MH12AB1234", driverName: "Ramesh" });
    expect(again.status).toBe(409);
  });

  test("a PENDING (unconfirmed) order cannot be dispatched (400)", async () => {
    const quotation = await createQuotation(5);
    const id = quotation.body.data.id;
    await setStatus(id, "SENT");
    await setStatus(id, "ACCEPTED");

    const order = await request(app)
      .post(`/api/quotations/${id}/convert`)
      .set("Authorization", `Bearer ${salesToken}`);

    const res = await request(app)
      .post(`/api/sales-orders/${order.body.data.id}/dispatch`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ vehicleNo: "MH12AB1234", driverName: "Ramesh" });

    expect(res.status).toBe(400);
  });
});

describe("Role based access control (enforced in the backend)", () => {
  test("SALES_USER cannot confirm a sales order (403)", async () => {
    const quotation = await createQuotation(5);
    const id = quotation.body.data.id;
    await setStatus(id, "SENT");
    await setStatus(id, "ACCEPTED");

    const order = await request(app)
      .post(`/api/quotations/${id}/convert`)
      .set("Authorization", `Bearer ${salesToken}`);

    const res = await request(app)
      .post(`/api/sales-orders/${order.body.data.id}/confirm`)
      .set("Authorization", `Bearer ${salesToken}`);

    expect(res.status).toBe(403);
  });

  test("SALES_USER cannot update inventory (403)", async () => {
    const res = await request(app)
      .patch(`/api/inventory/${productId}`)
      .set("Authorization", `Bearer ${salesToken}`)
      .send({ physicalQty: 999 });

    expect(res.status).toBe(403);
  });

  test("ADMIN cannot create a quotation (403)", async () => {
    const res = await request(app)
      .post("/api/quotations")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ customerId, items: [{ productId, quantity: 1 }] });

    expect(res.status).toBe(403);
  });
});

describe("Validation and error handling", () => {
  test("creating a customer without required fields returns 400", async () => {
    const res = await request(app)
      .post("/api/customers")
      .set("Authorization", `Bearer ${salesToken}`)
      .send({ company: "Only Company" });

    expect(res.status).toBe(400);
  });

  test("a quotation with no items returns 400", async () => {
    const res = await request(app)
      .post("/api/quotations")
      .set("Authorization", `Bearer ${salesToken}`)
      .send({ customerId, items: [] });

    expect(res.status).toBe(400);
  });

  test("an unknown route returns 404", async () => {
    const res = await request(app).get("/api/does-not-exist");
    expect(res.status).toBe(404);
  });
});
