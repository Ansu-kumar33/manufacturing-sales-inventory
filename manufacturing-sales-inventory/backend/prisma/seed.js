require("dotenv").config();

const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");
const { calculateQuotation } = require("../src/services/calc");

const prisma = new PrismaClient();

async function clearDatabase() {
  // Delete in FK-safe order
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

async function main() {
  console.log("Clearing old data...");
  await clearDatabase();

  // ---------- Users ----------
  console.log("Creating users...");
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

  // ---------- Customers ----------
  console.log("Creating customers...");
  const customerData = [
    {
      company: "Sharma Engineering Works",
      contact: "Rakesh Sharma",
      mobile: "9876543210",
      email: "rakesh@sharmaengg.com",
      city: "Pune",
    },
    {
      company: "Bharat Steel Industries",
      contact: "Priya Nair",
      mobile: "9823456710",
      email: "priya@bharatsteel.com",
      city: "Jamshedpur",
    },
    {
      company: "Ganga Pumps Pvt Ltd",
      contact: "Suresh Iyer",
      mobile: "9945612378",
      email: "suresh@gangapumps.com",
      city: "Coimbatore",
    },
    {
      company: "Kumar Auto Components",
      contact: "Anil Kumar",
      mobile: "9812309876",
      email: "anil@kumarauto.com",
      city: "Gurugram",
    },
  ];

  const customers = [];
  for (const c of customerData) {
    customers.push(await prisma.customer.create({ data: c }));
  }

  // ---------- Products + Inventory ----------
  console.log("Creating products and inventory...");
  const productData = [
    { code: "PRD-001", name: "MS Steel Plate 10mm", category: "Raw Material", unit: "KG", basePrice: 82.5, physicalQty: 1000 },
    { code: "PRD-002", name: "Hydraulic Cylinder 50mm", category: "Hydraulics", unit: "NOS", basePrice: 8750, physicalQty: 100 },
    { code: "PRD-003", name: "Ball Bearing 6205", category: "Bearings", unit: "NOS", basePrice: 245, physicalQty: 500 },
    { code: "PRD-004", name: "Industrial Gearbox 1:20", category: "Power Transmission", unit: "NOS", basePrice: 32500, physicalQty: 40 },
    { code: "PRD-005", name: "Three Phase Motor 5HP", category: "Electrical", unit: "NOS", basePrice: 18400, physicalQty: 60 },
    { code: "PRD-006", name: "Conveyor Belt 600mm", category: "Material Handling", unit: "MTR", basePrice: 1150, physicalQty: 300 },
    { code: "PRD-007", name: "Welding Electrode 3.15mm", category: "Consumables", unit: "BOX", basePrice: 890, physicalQty: 250 },
  ];

  const products = [];
  for (const p of productData) {
    const product = await prisma.product.create({
      data: {
        code: p.code,
        name: p.name,
        category: p.category,
        unit: p.unit,
        basePrice: p.basePrice,
        inventory: { create: { physicalQty: p.physicalQty, reservedQty: 0 } },
      },
    });
    products.push(product);
  }

  const byCode = (code) => products.find((p) => p.code === code);

  // ---------- Enquiries ----------
  console.log("Creating enquiries...");
  const enquiry1 = await prisma.enquiry.create({
    data: {
      enquiryNo: "ENQ-1001",
      customerId: customers[0].id,
      requiredDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      notes: "Required for new production line",
      status: "QUOTED",
      items: {
        create: [
          { productId: byCode("PRD-001").id, quantity: 200 },
          { productId: byCode("PRD-003").id, quantity: 50 },
        ],
      },
    },
  });

  const enquiry2 = await prisma.enquiry.create({
    data: {
      enquiryNo: "ENQ-1002",
      customerId: customers[1].id,
      requiredDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      notes: "Annual maintenance requirement",
      status: "NEW",
      items: {
        create: [{ productId: byCode("PRD-005").id, quantity: 5 }],
      },
    },
  });

  await prisma.enquiry.create({
    data: {
      enquiryNo: "ENQ-1003",
      customerId: customers[2].id,
      requiredDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
      notes: "Urgent requirement for pump assembly",
      status: "NEW",
      items: {
        create: [
          { productId: byCode("PRD-002").id, quantity: 4 },
          { productId: byCode("PRD-006").id, quantity: 25 },
        ],
      },
    },
  });

  // ---------- Quotations (totals calculated by the same backend service) ----------
  console.log("Creating quotations...");

  const q1Items = [
    { productId: byCode("PRD-001").id, quantity: 200, unitPrice: 82.5, discountPct: 5, gstPct: 18 },
    { productId: byCode("PRD-003").id, quantity: 50, unitPrice: 245, discountPct: 0, gstPct: 18 },
  ];
  const q1 = calculateQuotation(q1Items);

  await prisma.quotation.create({
    data: {
      quotationNo: "QT-2001",
      enquiryId: enquiry1.id,
      customerId: customers[0].id,
      status: "SENT",
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      totalAmount: q1.totalAmount,
      items: { create: q1.items },
    },
  });

  const q2Items = [
    { productId: byCode("PRD-005").id, quantity: 5, unitPrice: 18400, discountPct: 10, gstPct: 18 },
  ];
  const q2 = calculateQuotation(q2Items);

  await prisma.quotation.create({
    data: {
      quotationNo: "QT-2002",
      enquiryId: enquiry2.id,
      customerId: customers[1].id,
      status: "ACCEPTED",
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      totalAmount: q2.totalAmount,
      items: { create: q2.items },
    },
  });

  console.log("\nSeed completed.");
  console.log("  ADMIN      -> admin@demo.com / Admin@123");
  console.log("  SALES_USER -> sales@demo.com / Sales@123");
  console.log("  QT-2002 is ACCEPTED and ready to convert into a Sales Order.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
