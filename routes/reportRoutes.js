const express = require("express");
const {
  getTrialBalance,
  getBalanceSheet,
} = require("../controllers/reportController.js");

const router = express.Router();

router.post("/get_trial_balance", getTrialBalance);
router.post("/get_balance_sheet", getBalanceSheet);

module.exports = router;
