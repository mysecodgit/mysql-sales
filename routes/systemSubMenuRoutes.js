const express = require("express");
const {
  getAllSystemSubMenus,
  createSystemSubMenu,
  updateSystemSubMenu,
  deleteSystemSubMenu,
} = require("../controllers/systemSubmenuController.js");

const router = express.Router();

router.get("/", getAllSystemSubMenus);
router.post("/", createSystemSubMenu);
router.put("/:id", updateSystemSubMenu);
router.delete("/:id", deleteSystemSubMenu);

module.exports = router;
