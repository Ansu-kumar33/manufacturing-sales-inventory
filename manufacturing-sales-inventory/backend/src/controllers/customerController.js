const prisma = require("../prismaClient");
const { requireFields, parseEmail } = require("../utils/validate");
const AppError = require("../utils/AppError");

// POST /api/customers
async function createCustomer(req, res, next) {
  try {
    requireFields(req.body, ["company", "contact", "mobile", "email", "city"]);

    const mobile = String(req.body.mobile).trim();
    if (!/^[0-9]{10}$/.test(mobile)) {
      throw new AppError(400, "Mobile must be a 10 digit number");
    }

    const customer = await prisma.customer.create({
      data: {
        company: String(req.body.company).trim(),
        contact: String(req.body.contact).trim(),
        mobile,
        email: parseEmail(req.body.email),
        city: String(req.body.city).trim(),
      },
    });

    res.status(201).json({ success: true, data: customer });
  } catch (err) {
    next(err);
  }
}

// GET /api/customers
async function listCustomers(req, res, next) {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: { id: "desc" },
    });
    res.json({ success: true, data: customers });
  } catch (err) {
    next(err);
  }
}

module.exports = { createCustomer, listCustomers };
