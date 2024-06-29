const express = require("express");
const {
  getParties,
  createCheck,
  getAllChecks,
  getCheckInfo,
  updateCheck,cancelCheck
} = require("../controllers/checkController.js");

const router = express.Router();

router.get("/get_parties", getParties);
router.post("/get_check_info", getCheckInfo);
router.post("/update_check", updateCheck);
router.post("/cancel_check", cancelCheck);
// router.get("/:id", getCustomer);
router.get("/", getAllChecks);
router.post("/", createCheck);
// router.put("/:id", updateCustomer);
// router.delete("/:id", deleteCustomer);

module.exports = router;
