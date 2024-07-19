const mydb = require("../config/database.js");
const {
  TRANSACTION_TYPES,
  DEFAULT_ACCOUNTS,
  DEFAULT_ACCOUNT_TYPES,
  TRANSACTION_STATUS,
} = require("../utils/transactionUtils.js");

const {
  hashPassword,
  generateAccessToken,
  generateRefreshToken,
  updateRefreshToken,
  verifyToken,
} = require("../utils/authUtils.js");

const bcrypt = require("bcrypt");

exports.getAllUsers = async function (req, res) {
  try {
    let users = await mydb.getall(
      `select u.id,u.username,u.phone,b.id branchId,b.branch_name,u.status,u.last_login from users u
      left join branches b on u.branch_id = b.id`
    );
    res.json({
      success: true,
      users,
    });
  } catch (error) {
    console.log(error);
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
    let { name, phone, branchId, password } = req.body;

    const hashedPassword = await hashPassword(password);

    let user = await mydb.getall(
      `select * from users where username='${name}'`
    );
    if (user.length)
      return res.json({ success: false, message: "User name already exist" });

    await mydb.insert(
      `insert into users values(null,'${name}','${phone}','${hashedPassword}',${parseInt(
        branchId
      )},'active',null,null,now(),now())`
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
    const { userId, name, phone, branchId } = req.body;

    let user = await mydb.getall(
      `select * from users where id=${parseInt(userId)}`
    );
    if (!user.length)
      return res.json({ success: false, message: "User Does not Exist" });

    await mydb.update(`update users set username='${name}',
    phone='${phone}',branch_id=${parseInt(branchId)}
     where id=${parseInt(userId)}`);

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
    let { id } = req.body;
    let user = await mydb.getrow(
      `select * from users where id=${parseInt(id)}`
    );

    if (!user)
      return res.json({ success: false, message: "User does not Exist" });

    await mydb.delete(`delete from users where id=${parseInt(id)}`);

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

    let punishMinutes = 1;

    let currentDateTime = new Date();
    let tenMinutesBefore = new Date(
      currentDateTime.getTime() - punishMinutes * 60 * 1000
    );

    const formattedCurrent = formatDate(currentDateTime);
    const formattedTenBefor = formatDate(tenMinutesBefore);

    let user = await mydb.getrow(
      `select * from users where username='${username}'`
    );

    if (!user)
      return res.json({
        success: false,
        message: "user name does not exist",
      });

    if (user.status == "blocked") {
      return res.json({
        success: false,
        message: `this user is blocked by admin`,
      });
    }

    let attemptCounts = await mydb.getrow(
      `select count(user_id) counts from login_attempts where 
        user_id=${user.id} and
        time between '${formattedTenBefor}' and '${formattedCurrent}'`
    );

    let lastAttempt = await mydb.getrow(`
      select * from login_attempts where user_id=${user.id} ORDER BY time DESC LIMIT 1
       `);

    const lastLoginDate = new Date(lastAttempt.time);
    let tenMinutesAfter = new Date(
      lastLoginDate.getTime() + punishMinutes * 60 * 1000
    );
    let formattedTenMinutesAfter = formatDate(tenMinutesAfter);

    if (attemptCounts.counts > 2) {
      await mydb.update(`
        update users set status='retained' where id=${user.id}
       `);

      return res.json({
        success: false,
        message: `user blocked untill ${formattedTenMinutesAfter}`,
      });
    }

    if (user.status == "retained" && new Date() > tenMinutesAfter) {
      await mydb.update(`
        update users set status='active' where id=${user.id}
       `);
    }

    user = await mydb.getrow(
      `select * from users where username='${username}'`
    );

    if (user.status == "retained") {
      return res.json({
        success: false,
        message: `user blocked untill ${formattedTenMinutesAfter}`,
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      await mydb.insert(`insert into login_attempts values(${user.id},now())`);
      return res.json({
        success: false,
        counts: attemptCounts.counts,
        message: "password is wrong.",
      });
    }

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

    const accessToken = generateAccessToken(user, updated);
    const refreshToken = generateRefreshToken();
    await updateRefreshToken(user.id, refreshToken);

    res.status(200).json({
      success: true,
      message: "Logged in successfully.",
      accessToken,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: error,
    });
  }
};

exports.refreshAccessToken = async function (req, res) {
  try {
    let { userId } = req.body;

    let user = await mydb.getrow(
      `select * from users where id=${parseInt(userId)}`
    );

    if (!user)
      return res.json({
        success: false,
        message: "user name does not exist",
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

    const accessToken = generateAccessToken(user, updated);

    res.status(200).json({
      success: true,
      accessToken,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: error,
    });
  }
};

const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  const formattedDateTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  return formattedDateTime;
};
