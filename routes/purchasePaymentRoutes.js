// Import required modules and configuration
const express = require("express");
const {
  getAllPurchasePayments,
  getPurchasePayment,
  createPurchasePayment,
  updatePurchasePayment,
  deletePurchasePayment,
  createPurchaseReturnPayment,
  getAllPurchasePaymentReturns,
  updatePurchaseReturnPayment,deletePurchaseReturnPayment
} = require("../controllers/purchasePaymentController.js");

const router = express.Router();

router.get("/get_purchase_return_payments", getAllPurchasePaymentReturns);
router.get("/", getAllPurchasePayments);
router.get("/:id", getPurchasePayment);
router.post("/create_purchase_return_payment", createPurchaseReturnPayment);
router.post("/", createPurchasePayment);
router.put("/:id/update_purcahse_return", updatePurchaseReturnPayment);
router.put("/:id", updatePurchasePayment);
router.delete("/:id/delete_purcahse_return", deletePurchaseReturnPayment);
router.post("/delete_purchase_payment", deletePurchasePayment);

module.exports = router;
