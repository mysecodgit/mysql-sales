const mydb = require("../config/database.js");

exports.getAllSystemActions = async function (req, res) {
  try {
    let systemActions = await mydb.getall(`
    SELECT sac.id actionId,sac.title,sbm.id menuId,sbm.title menuTitle,sac.isActive FROM system_actions sac
LEFT JOIN system_submenu sbm on sac.sub_menu_id = sbm.id
    `);
    res.json({
      success: true,
      systemActions,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: error,
    });
  }
};

exports.createSystemAction = async function (req, res) {
  try {
    const { title, sub_menu_id, isActive } = req.body;

    await mydb.insert(
      `insert into system_actions values(null,'${title}',${parseInt(
        sub_menu_id
      )},'${isActive}')`
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

exports.updateSystemAction = async function (req, res) {
  try {
    const { title, sub_menu_id, isActive } = req.body;

    let actions = await mydb.getall(
      `select * from system_actions where id='${parseInt(req.params.id)}'`
    );
    if (!actions.length)
      return res.json({ success: false, message: "Action Does not Exist" });

    await mydb.update(
      `update system_actions set title='${title}',
     sub_menu_id=${sub_menu_id}, isActive='${isActive}' where id=${parseInt(
        req.params.id
      )}`
    );

    res.status(200).json({
      success: true,
      message: "System Action updated successfully.",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: error,
    });
  }
};

exports.deleteSystemAction = async function (req, res) {
  try {
    let actions = await mydb.getall(
      `select * from system_actions where id='${parseInt(req.params.id)}'`
    );
    if (!actions.length)
      return res.json({ success: false, message: "Action Does not Exist" });

    await mydb.delete(
      `DELETE FROM system_actions WHERE id=${parseInt(req.params.id)}`
    );

    res.status(200).json({
      success: true,
      message: "SystemAction deleted successfully.",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: error,
    });
  }
};
