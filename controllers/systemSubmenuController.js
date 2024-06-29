const mydb = require("../config/database.js");

exports.getAllSystemSubMenus = async function (req, res) {
  try {
    // be carefull with joins the two id of table can
    // cause conflict if alias not used
    let systemSubMenues = await mydb.getall(`
    SELECT * FROM system_submenu
    `);
    res.json({
      success: true,
      systemSubMenues,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: error,
    });
  }
};

exports.createSystemSubMenu = async function (req, res) {
  try {
    const { title, url, menu_id, isActive } = req.body;

    await mydb.insert(
      `insert into system_submenu values(null,'${title}','${url}',${parseInt(
        menu_id
      )},'${isActive}',1)`
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

exports.updateSystemSubMenu = async function (req, res) {
  try {
    const { title, url, menu_id, isActive } = req.body;

    let menu = await mydb.getall(
      `select * from system_submenu where id='${parseInt(req.params.id)}'`
    );
    if (!menu.length)
      return res.json({ success: false, message: "Menue Does not Exist" });

    await mydb.update(
      `update system_submenu set title='${title}',
      url='${url}',menu_id=${menu_id}, isActive='${isActive}' where id=${parseInt(
        req.params.id
      )}`
    );

    res.status(201).json({
      success: true,
      message: "System Sub Menu updated successfully.",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: error,
    });
  }
};

exports.deleteSystemSubMenu = async function (req, res) {
  try {
    let menu = await mydb.getall(
      `select * from system_submenu where id='${parseInt(req.params.id)}'`
    );
    if (!menu.length)
      return res.json({ success: false, message: "Sub Menu Does not Exist" });

    await mydb.delete(
      `DELETE FROM system_submenu WHERE id=${parseInt(req.params.id)}`
    );

    res.status(200).json({
      success: true,
      message: "SystemSubMenu deleted successfully.",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: error,
    });
  }
};
