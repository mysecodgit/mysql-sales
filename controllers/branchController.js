const mydb = require("../config/database.js");

exports.getAllBranchs = async function (req, res) {
  try {
    let branches = await mydb.getall("select * from branches");
    res.json({
      success: true,
      branches,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error,
    });
  }
};

exports.getBranch = async function (req, res) {
  try {
    let { branchId } = req.body;
    let branch = await mydb.getrow(
      `select * from branches where id=${parseInt(branchId)}`
    );
    res.json({
      success: true,
      branch,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: error,
    });
  }
};

exports.createBranch = async function (req, res) {
  try {
    let { name, location } = req.body;

    let branch = await mydb.getall(
      `select * from branches where branch_name='${name}'`
    );

    if (branch.length)
      return res.json({ success: false, message: "Branch Already Exist" });

    await mydb.insert(
      `insert into branches values(null,'${name}','${location}')`
    );
    res.status(201).json({
      success: true,
      message: "Branch created successfully.",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: error,
    });
  }
};

exports.updateBranch = async function (req, res) {
  try {
    let { branchId, name, location } = req.body;

    let branch = await mydb.getall(
      `select * from branches where id='${branchId}'`
    );

    if (!branch.length)
      return res.json({ success: false, message: "Branch don't Exist" });

    await mydb.update(
      `update branches set branch_name='${name}', 
      branch_location='${location}'
      where id=${parseInt(branchId)}
      `
    );

    res.status(200).json({
      success: true,
      message: "Branch updated successfully.",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: error,
    });
  }
};

exports.deleteBranch = async function (req, res) {
  try {
    let { branchId } = req.body;

    let branch = await mydb.getall(
      `select * from branches where id='${parseInt(branchId)}'`
    );

    if (!branch)
      return res.json({ success: false, message: "Product Does not Exist" });

    await mydb.delete(`delete from branches where id=${parseInt(branchId)}`);

    res.status(200).json({
      success: true,
      message: "Branch deleted successfully.",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: error,
    });
  }
};
