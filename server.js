const express = require("express");
const cors = require("cors");
const mydb = require("./config/database.js");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const accountTypesRoutes = require("./routes/accountTypesRoutes.js");
const accountRoutes = require("./routes/accountRoutes.js");
const branchRoutes = require("./routes/branchRoutes.js");
const productRoutes = require("./routes/productRoutes.js");
const vendorsRoutes = require("./routes/vendorRoutes.js");
const customerRoutes = require("./routes/customerRoutes.js");
const purchaseRoutes = require("./routes/purchaseRoutes.js");
const purchasePaymentRoutes = require("./routes/purchasePaymentRoutes.js");
const salesRoutes = require("./routes/salesRoutes.js");
const salePaymentRoutes = require("./routes/salesPaymentRoutes.js");
const systemMenuRoutes = require("./routes/systemMenuRoutes.js");
const systemSubMenuRoutes = require("./routes/systemSubMenuRoutes.js");
const systemActionRoutes = require("./routes/systemActionRoutes.js");
const userRoutes = require("./routes/userRoutes.js");
const permissionRoutes = require("./routes/systemPermissionRoutes.js");
const checksRoutes = require("./routes/checkRoutes.js");
const adjustmentRoutes = require("./routes/adjustmentRoutes.js");
const generalJournalRoutes = require("./routes/generalJournalRoutes.js");
const reportRoutes = require("./routes/reportRoutes.js");

const port = 5000;

app.listen(port, () => {
  console.log(`server is listening on port ${port}`);
});

app.use("/api/accountTypes", accountTypesRoutes);
app.use("/api/accounts", accountRoutes);
app.use("/api/branches", branchRoutes);
app.use("/api/products", productRoutes);
app.use("/api/vendors", vendorsRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/purchases", purchaseRoutes);
app.use("/api/purchasePayments", purchasePaymentRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/salePayments", salePaymentRoutes);
app.use("/api/systemMenues", systemMenuRoutes);
app.use("/api/systemSubMenues", systemSubMenuRoutes);
app.use("/api/systemActions", systemActionRoutes);
app.use("/api/users", userRoutes);
app.use("/api/permissions", permissionRoutes);
app.use("/api/checks", checksRoutes);
app.use("/api/adjustments", adjustmentRoutes);
app.use("/api/general_journals", generalJournalRoutes);
app.use("/api/report", reportRoutes);
