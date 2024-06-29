const express = require("express");
const {
  getAllSales,
  getSale,
  createSale,
  updateSale,
  cancelSale,
  deleteSale,
  getCustomerSales,
  getRemainingBalace,
  createSaleReturn,
  getAllSalesReturns,
  getCustomerSalesReturns,
  cancelSalesReturn,
} = require("../controllers/salesController.js");

const router = express.Router();

router.get("/returns", getAllSalesReturns);
router.post("/cancel_sale", cancelSale);
router.post("/cancel_sales_return", cancelSalesReturn);
router.get("/:customerId", getCustomerSales);
router.get("/:customerId/returns", getCustomerSalesReturns);
router.get("/:salesId/remaining", getRemainingBalace);
router.get("/:id", getSale);
router.get("/", getAllSales);
router.post("/create_sales_return", createSaleReturn);
router.post("/", createSale);
// router.put("/:id", updateSale);
// router.delete("/:id", deleteSale);

module.exports = router;
