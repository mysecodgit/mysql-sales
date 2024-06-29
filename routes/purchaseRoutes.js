const express = require("express");
const {
  getAllPurchases,
  getPurchase,
  createPurchase,
  updatePurchase,
  cancelPurchase,
  deletePurchase,
  getVendorPurchases,
  getRemainingBalace,
  createPurchaseReturn,
  getAllPurchaseReturns,
  getVendorPurchaseReturns,
  cancelPurchaseReturn,
} = require("../controllers/purchaseController.js");

const router = express.Router();

router.get("/returns", getAllPurchaseReturns);
router.post("/cancel_purchase", cancelPurchase);
router.get("/:id/cancel_purchase_return", cancelPurchaseReturn);
router.get("/:vendorId/returns", getVendorPurchaseReturns);
router.get("/:vendorId", getVendorPurchases);
router.get("/:purchaseId/remaining", getRemainingBalace);
router.get("/:id", getPurchase);
router.get("/", getAllPurchases);
router.post("/create_return", createPurchaseReturn);
router.post("/", createPurchase);
// router.put("/:id", updatePurchase);
router.delete("/:id", deletePurchase);

module.exports = router;
