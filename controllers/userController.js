const mydb = require("../config/database.js");
const {
  TRANSACTION_TYPES,
  DEFAULT_ACCOUNTS,
  DEFAULT_ACCOUNT_TYPES,
  TRANSACTION_STATUS,
} = require("../utils/transactionUtils.js");

exports.getAllUsers = async function (req, res) {
  try {
    let users = await mydb.getall(
      "select id,username,phone,status,last_login from users"
    );
    res.json({
      success: true,
      users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error,
    });
  }
};

exports.getUser = async function (req, res) {
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

exports.createUser = async function (req, res) {
  try {
    let { name, phone, password, confirmPassword } = req.body;

    let user = await mydb.getall(
      `select * from users where username='${name}'`
    );
    if (user.length)
      return res.json({ success: false, message: "User name already exist" });

    await mydb.insert(
      `insert into users values(null,'${name}','${phone}','${password}','${confirmPassword}','active',now(),now(),now())`
    );
    res.status(201).json({
      success: true,
      message: "User created successfully.",
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

exports.updateUser = async function (req, res) {
  try {
    const { name, phone } = req.body;

    let user = await mydb.getall(
      `select * from users where id=${parseInt(req.params.id)}`
    );
    if (!user.length)
      return res.json({ success: false, message: "User Does not Exist" });

    await mydb.update(`update users set username='${name}',
    phone='${phone}'
     where id=${parseInt(req.params.id)}`);

    res.status(201).json({
      success: true,
      message: "User updated successfully.",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: error,
    });
  }
};

exports.deleteUser = async function (req, res) {
  try {
    let user = await mydb.getrow(
      `select * from users where id=${parseInt(req.params.id)}`
    );

    if (!user)
      return res.json({ success: false, message: "User does not Exist" });

    await mydb.delete(`delete from users where id=${parseInt(req.params.id)}`);

    res.status(200).json({
      success: true,
      message: "User deleted successfully.",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: error,
    });
  }
};

exports.login = async function (req, res) {
  try {
    let { username, password } = req.body;

    let user = await mydb.getrow(
      `select * from users where username='${username}' and password='${password}'`
    );

    if (!user)
      return res.json({
        success: false,
        message: "user name or passord is incorrect",
      });

    let userMenues = await mydb.getall(`
    SELECT* FROM user_menues um
LEFT JOIN system_menu sm ON um.menu_id = sm.id
WHERE um.user_id = ${user.id} AND sm.isActive = true
    `);
    let subMenues = await mydb.getall(
      `
      SELECT* FROM user_sub_menu usm
      LEFT JOIN system_submenu ssm ON usm.sub_menu_id = ssm.id
      WHERE usm.user_id = ${user.id} AND ssm.isActive = true
      `
    );

    let actions = await mydb.getall(
      `SELECT* FROM user_actions ua
      LEFT JOIN system_actions sa ON ua.action_id = sa.id
      WHERE ua.user_id = ${user.id} AND sa.isActive = true`
    );

    const updated = userMenues.map((menu) => {
      let mappedSubMenue = subMenues.map((subMenu) => {
        let filtredActions = actions.filter(
          (action) => action.sub_menu_id == subMenu.id
        );
        return {
          ...subMenu,
          actions: filtredActions,
        };
      });
      let filteredSubMenu = mappedSubMenue.filter(
        (subm) => subm.menu_id == menu.id
      );

      return {
        ...menu,
        subMenues: filteredSubMenu,
      };
    });

    res.status(200).json({
      success: true,
      message: "Logged in successfully.",
      user: {
        id: user.id,
        username: user.username,
      },
      menues: updated,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: error,
    });
  }
};
