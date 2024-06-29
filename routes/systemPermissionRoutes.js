const express = require("express");

const {
  getSystemPermissions,
  getUserPermissions,
  giveUserPermissions,
  getUserPermissionPerUrl,
} = require("../controllers/systemPermissionController.js");

const router = express.Router();

router.post("/givePerms", giveUserPermissions);
router.post("/get_url_actions", getUserPermissionPerUrl);
router.get("/:userId", getUserPermissions);
router.get("/", getSystemPermissions);

module.exports = router;
