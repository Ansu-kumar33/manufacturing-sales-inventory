const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../prismaClient");
const AppError = require("../utils/AppError");
const { requireFields } = require("../utils/validate");

// POST /api/auth/login
async function login(req, res, next) {
  try {
    requireFields(req.body, ["email", "password"]);
    const email = String(req.body.email).trim().toLowerCase();
    const { password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new AppError(401, "Invalid email or password");
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      throw new AppError(401, "Invalid email or password");
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || "dev_secret",
      { expiresIn: "8h" }
    );

    res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/auth/me
async function me(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, role: true },
    });
    if (!user) throw new AppError(404, "User not found");
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
}

module.exports = { login, me };
