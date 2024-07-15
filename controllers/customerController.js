const mydb = require("../config/database.js");
const {
  TRANSACTION_TYPES,
  DEFAULT_ACCOUNTS,
  DEFAULT_ACCOUNT_TYPES,
  TRANSACTION_STATUS,
} = require("../utils/transactionUtils.js");

exports.getAllCustomers = async function (req, res) {
  try {
    let customers = await mydb.getall(`
    select c.id,c.name,c.phone,c.createdAt,b.id branch_id,b.branch_name branch_name from customers c
    left join branches b on c.branch_id = b.id
    `);
    res.json({
      success: true,
      customers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error,
    });
  }
};

exports.getCustomer = async function (req, res) {
  try {
    let customer = await mydb.getrow(
      `select * from customers where id=${parseInt(req.params.id)}`
    );
    res.json({
      success: true,
      customer,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: error,
    });
  }
};

exports.createCustomer = async function (req, res) {
  try {
    let { name, phone, openingBalance, userId, branchId } = req.body;

    let customer = await mydb.getall(
      `select * from customers where name='${name}'`
    );

    openingBalance = openingBalance || 0;

    if (customer.length)
      return res.json({ success: false, message: "Customer Already Exist" });

    await mydb.transaction(async (tx) => {
      const customer = await tx.insert(
        `insert into customers values(null,'${name}','${phone}',${parseInt(
          branchId
        )},${parseFloat(openingBalance)},now(),now())`
      );

      if (openingBalance > 0) {
        const transaction = await tx.insert(
          `insert into transaction values(null,'${TRANSACTION_TYPES.SALES}','opening balance',now(),now())`
        );

        await tx.insert(
          `insert into transaction_detials values(null,now(),now(),${transaction},${parseInt(
            userId
          )},${parseInt(branchId)},${parseInt(
            DEFAULT_ACCOUNTS.ACCOUNT_RECEIVABLE
          )},${parseFloat(openingBalance)},null,'${TRANSACTION_STATUS.LATEST}')`
        );
        await tx.insert(
          `insert into transaction_detials values(null,now(),now(),${transaction},${parseInt(
            userId
          )},${parseInt(branchId)},${
            DEFAULT_ACCOUNTS.UNCATEGORIZED_INCOME
          },null,${parseFloat(openingBalance)},'${TRANSACTION_STATUS.LATEST}')`
        );

        await tx.insert(
          `insert into sales values(null,'OPENING',${transaction},now(),${customer},${parseInt(
            userId
          )},${parseInt(branchId)},null,null,${parseFloat(
            openingBalance
          )},0,${parseFloat(openingBalance)},'${
            TRANSACTION_STATUS.LATEST
          }','opening balance')`
        );
      }
    });
    res.status(201).json({
      success: true,
      message: "Customer created successfully.",
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

exports.updateCustomer = async function (req, res) {
  try {
    const { name, phone,branchId } = req.body;

    let customer = await mydb.getall(
      `select * from customers where id=${parseInt(req.params.id)}`
    );
    if (!customer.length)
      return res.json({ success: false, message: "Customer Does not Exist" });

    await mydb.update(`update customers set name='${name}',
    phone='${phone}',branch_id=${parseInt(branchId)}
     where id=${parseInt(req.params.id)}`);

    res.status(200).json({
      success: true,
      message: "Customer updated successfully.",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: error,
    });
  }
};

exports.deleteCustomer = async function (req, res) {
  try {
    let customer = await mydb.getrow(
      `select * from customers where id=${parseInt(req.params.id)}`
    );

    if (!customer)
      return res.json({ success: false, message: "Product Does not Exist" });

    if (customer.openingBalance > 0)
      return res.json({
        success: false,
        message: "Can not delete customer in stock",
      });

    await mydb.delete(
      `delete from customers where id=${parseInt(req.params.id)}`
    );

    res.status(200).json({
      success: true,
      message: "Customer deleted successfully.",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: error,
    });
  }
};
