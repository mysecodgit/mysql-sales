const express = require("express");
const {
  getAllVendors,
  getVendor,
  createVendor,
  updateVendor,
  deleteVendor,
} = require("../controllers/vendorController.js");

const router = express.Router();

router.get("/", getAllVendors);
router.get("/:id", getVendor);
router.post("/", createVendor);
router.put("/:id", updateVendor);
router.delete("/:id", deleteVendor);

module.exports = router;
