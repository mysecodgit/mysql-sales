const mydb = require("../config/database.js");

exports.getSystemPermissions = async function (req, res) {
  try {
    let systemMenues = await mydb.getall(`
    SELECT id,title,isActive FROM system_menu where isActive=1
    `);
    let subMenues = await mydb.getall(
      `SELECT id,title,menu_id FROM system_submenu `
    );

    let actions = await mydb.getall(
      `SELECT id,title,sub_menu_id FROM system_actions `
    );

    const updated = systemMenues.map((menu) => {
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
    res.json({
      success: true,
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

exports.getUserPermissions = async function (req, res) {
  try {
    let menues = await mydb.getall(`
      SELECT * FROM user_menues where user_id=${parseInt(req.params.userId)}
      `);
    let subMenues = await mydb.getall(
      `SELECT * FROM user_sub_menu where user_id=${parseInt(req.params.userId)}`
    );

    let actions = await mydb.getall(
      `SELECT * FROM user_actions where user_id=${parseInt(req.params.userId)}`
    );

    res.json({
      success: true,
      menues,
      subMenues,
      actions,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: error,
    });
  }
};

exports.giveUserPermissions = async function (req, res) {
  try {
    let { menues, userId } = req.body;
    if (!menues || !userId)
      return res.status(404).json({
        success: false,
        message: "menues or userId field is missing",
      });

    await mydb.transaction(async (tx) => {
      await tx.delete(
        `delete from user_menues where user_id=${parseInt(userId)}`
      );
      await tx.delete(
        `delete from user_sub_menu where user_id=${parseInt(userId)}`
      );
      await tx.delete(
        `delete from user_actions where user_id=${parseInt(userId)}`
      );

      for (const menu of menues) {
        await tx.insert(
          `insert into user_menues values(${menu.id},${parseInt(userId)})`
        );

        for (const subMenu of menu.subMenues) {
          await tx.insert(
            `insert into user_sub_menu values(${subMenu.id},${parseInt(
              userId
            )})`
          );

          for (const action of subMenu.actions) {
            await tx.insert(
              `insert into user_actions values(${parseInt(userId)},${
                action.id
              })`
            );
          }
        }
      }

      res.json({
        success: true,
        message: "Permissons were updated",
      });
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

exports.getUserPermissionPerUrl = async function (req, res) {
  try {
    let { url, userId } = req.body;

    const actions = await mydb.getall(`
        SELECT sa.title FROM user_actions ua
        LEFT JOIN system_actions sa on ua.action_id = sa.id
        LEFT JOIN system_submenu sm on sa.sub_menu_id = sm.id
        WHERE sm.url = '/${url}' and ua.user_id = ${userId}
    `);

    res.json({
      success: true,
      actions,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err,
    });
  }
};
