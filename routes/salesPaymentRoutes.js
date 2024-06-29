// Import required modules and configuration
const express = require("express");
const {
  getAllSalesPayments,
  getSalesPayment,
  createSalesPayment,
  updateSalesPayment,
  deleteSalesPayment,
  createSalesReturnPayment,
  updateSalesReturnPayment,
  deleteSalesReturnPayment,
  getAllSalesPaymentReturns,
} = require("../controllers/salesPaymentController.js");

const router = express.Router();

router.get("/get_sales_return_payments", getAllSalesPaymentReturns);
router.get("/", getAllSalesPayments);
router.get("/:id", getSalesPayment);
router.post("/create_sales_return_payment", createSalesReturnPayment);
router.post("/", createSalesPayment);
router.put("/:id/update_sales_return_payment", updateSalesReturnPayment);
router.put("/:id", updateSalesPayment);
router.post("/delete_sales_return_payment", deleteSalesReturnPayment);
router.post("/delete_sales_payment", deleteSalesPayment);

module.exports = router;
