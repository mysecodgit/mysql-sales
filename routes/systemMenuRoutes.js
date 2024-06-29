const express = require("express");
const {
  getAllSystemMenus,
  getSystemMenu,
  createSystemMenu,
  updateSystemMenu,
  deleteSystemMenu,
} = require("../controllers/systemMenuController.js");

const router = express.Router();

router.get("/", getAllSystemMenus);
router.get("/:id", getSystemMenu);
router.post("/", createSystemMenu);
router.put("/:id", updateSystemMenu);
router.delete("/:id", deleteSystemMenu);

module.exports = router;
