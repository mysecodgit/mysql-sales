// Import required modules and configuration
const express = require("express");
const {
  getAllProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  transferProduct,
  getProductsTransfered,
  getProductsTransferedById,updateTransferProduct,detleTransferById
} = require("../controllers/productController.js");

const router = express.Router();

router.get("/", getAllProducts);
router.get("/:id", getProduct);
router.post("/get_transfers", getProductsTransfered);
router.post("/get_transfers_by_id", getProductsTransferedById);
router.post("/transfer_products", transferProduct);
router.post("/update_transfer_products", updateTransferProduct);
router.post("/delete_transfer_products", detleTransferById);
router.post("/", createProduct);
router.put("/:id", updateProduct);
router.delete("/:id", deleteProduct);

module.exports = router;
