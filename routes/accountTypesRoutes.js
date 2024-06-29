// Import required modules and configuration
const express = require("express");

const {
  getAllAccountTypes,
  getAccountType,
  createAccountType,
  updateAccountType,
  deleteAccountType,
  createDefaultAccountTypes,
} = require("../controllers/accountTypesController.js");

const router = express.Router();

router.get("/createDefaultAccountTypes", createDefaultAccountTypes);
router.get("/", getAllAccountTypes);
router.get("/:id", getAccountType);
router.post("/", createAccountType);
router.put("/:id", updateAccountType);
router.delete("/:id", deleteAccountType);

module.exports = router;
