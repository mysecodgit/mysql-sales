const mydb = require("../config/database.js");
const {
  TRANSACTION_TYPES,
  DEFAULT_ACCOUNTS,
  DEFAULT_ACCOUNT_TYPES,
  TRANSACTION_STATUS,
} = require("../utils/transactionUtils.js");

exports.getAllVendors = async function (req, res) {
  try {
    let vendors = await mydb.getall("select * from vendors");
    res.json({
      success: true,
      vendors,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error,
    });
  }
};

exports.getVendor = async function (req, res) {
  try {
    let product = await mydb.getrow(
      `select * from vendors where id=${parseInt(req.params.id)}`
    );
    res.json({
      success: true,
      product,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: error,
    });
  }
};

exports.createVendor = async function (req, res) {
  try {
    let { name, phone, openingBalance, userId, branchId } = req.body;

    let vendor = await mydb.getall(
      `select * from vendors where name='${name}'`
    );

    openingBalance = openingBalance || 0;

    if (vendor.length)
      return res.json({ success: false, message: "Vendor Already Exist" });

    await mydb.transaction(async (tx) => {
      const vendor = await tx.insert(
        `insert into vendors values(null,'${name}','${phone}',${parseFloat(
          openingBalance
        )},now(),now())`
      );

      if (openingBalance > 0) {
        const transaction = await tx.insert(
          `insert into transaction values(null,'${TRANSACTION_TYPES.PURCHASE}','opening balance',now(),now())`
        );

        await tx.insert(
          `insert into transaction_detials values(null,now(),now(),${transaction},${parseInt(
            userId
          )},${parseInt(branchId)},${parseInt(
            DEFAULT_ACCOUNTS.UNCATEGORIZED_EXPENSE
          )},${parseFloat(openingBalance)},null,'${TRANSACTION_STATUS.LATEST}')`
        );
        await tx.insert(
          `insert into transaction_detials values(null,now(),now(),${transaction},${parseInt(
            userId
          )},${parseInt(branchId)},${
            DEFAULT_ACCOUNTS.ACCOUNT_PAYABLE
          },null,${parseFloat(openingBalance)},'${TRANSACTION_STATUS.LATEST}')`
        );

        await tx.insert(
          `insert into purchases values(null,'OPENING',${transaction},now(),${vendor},${parseInt(userId)},${parseInt(branchId)},null,null,${parseFloat(
            openingBalance
          )},0,${parseFloat(openingBalance)},'${TRANSACTION_STATUS.LATEST}','opening balance')`
        );
      }
    });
    res.status(201).json({
      success: true,
      message: "Vendor created successfully.",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: error,
    });
    throw error;
  }
};

exports.updateVendor = async function (req, res) {
  try {
    const { name, phone } = req.body;

    let vendor = await mydb.getall(
      `select * from vendors where id=${parseInt(req.params.id)}`
    );
    if (!vendor.length)
      return res.json({ success: false, message: "Vendor Does not Exist" });

    await mydb.update(`update vendors set name='${name}',
    phone='${phone}'
     where id=${parseInt(req.params.id)}`);

    res.status(201).json({
      success: true,
      message: "Vendor updated successfully.",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: error,
    });
  }
};

exports.deleteVendor = async function (req, res) {
  try {
    let vendor = await mydb.getrow(
      `select * from vendors where id=${parseInt(req.params.id)}`
    );

    if (!vendor)
      return res.json({ success: false, message: "Product Does not Exist" });

    if (vendor.openingBalance > 0)
      return res.json({
        success: false,
        message: "Can not delete vendor in stock",
      });

    await mydb.delete(
      `delete from vendors where id=${parseInt(req.params.id)}`
    );

    res.status(200).json({
      success: true,
      message: "Vendor deleted successfully.",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: error,
    });
  }
};
