const express = require("express");
const { authenticate, authorize } = require("../middleware/auth");

const auth = require("../controllers/authController");
const customers = require("../controllers/customerController");
const catalog = require("../controllers/catalogController");
const enquiries = require("../controllers/enquiryController");
const quotations = require("../controllers/quotationController");
const salesOrders = require("../controllers/salesOrderController");

const router = express.Router();

const ADMIN = "ADMIN";
const SALES = "SALES_USER";

// Health check
router.get("/health", (req, res) => res.json({ success: true, status: "ok" }));

// Auth
router.post("/auth/login", auth.login);
router.get("/auth/me", authenticate, auth.me);

// Customers - both roles can view, both can create
router.post("/customers", authenticate, authorize(ADMIN, SALES), customers.createCustomer);
router.get("/customers", authenticate, authorize(ADMIN, SALES), customers.listCustomers);

// Products & inventory
router.get("/products", authenticate, authorize(ADMIN, SALES), catalog.listProducts);
router.get("/inventory", authenticate, authorize(ADMIN, SALES), catalog.listInventory);
router.patch("/inventory/:productId", authenticate, authorize(ADMIN), catalog.updateInventory);

// Enquiries - only SALES_USER creates
router.post("/enquiries", authenticate, authorize(SALES), enquiries.createEnquiry);
router.get("/enquiries", authenticate, authorize(ADMIN, SALES), enquiries.listEnquiries);

// Quotations - only SALES_USER creates / changes status / converts
router.post("/quotations", authenticate, authorize(SALES), quotations.createQuotation);
router.get("/quotations", authenticate, authorize(ADMIN, SALES), quotations.listQuotations);
router.patch("/quotations/:id/status", authenticate, authorize(SALES), quotations.updateQuotationStatus);
router.post("/quotations/:id/convert", authenticate, authorize(SALES), quotations.convertToSalesOrder);

// Sales orders - only ADMIN confirms / cancels / dispatches
router.get("/sales-orders", authenticate, authorize(ADMIN, SALES), salesOrders.listSalesOrders);
router.post("/sales-orders/:id/confirm", authenticate, authorize(ADMIN), salesOrders.confirmSalesOrder);
router.post("/sales-orders/:id/cancel", authenticate, authorize(ADMIN), salesOrders.cancelSalesOrder);
router.post("/sales-orders/:id/dispatch", authenticate, authorize(ADMIN), salesOrders.dispatchSalesOrder);

module.exports = router;
