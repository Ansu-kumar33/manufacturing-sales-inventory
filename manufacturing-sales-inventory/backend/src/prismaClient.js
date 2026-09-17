// Single shared Prisma client instance for the whole backend.
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

module.exports = prisma;
