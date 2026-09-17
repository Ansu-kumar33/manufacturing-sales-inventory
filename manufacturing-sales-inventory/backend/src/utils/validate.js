const AppError = require("./AppError");

// Throws 400 when a required field is missing/empty.
function requireFields(body, fields) {
  const missing = fields.filter((f) => {
    const value = body[f];
    return value === undefined || value === null || String(value).trim() === "";
  });

  if (missing.length > 0) {
    throw new AppError(400, `Missing required field(s): ${missing.join(", ")}`);
  }
}

// Validates and returns a positive integer id (used for route params).
function parseId(value, label = "id") {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(400, `Invalid ${label}`);
  }
  return id;
}

// Validates a positive integer quantity.
function parseQuantity(value, label = "quantity") {
  const qty = Number(value);
  if (!Number.isInteger(qty) || qty <= 0) {
    throw new AppError(400, `${label} must be a positive integer`);
  }
  return qty;
}

// Validates a number inside a range (used for price, discount %, GST %).
function parseNumberInRange(value, label, min, max) {
  const num = Number(value);
  if (Number.isNaN(num)) {
    throw new AppError(400, `${label} must be a number`);
  }
  if (num < min || num > max) {
    throw new AppError(400, `${label} must be between ${min} and ${max}`);
  }
  return num;
}

// Validates a simple email format.
function parseEmail(value) {
  const email = String(value).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AppError(400, "Invalid email format");
  }
  return email;
}

module.exports = {
  requireFields,
  parseId,
  parseQuantity,
  parseNumberInRange,
  parseEmail,
};
