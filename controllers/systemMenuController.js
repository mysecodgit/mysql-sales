const mydb = require("../config/database.js");
const {
  DEFAULT_ACCOUNTS,
  TRANSACTION_STATUS,
  DEFAULT_ACCOUNT_TYPES,
  TRANSACTION_TYPES,
} = require("../utils/transactionUtils.js");

exports.getAllSystemMenus = async function (req, res) {
  try {
    // be carefull with joins the two id of table can
    // cause conflict if alias not used
    let systemMenues = await mydb.getall(`
    SELECT * FROM system_menu
    `);
    res.json({
      success: true,
      systemMenues,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: error,
    });
  }
};

exports.getSystemMenu = async function (req, res) {
  try {
    let account = await mydb.getrow(
      `SELECT * FROM accounts WHERE id=${parseInt(req.params.id)}`
    );
    res.json({
      success: true,
      account,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: error,
    });
  }
};

exports.createSystemMenu = async function (req, res) {
  try {
    const { title, url, isActive } = req.body;

    await mydb.insert(
      `insert into system_menu values(null,'${title}','${url}','${isActive}',1)`
    );
    res.json({
      success: true,
      message: "Successfully created.",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.updateSystemMenu = async function (req, res) {
  try {
    const {title, url, isActive } =
      req.body;

    let menu = await mydb.getall(
      `select * from system_menu where id='${parseInt(req.params.id)}'`
    );
    if (!menu.length)
      return res.json({ success: false, message: "Menue Does not Exist" });

    await mydb.update(
      `update system_menu set title='${title}',
      url='${url}',isActive='${isActive}' where id=${parseInt(
        req.params.id
      )}`
    );

    res.status(201).json({
      success: true,
      message: "System Menu updated successfully.",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: error,
    });
  }
};

exports.deleteSystemMenu = async function (req, res) {
  try {
    let menu = await mydb.getall(
        `select * from system_menu where id='${parseInt(req.params.id)}'`
      );
      if (!menu.length)
        return res.json({ success: false, message: "Menue Does not Exist" });

    await mydb.delete(
      `DELETE FROM system_menu WHERE id=${parseInt(req.params.id)}`
    );

    res.status(200).json({
      success: true,
      message: "SystemMenu deleted successfully.",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: error,
    });
  }
};
