const express = require("express");
const {
  getNextId,
  getGeneralAccounts,
  createGeneralJournal,
  getGeneralJournals,
  getJournalById,
  updateGeneralJournal,deleteGeneralJournal
} = require("../controllers/generalJournalControl.js");

const router = express.Router();

router.post("/get_all", getGeneralJournals);
router.post("/get_by_id", getJournalById);
router.post("/get_next_id", getNextId);
router.post("/get_accounts", getGeneralAccounts);
router.post("/create", createGeneralJournal);
router.post("/update", updateGeneralJournal);
router.post("/delete", deleteGeneralJournal);

module.exports = router;
