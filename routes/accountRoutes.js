const express = require("express");

const {
  getAllAccounts,
  getAccount,
  createAccount,
  updateAccount,
  deleteAccount,
  getProductCreationAccounts,
  createDefaultAccountTypes,
  getIncomeAccounts,
  getBankAccounts,
  getExpenseAccounts,
  getBankAccountBalance,
  transferMoney,
  getMoneyTransfers,updateTransferMoney,cancelTransferMoney
} = require("../controllers/accountController.js");

const router = express.Router();

router.get("/product_accounts", getProductCreationAccounts);
router.get("/create_default_accounts", createDefaultAccountTypes);
router.get("/get_income_accounts", getIncomeAccounts);
router.get("/get_bank_accounts", getBankAccounts);
router.get("/get_expense_accounts", getExpenseAccounts);
router.post("/transfer_money", transferMoney);
router.post("/get_money_transfers", getMoneyTransfers);
router.post("/update_money_transfers", updateTransferMoney);
router.post("/cancel_money_transfers", cancelTransferMoney);
router.get("/", getAllAccounts);
router.get("/:accountId/remaining", getBankAccountBalance);
router.get("/:id", getAccount);
router.post("/", createAccount);
router.put("/:id", updateAccount);
router.delete("/:id", deleteAccount);

module.exports = router;
