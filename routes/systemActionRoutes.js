const express = require("express");
const {
  getAllSystemActions,
  createSystemAction,
  updateSystemAction,
  deleteSystemAction,
} = require("../controllers/systemActionController.js");

const router = express.Router();

router.get("/", getAllSystemActions);
router.post("/", createSystemAction);
router.put("/:id", updateSystemAction);
router.delete("/:id", deleteSystemAction);

module.exports = router;
