require("dotenv").config();

const express = require("express");
const cors = require("cors");

const routes = require("./routes");
const { notFoundHandler, errorHandler } = require("./middleware/errorHandler");

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173" }));
app.use(express.json());

app.use("/api", routes);

// 404 + centralized error handling (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
