const express = require("express");
const {
 createQtyAdjustment,getAdjustments,createValueAdjustment
} = require("../controllers/adjustmentController.js");

const router = express.Router();


router.post("/get_all_by_type", getAdjustments);
router.post("/create_qty_adj", createQtyAdjustment);
router.post("/create_value_adj", createValueAdjustment);

module.exports = router;
