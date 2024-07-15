const mydb = require("../config/database.js");
const {
  TRANSACTION_TYPES,
  TRANSACTION_STATUS,
} = require("../utils/transactionUtils.js");

exports.getParties = async (req, res) => {
  try {
    const parties = await mydb.getall(`
    SELECT v.id,v.name,"vendor" AS type FROM vendors v
    UNION ALL
    SELECT c.id,c.name,"customer" as type FROM customers c
    ORDER BY id
    `);

    res.json({
      success: true,
      parties,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err,
    });
  }
};

exports.createCheck = async (req, res) => {
  try {
    const {
      checkDate,
      bankAccountId,
      vendorId,
      customerId,
      userId,
      branchId,
      expenses,
      amount,
    } = req.body;

    await mydb.transaction(async (tx) => {
      const transaction = await tx.insert(
        `insert into transaction values(null,'${TRANSACTION_TYPES.CHECK}','',now(),now())`
      );

      // just crediting the bank account once instead of crediting in the loop
      await tx.insert(
        `insert into transaction_detials values(null,now(),now(),${transaction},${parseInt(
          userId
        )},${parseInt(branchId)},${parseInt(bankAccountId)},NULL,${parseFloat(
          amount
        )},'${TRANSACTION_STATUS.LATEST}')`
      );

      const check = await tx.insert(`insert into checks 
        values(null,${transaction},${bankAccountId},${vendorId},${customerId},${parseFloat(
        amount
      )},${userId},${parseInt(branchId)},'${checkDate}','${
        TRANSACTION_STATUS.LATEST
      }',now(),now())`);

      for (const exp of expenses) {
        await tx.insert(
          `insert into checks_details values(null,${check},${parseInt(
            exp.accountId
          )},${parseFloat(exp.amount)},'${exp.memo}','${
            TRANSACTION_STATUS.LATEST
          }',now(),now())`
        );

        await tx.insert(
          `insert into transaction_detials values(null,now(),now(),${transaction},${parseInt(
            userId
          )},${parseInt(branchId)},${parseInt(exp.accountId)},${parseFloat(
            amount
          )},NULL,'${TRANSACTION_STATUS.LATEST}')`
        );
      }
    });
    res.json({
      success: true,
      message: "created successfully",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err,
    });
    throw err;
  }
};

exports.getAllChecks = async (req, res) => {
  try {
    const checks = await mydb.getall(`
      SELECT ch.id,ch.amount,ch.date,acc.accountName,v.name vendorName,c.name customerName FROM checks ch
LEFT JOIN accounts acc on ch.bankAccount = acc.id
LEFT JOIN vendors v on ch.vendor_id = v.id
LEFT JOIN customers c on ch.customer_id = c.id
WHERE ch.status = 'Latest'
      `);

    res.json({
      success: true,
      checks,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err,
    });
  }
};

exports.getCheckInfo = async (req, res) => {
  try {
    let { checkId } = req.body;
    if (!checkId)
      return res
        .status(404)
        .json({ success: false, message: "check does not exist." });

    const check = await mydb.getrow(`
    SELECT ch.id,ch.amount,ch.date,acc.id accountId,acc.accountName,v.id vendorId, v.name vendorName,c.id customerId,c.name customerName,br.id branchId,br.branch_name branchName FROM checks ch
    LEFT JOIN accounts acc on ch.bankAccount = acc.id
    LEFT JOIN vendors v on ch.vendor_id = v.id
    LEFT JOIN customers c on ch.customer_id = c.id
    LEFT JOIN branches br on ch.branch_id = br.id
    WHERE ch.id = ${parseInt(checkId)}
      `);

    const checkDetials = await mydb.getall(`
    SELECT chd.amount,chd.memo,acc.id accountId,acc.accountName FROM checks_details chd
LEFT JOIN accounts acc ON chd.accountId = acc.id
WHERE chd.check_id = ${parseInt(checkId)} and chd.status='${
      TRANSACTION_STATUS.LATEST
    }'
    `);

    res.json({
      success: true,
      check,
      rows: checkDetials,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err,
    });
  }
};

exports.updateCheck = async (req, res) => {
  try {
    const {
      checkId,
      checkDate,
      bankAccountId,
      vendorId,
      branchId,
      customerId,
      userId,
      expenses,
      amount,
    } = req.body;

    await mydb.transaction(async (tx) => {
      const check = await mydb.getrow(
        `select * from checks where id=${parseInt(checkId)}`
      );

      if (!check)
        return res
          .status(404)
          .json({ success: false, message: "does not exist" });

      await mydb.update(
        `update checks set  date='${checkDate}',bankAccount=${parseInt(
          bankAccountId
        )},branch_id=${parseInt(branchId)},user_id=${parseInt(userId)},
        vendor_id=${vendorId},customer_id=${customerId},amount=${parseFloat(
          amount
        )},updatedAt=now() where id=${check.id}`
      );
      await mydb.update(
        `update checks_details set status='${TRANSACTION_STATUS.PRIOR}', updatedAt=now() where check_id=${check.id}`
      );

      await tx.update(
        `update transaction set updatedAt=now() where id=${check.transaction_id}`
      );

      await tx.update(
        `update transaction_detials set status='${TRANSACTION_STATUS.PRIOR}' where transaction_id=${check.transaction_id}`
      );

      await tx.insert(
        `insert into transaction_detials values(null,now(),now(),${
          check.transaction_id
        },${parseInt(userId)},${parseInt(branchId)},${parseInt(
          bankAccountId
        )},NULL,${parseFloat(amount)},'${TRANSACTION_STATUS.LATEST}')`
      );

      //   const check = await tx.insert(`insert into checks
      //       values(null,${
      //         check.transaction_id
      //       },${bankAccountId},${vendorId},${customerId},${parseFloat(
      //     amount
      //   )},${userId},'${checkDate}','${TRANSACTION_STATUS.LATEST}',now(),now())`);

      for (const exp of expenses) {
        await tx.insert(
          `insert into checks_details values(null,${check.id},${parseInt(
            exp.accountId
          )},${parseFloat(exp.amount)},'${exp.memo}','${
            TRANSACTION_STATUS.LATEST
          }',now(),now())`
        );

        await tx.insert(
          `insert into transaction_detials values(null,now(),now(),${
            check.transaction_id
          },${parseInt(userId)},${parseInt(branchId)},${parseInt(
            exp.accountId
          )},${parseFloat(amount)},NULL,'${TRANSACTION_STATUS.LATEST}')`
        );
      }

      res.json({
        success: true,
        message: "updated successfully",
      });
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err,
    });
    throw err;
  }
};

exports.cancelCheck = async (req, res) => {
  try {
    const { checkId } = req.body;

    await mydb.transaction(async (tx) => {
      const check = await mydb.getrow(
        `select * from checks where id=${parseInt(checkId)}`
      );

      if (!check)
        return res
          .status(404)
          .json({ success: false, message: "does not exist" });

      await mydb.update(
        `update checks set status='${TRANSACTION_STATUS.CANCELLED}', updatedAt=now() where id=${check.id} and status='${TRANSACTION_STATUS.LATEST}'`
      );
      await mydb.update(
        `update checks_details set status='${TRANSACTION_STATUS.CANCELLED}', updatedAt=now() where check_id=${check.id} and status='${TRANSACTION_STATUS.LATEST}'`
      );

      await tx.update(
        `update transaction set updatedAt=now() where id=${check.transaction_id}`
      );

      await tx.update(
        `update transaction_detials set status='${TRANSACTION_STATUS.CANCELLED}' where transaction_id=${check.transaction_id} and status='${TRANSACTION_STATUS.LATEST}'`
      );
    });
    res.json({
      success: true,
      message: "cancelled successfully",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err,
    });
    throw err;
  }
};
