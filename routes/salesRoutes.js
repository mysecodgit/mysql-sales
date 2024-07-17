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
  cancelSalesReturn,getSalesReturnById
} = require("../controllers/salesController.js");

const router = express.Router();

router.get("/returns", getAllSalesReturns);
router.post("/get_sales_return_by_id", getSalesReturnById);
router.post("/cancel_sale", cancelSale);
router.post("/cancel_sales_return", cancelSalesReturn);
router.get("/:customerId", getCustomerSales);
router.get("/:customerId/returns", getCustomerSalesReturns);
router.get("/:salesId/remaining", getRemainingBalace);
router.post("/get_sales_by_id", getSale);
router.get("/", getAllSales);
router.post("/create_sales_return", createSaleReturn);
router.post("/", createSale);
// router.put("/:id", updateSale);
// router.delete("/:id", deleteSale);

module.exports = router;
