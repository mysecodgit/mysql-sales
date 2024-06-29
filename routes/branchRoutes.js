const express = require("express");
const {
  getAllBranchs,
  getBranch,
  createBranch,
  updateBranch,
  deleteBranch,
} = require("../controllers/branchController.js");

const router = express.Router();

router.get("/", getAllBranchs);
router.post("/get_branch_by_id", getBranch);
router.post("/", createBranch);
router.put("/update_branch", updateBranch);
router.post("/delete_branch", deleteBranch);

module.exports = router;
