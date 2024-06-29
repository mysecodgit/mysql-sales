const express = require("express");
const {
  getAllUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  login,
} = require("../controllers/userController.js");

const router = express.Router();

router.post("/login", login);
router.get("/", getAllUsers);
router.post("/", createUser);
router.post("/update_user", updateUser);
router.post("/delete", deleteUser);

module.exports = router;
