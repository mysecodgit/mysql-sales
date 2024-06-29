const mydb = require("../config/database.js");
const {
  TRANSACTION_TYPES,
  TRANSACTION_STATUS,
} = require("../utils/transactionUtils.js");

exports.getGeneralJournals = async function (req, res) {
  try {
    //   let { type } = req.body;

    const journals = await mydb.getall(
      `select * from general_journal where status='Latest'`
    );

    let result = [];

    for (const j of journals) {
      const journalsDetails = await mydb.getall(`
      SELECT acc.accountName,td.debit,td.credit from transaction_detials td
      LEFT JOIN accounts acc on td.account_id = acc.id
      where td.transaction_id =${j.transaction_id} and status='${TRANSACTION_STATUS.LATEST}'`);

      result.push({
        ...j,
        details: journalsDetails,
      });
    }

    res.json({
      success: true,
      journals: result,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
    throw err;
  }
};

exports.getJournalById = async (req, res) => {
  try {
    let { JournalId } = req.body;
    if (!JournalId)
      return res
        .status(404)
        .json({ success: false, message: "JournalId does not exist." });

    const journal = await mydb.getrow(`
      SELECT id,transaction_id,memo,date FROM general_journal WHERE id = ${parseInt(
        JournalId
      )}
        `);

    const journalDetails = await mydb.getall(`
    SELECT acc.id accountId,acc.accountName,td.debit,td.credit from transaction_detials td
    LEFT JOIN accounts acc on td.account_id = acc.id
    where td.transaction_id =${journal.transaction_id}
      `);

    res.json({
      success: true,
      journal,
      rows: journalDetails,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err,
    });
  }
};

exports.getNextId = async function (req, res) {
  try {
    let row = await mydb.getrow(`
    SELECT id FROM general_journal ORDER BY id DESC LIMIT 1
    `);
    res.json({
      success: true,
      nextId: row?.id + 1 || 1,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: error,
    });
  }
};

exports.getGeneralAccounts = async function (req, res) {
  try {
    let accounts = await mydb.getall(`
      SELECT acc.id,acc.accountName,typ.typeName FROM accounts acc
LEFT JOIN account_types typ on acc.accountType = typ.id
WHERE typ.typeName != 'Account Payable' and typ.typeName != 'Account Receivable'
      `);
    res.json({
      success: true,
      accounts,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: error,
    });
  }
};

exports.createGeneralJournal = async function (req, res) {
  try {
    let { JournalDate, memo, userId, rows } = req.body;

    await mydb.transaction(async (tx) => {
      const transaction = await tx.insert(
        `insert into transaction values(null,'${TRANSACTION_TYPES.GENERAL_JOURNAL}','',now(),now())`
      );

      await tx.insert(
        `insert into general_journal values(null,'${JournalDate}',${transaction},'${memo}','${TRANSACTION_STATUS.LATEST}',now(),now())`
      );

      for (const row of rows) {
        await tx.insert(
          `insert into transaction_detials values(null,now(),now(),${transaction},${userId},${parseInt(
            row.accountId
          )},${parseFloat(row.debit) || null},${
            parseFloat(row.credit) || null
          },'${TRANSACTION_STATUS.LATEST}')`
        );
      }

      res.json({
        success: true,
        message: "created general journal",
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

exports.updateGeneralJournal = async function (req, res) {
  try {
    let { JournalId, JournalDate, memo, userId, rows } = req.body;

    await mydb.transaction(async (tx) => {
      const journal = await tx.getrow(
        `SELECT * FROM general_journal where id=${parseInt(JournalId)}`
      );
      if (!journal) {
        return res.status(404).json({
          success: false,
          message: "journal does not exist.",
        });
      }

      await tx.update(
        `update transaction set updatedAt=now() where id=${journal.transaction_id}`
      );

      await tx.update(
        `update transaction_detials set 
            updatedAt=now(),
            user_id=${parseInt(userId)},
            status='${TRANSACTION_STATUS.PRIOR}'
             where transaction_id=${journal.transaction_id}`
      );

      await tx.update(
        `update general_journal set
        date='${JournalDate}',
        memo='${memo}',
         updatedAt=now() where id=${journal.id}`
      );

      for (const row of rows) {
        await tx.insert(
          `insert into transaction_detials values(null,now(),now(),${
            journal.transaction_id
          },${parseInt(userId)},${parseInt(row.accountId)},${
            parseFloat(row.debit) || null
          },${parseFloat(row.credit) || null},'${TRANSACTION_STATUS.LATEST}')`
        );
      }

      res.json({
        success: true,
        message: "updated general journal",
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

exports.deleteGeneralJournal = async function (req, res) {
  try {
    let { journalId, userId } = req.body;

    await mydb.transaction(async (tx) => {
      const journal = await tx.getrow(
        `SELECT * FROM general_journal where id=${parseInt(journalId)}`
      );
      if (!journal) {
        return res.status(404).json({
          success: false,
          message: "journal does not exist.",
        });
      }

      await tx.update(
        `update transaction set updatedAt=now() where id=${journal.transaction_id}`
      );

      await tx.update(
        `update transaction_detials set 
            updatedAt=now(),
            user_id=${parseInt(userId)},
            status='${TRANSACTION_STATUS.PRIOR}'
             where transaction_id=${journal.transaction_id}`
      );

      await tx.update(
        `update general_journal set
        status='${TRANSACTION_STATUS.PRIOR}',
         updatedAt=now() where id=${journal.id}`
      );

      res.json({
        success: true,
        message: "deleted general journal",
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
