const jwt = require("jsonwebtoken");
const AppError = require("../utils/AppError");

// Verifies the JWT sent in the Authorization header: "Bearer <token>"
function authenticate(req, res, next) {
  const header = req.headers.authorization || "";

  if (!header.startsWith("Bearer ")) {
    return next(new AppError(401, "Authentication token missing"));
  }

  const token = header.slice(7);

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "dev_secret");
    req.user = { id: payload.id, email: payload.email, role: payload.role };
    return next();
  } catch (err) {
    return next(new AppError(401, "Invalid or expired token"));
  }
}

// Role check. Usage: authorize("ADMIN") or authorize("ADMIN", "SALES_USER")
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError(401, "Not authenticated"));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(403, "You do not have permission to perform this action")
      );
    }
    return next();
  };
}

module.exports = { authenticate, authorize };
