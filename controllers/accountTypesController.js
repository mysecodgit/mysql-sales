const mydb = require("../config/database.js");

exports.getAllAccountTypes = async function (req, res) {
  try {
    let accountTypes = await mydb.getall("SELECT * FROM account_types");
    res.json({
      success: true,
      accountTypes,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error,
    });
  }
};

exports.getAccountType = async function (req, res) {
  try {
    let accountType = await mydb.getrow(
      `SELECT * FROM account_types WHERE id=${parseInt(req.params.id)}`
    );
    res.json({
      success: true,
      accountType,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: error,
    });
  }
};

exports.createAccountType = async function (req, res) {
  try {
    const { typeName, typeStatus } = req.body;
    let accountType = await mydb.getrow(
      "SELECT * FROM account_types WHERE typeName=?",
      [`${typeName}`]
    );
    if (accountType)
      return res.json({ success: false, message: "AccountType Already Exist" });

    await mydb.insert(
      `INSERT INTO account_types VALUES(null,'${typeName}','${typeStatus}',now(),now())`
    );
    res.status(201).json({
      success: true,
      message: "accountType created successfully.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error,
    });
  }
};

exports.updateAccountType = async function (req, res) {
  try {
    const { typeName, typeStatus } = req.body;
    let accountType = await mydb.getrow(
      `SELECT * FROM account_types WHERE id=${parseInt(req.params.id)}`
    );

    if (!accountType)
      return res.json({
        success: false,
        message: "accountType Does not Exist",
      });

    await mydb.update(
      `UPDATE account_types SET typeName='${typeName}',typeStatus='${typeStatus}',updatedAt='${new Date()}' WHERE id = ${
        accountType.id
      }`
    );

    res.status(200).json({
      success: true,
      message: "accountType updated successfully.",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: error,
    });
  }
};

exports.deleteAccountType = async function (req, res) {
  try {
    let accountType = await mydb.getrow(
      `SELECT * FROM account_types WHERE id=${parseInt(req.params.id)}`
    );

    if (!accountType)
      return res.json({
        success: false,
        message: "accountType Does not Exist",
      });

    await mydb.delete(`DELETE FROM account_types WHERE id=${accountType.id}`);

    res.status(201).json({
      success: true,
      message: "AccountType deleted successfully.",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: error,
    });
  }
};

exports.createDefaultAccountTypes = async function (req, res) {
  try {
    let accountTypes = await mydb.getall("SELECT * FROM account_types");
    if (accountTypes.length == 0) {
      await mydb.transaction(async (mydb) => {
        await mydb.insert(
          `INSERT INTO account_types VALUES(null,'Bank','debit',now(),now())`
        );
        await mydb.insert(
          `INSERT INTO account_types VALUES(null,'Account Receivable','debit',now(),now())`
        );

        await mydb.insert(
          `INSERT INTO account_types VALUES(null,'Other current asset','debit',now(),now())`
        );

        await mydb.insert(
          `INSERT INTO account_types VALUES(null,'Cost of goods sold','debit',now(),now())`
        );

        await mydb.insert(
          `INSERT INTO account_types VALUES(null,'Expense','debit',now(),now())`
        );

        await mydb.insert(
          `INSERT INTO account_types VALUES(null,'Account Payable','credit',now(),now())`
        );

        await mydb.insert(
          `INSERT INTO account_types VALUES(null,'Other Liability','credit',now(),now())`
        );

        await mydb.insert(
          `INSERT INTO account_types VALUES(null,'Equity','credit',now(),now())`
        );

        await mydb.insert(
          `INSERT INTO account_types VALUES(null,'Income','credit',now(),now())`
        );
        res.status(201).json({
          success: true,
          message: "accountTypes created successfully.",
        });
      });
    } else {
      return res.json({ success: false, message: "Already exists." });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error,
    });
  }
};
