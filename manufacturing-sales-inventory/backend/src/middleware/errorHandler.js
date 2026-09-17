const AppError = require("../utils/AppError");

// 404 for unknown routes
function notFoundHandler(req, res, next) {
  next(new AppError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

// Centralized error handler: every error ends up here.
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal server error";

  // Prisma unique constraint violation -> 409 Conflict
  if (err.code === "P2002") {
    statusCode = 409;
    const target = Array.isArray(err.meta && err.meta.target)
      ? err.meta.target.join(", ")
      : "field";
    message = `Duplicate value for unique ${target}`;
  }

  // Prisma record not found / related record missing
  if (err.code === "P2025" || err.code === "P2003") {
    statusCode = 400;
    message = "Referenced record does not exist";
  }

  if (statusCode === 500) {
    console.error(err);
  }

  res.status(statusCode).json({ success: false, message });
}

module.exports = { notFoundHandler, errorHandler };
