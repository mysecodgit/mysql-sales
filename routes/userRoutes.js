const express = require("express");
const {
  getAllUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  login,
  refreshAccessToken,
} = require("../controllers/userController.js");

const { verifyToken } = require("../utils/authUtils.js");

const router = express.Router();

// router.use(verifyToken)

router.post("/login", login);
router.post("/refresh-accessToken", refreshAccessToken);
router.get("/", verifyToken, getAllUsers);
router.post("/", createUser);
router.post("/update_user", updateUser);
router.post("/delete", deleteUser);

module.exports = router;
