const mydb = require("../config/database.js");
const {
  DEFAULT_ACCOUNTS,
  TRANSACTION_STATUS,
  DEFAULT_ACCOUNT_TYPES,
  TRANSACTION_TYPES,
} = require("../utils/transactionUtils.js");

exports.getAllAccounts = async function (req, res) {
  try {
    // be carefull with joins the two id of table can
    // cause conflict if alias not used
    let accounts = await mydb.getall(`
    SELECT acc.id,acc.accountNumber,acc.accountName,acc.isDefault,
    typ.id as typeId,typ.typeName FROM accounts acc
LEFT JOIN account_types typ on acc.accountType = typ.id
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

exports.getAccount = async function (req, res) {
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

exports.createAccount = async function (req, res) {
  try {
    const { accountName, accountNumber, accountType, openingBalance } =
      req.body;

    const existingAccountType = await mydb.getrow(
      `select * from account_types where id="${parseInt(accountType)}"`
    );

    if (existingAccountType.length == 0)
      return res.json({
        success: false,
        message: "account type deoes not exists",
      });

    await mydb.transaction(async (tx) => {
      if (openingBalance > 0) {
        if (existingAccountType.typeName == DEFAULT_ACCOUNT_TYPES.BANK) {
          const account = await tx.insert(
            `insert into accounts values(null,${accountNumber},'${accountName}',${accountType},${false},now(),now())`
          );
          const transaction = await tx.insert(
            `insert into transaction values(null,'${TRANSACTION_TYPES.DEPOSIT}','account opening balance',now(),now())`
          );

          await tx.insert(
            `insert into transaction_detials values(null,now(),now(),${transaction},"hudeifa",${account},${openingBalance},null,'${TRANSACTION_STATUS.LATEST}')`
          );
          await tx.insert(
            `insert into transaction_detials values(null,now(),now(),${transaction},"hudeifa",${DEFAULT_ACCOUNTS.OPENING_BALANCE_EQUITY},null,${openingBalance},'${TRANSACTION_STATUS.LATEST}')`
          );
        }

        // you just pasted this and did not modified.
        if (existingAccountType.typeName == DEFAULT_ACCOUNT_TYPES.EQUITY) {
          const account = await tx.insert(
            `insert into accounts values(null,${accountNumber},'${accountName}',${accountType},${false},now(),now())`
          );
          const transaction = await tx.insert(
            `insert into transaction values(null,'${TRANSACTION_TYPES.GENERAL_LEDGER}','account opening balance',now(),now())`
          );
          await tx.insert(
            `insert into transaction_detials values(null,now(),now(),${transaction},"hudeifa",${account},null,${openingBalance},'${TRANSACTION_STATUS.LATEST}')`
          );
          await tx.insert(
            `insert into transaction_detials values(null,now(),now(),${transaction},"hudeifa",${DEFAULT_ACCOUNTS.OPENING_BALANCE_EQUITY},${openingBalance},null,'${TRANSACTION_STATUS.LATEST}')`
          );
        }

        if (
          existingAccountType.typeName ==
          DEFAULT_ACCOUNT_TYPES.OTHER_CURRENT_ASSET
        ) {
          const account = await tx.insert(
            `insert into accounts values(null,${accountNumber},'${accountName}',${accountType},${false},now(),now())`
          );
          const transaction = await tx.insert(
            `insert into transaction values(null,'${TRANSACTION_TYPES.DEPOSIT}','account opening balance',now(),now())`
          );
          await tx.insert(
            `insert into transaction_detials values(null,now(),now(),${transaction},"hudeifa",${account},${openingBalance},null,'${TRANSACTION_STATUS.LATEST}')`
          );
          await tx.insert(
            `insert into transaction_detials values(null,now(),now(),${transaction},"hudeifa",${DEFAULT_ACCOUNTS.OPENING_BALANCE_EQUITY},null,${openingBalance},'${TRANSACTION_STATUS.LATEST}')`
          );
        }
      } else {
        await tx.insert(
          `insert into accounts values(null,${accountNumber},"${accountName}",${accountType},${false},now(),now())`
        );
      }

      res.status(201).json({
        success: true,
        message: "account created successfully.",
      });
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.updateAccount = async function (req, res) {
  try {
    const { accountName, accountNumber, accountType, openingBalance } =
      req.body;
    let account = await mydb.getall(
      `select * from accounts where id='${parseInt(req.params.id)}'`
    );
    if (!account.length)
      return res.json({ success: false, message: "account Does not Exist" });

    await mydb.update(
      `update accounts set accountName='${accountName}' where id=${parseInt(
        req.params.id
      )} and isDefault=${false}`
    );

    res.status(201).json({
      success: true,
      message: "account updated successfully.",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: error,
    });
  }
};

exports.deleteAccount = async function (req, res) {
  try {
    let account = await mydb.getall(
      `SELECT * FROM accounts WHERE id=${parseInt(req.params.id)}`
    );
    if (account.length == 0)
      return res.json({ success: false, message: "account Does not Exist" });

    await mydb.delete(
      `DELETE FROM accounts WHERE id=${req.params.id} and isDefault=${false}`
    );

    res.status(200).json({
      success: true,
      message: "Account deleted successfully.",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: error,
    });
  }
};

exports.getProductCreationAccounts = async function (req, res) {
  try {
    let assetAccounts = await mydb.getall(`
    SELECT acc.id,acc.accountName FROM accounts acc 
    LEFT JOIN account_types typ on acc.accountType = typ.id
    WHERE typ.typeName = '${DEFAULT_ACCOUNT_TYPES.OTHER_CURRENT_ASSET}'
    `);
    let cogsAccounts = await mydb.getall(`
    SELECT acc.id,acc.accountName FROM accounts acc 
    LEFT JOIN account_types typ on acc.accountType = typ.id
    WHERE typ.typeName = '${DEFAULT_ACCOUNT_TYPES.COST_OF_GOODS_SOLD}'
    `);

    let incomeAccounts = await mydb.getall(`
    SELECT acc.id,acc.accountName FROM accounts acc 
    LEFT JOIN account_types typ on acc.accountType = typ.id
    WHERE typ.typeName = '${DEFAULT_ACCOUNT_TYPES.INCOME}'
    `);

    res.json({
      success: true,
      assetAccounts,
      cogsAccounts,
      incomeAccounts,
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
    let accounts = await mydb.getall("SELECT * FROM accounts");
    if (accounts.length == 0) {
      await mydb.transaction(async (mydb) => {
        await mydb.insert(
          `INSERT INTO accounts VALUES(null,${3000},'Opening balance equity',${8},${true},now(),now())`
        );

        await mydb.insert(
          `INSERT INTO accounts VALUES(null,${10200},'Account Receivable',${2},${true},now(),now())`
        );

        await mydb.insert(
          `INSERT INTO accounts VALUES(null,${2000},'Account Payable',${6},${true},now(),now())`
        );

        await mydb.insert(
          `INSERT INTO accounts VALUES(null,${40400},'Uncategorized Income',${9},${true},now(),now())`
        );

        await mydb.insert(
          `INSERT INTO accounts VALUES(null,${50100},'Uncategorized Expense',${5},${true},now(),now())`
        );

        await mydb.insert(
          `INSERT INTO accounts VALUES(null,${70100},'Cost of goods sold',${4},${true},now(),now())`
        );

        res.status(201).json({
          success: true,
          message: "accounts created successfully.",
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

exports.getIncomeAccounts = async function (req, res) {
  try {
    // be carefull with joins the two id of table can
    // cause conflict if alias not used
    let incomeAccounts = await mydb.getall(`
    SELECT acc.id,acc.accountNumber,acc.accountName,acc.isDefault,
    typ.id as typeId,typ.typeName FROM accounts acc
LEFT JOIN account_types typ on acc.accountType = typ.id WHERE typ.typeName = 'Income'
    `);
    res.json({
      success: true,
      incomeAccounts,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: error,
    });
  }
};

exports.getBankAccounts = async function (req, res) {
  try {
    // be carefull with joins the two id of table can
    // cause conflict if alias not used
    let bankAccounts = await mydb.getall(`
    SELECT acc.id,acc.accountNumber,acc.accountName,acc.isDefault,
    typ.id as typeId,typ.typeName FROM accounts acc
LEFT JOIN account_types typ on acc.accountType = typ.id WHERE typ.typeName = 'Bank'
    `);
    res.json({
      success: true,
      bankAccounts,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: error,
    });
  }
};

exports.getExpenseAccounts = async function (req, res) {
  try {
    // be carefull with joins the two id of table can
    // cause conflict if alias not used
    let expenseAccounts = await mydb.getall(`
    SELECT acc.id,acc.accountNumber,acc.accountName,acc.isDefault,
    typ.id as typeId,typ.typeName FROM accounts acc
LEFT JOIN account_types typ on acc.accountType = typ.id WHERE typ.typeName = 'Expense'
    `);
    res.json({
      success: true,
      expenseAccounts,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: error,
    });
  }
};

exports.getBankAccountBalance = async function (req, res) {
  try {
    const account = await mydb.getrow(`
    SELECT td.account_id,SUM(td.debit) debit,SUM(td.credit) credit , SUM(td.debit) - SUM( td.credit) as balance FROM transaction_detials td
WHERE td.account_id = ${parseInt(req.params.accountId)}
    `);

    res.json({
      success: true,
      balance: account.balance,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err,
    });
  }
};

exports.transferMoney = async (req, res) => {
  try {
    let { fromBankAccountId, toBankAccountId, amount, userId, date } = req.body;

    await mydb.transaction(async (tx) => {
      const transaction = await tx.insert(
        `insert into transaction values(null,'${TRANSACTION_TYPES.TRANSFER_MONEY}','',now(),now())`
      );
      await tx.insert(
        `insert into transaction_detials values(null,now(),now(),${transaction},"hudeifa",${fromBankAccountId},null,${amount},'${TRANSACTION_STATUS.LATEST}')`
      );

      await tx.insert(
        `insert into transaction_detials values(null,now(),now(),${transaction},"hudeifa",${toBankAccountId},${amount},null,'${TRANSACTION_STATUS.LATEST}')`
      );

      await tx.insert(
        `insert into money_transfer values(null,${transaction},${parseInt(
          fromBankAccountId
        )},${parseInt(toBankAccountId)},${parseFloat(amount)},${parseInt(
          userId
        )},'${date}','${TRANSACTION_STATUS.LATEST}',now(),now())`
      );
    });

    res.json({
      success: true,
      message: "Succeffully transfered.",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err,
    });
    throw err;
  }
};

exports.updateTransferMoney = async (req, res) => {
  try {
    let {
      transferId,
      fromBankAccountId,
      toBankAccountId,
      amount,
      date,
      userId,
    } = req.body;

    await mydb.transaction(async (tx) => {
      const transfer = await tx.getrow(
        `select * from money_transfer where id=${parseInt(transferId)}`
      );

      if (!transfer)
        return res
          .status(404)
          .json({ success: false, message: "Does not exist" });

      await tx.insert(
        `update money_transfer set 
          fromAccountId=${parseInt(fromBankAccountId)},
          toAccountId=${parseInt(toBankAccountId)},
          amount=${parseFloat(amount)},
          date='${date}',
          userId=${parseInt(userId)},
           updatedAt=now() where id=${transfer.id}`
      );

      await tx.update(
        `update transaction set updatedAt=now() where id=${transfer.transaction_id}`
      );

      await tx.update(
        `update transaction_detials set updatedAt=now(),status='${TRANSACTION_STATUS.PRIOR}' where transaction_id=${transfer.transaction_id}`
      );

      await tx.insert(
        `insert into transaction_detials values(null,now(),now(),${transfer.transaction_id},"hudeifa",${fromBankAccountId},null,${amount},'${TRANSACTION_STATUS.LATEST}')`
      );

      await tx.insert(
        `insert into transaction_detials values(null,now(),now(),${transfer.transaction_id},"hudeifa",${toBankAccountId},${amount},null,'${TRANSACTION_STATUS.LATEST}')`
      );
    });

    res.json({
      success: true,
      message: "Succeffully updated.",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err,
    });
    throw err;
  }
};

exports.getMoneyTransfers = async function (req, res) {
  try {
    // be carefull with joins the two id of table can
    // cause conflict if alias not used
    let transfers = await mydb.getall(`
    SELECT mt.id,mt.amount,acc.id fromAccountId ,acc.accountName fromAccount,acc2.id toAccountId,acc2.accountName toAccount,mt.date,u.username FROM money_transfer mt
LEFT JOIN accounts acc on mt.fromAccountId = acc.id
LEFT JOIN accounts acc2 on mt.toAccountId = acc2.id
LEFT JOIN users u on mt.userId = u.id
WHERE mt.status = '${TRANSACTION_STATUS.LATEST}'
    `);
    res.json({
      success: true,
      transfers,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: error,
    });
  }
};

exports.cancelTransferMoney = async (req, res) => {
  try {
    let { transferId, userId } = req.body;

    await mydb.transaction(async (tx) => {
      const transfer = await tx.getrow(
        `select * from money_transfer where id=${parseInt(transferId)}`
      );

      if (!transfer)
        return res
          .status(404)
          .json({ success: false, message: "Does not exist" });

      await tx.insert(
        `update money_transfer set 
          status='${TRANSACTION_STATUS.PRIOR}',
          userId=${parseInt(userId)},
           updatedAt=now() where id=${transfer.id}`
      );

      await tx.update(
        `update transaction set updatedAt=now() where id=${transfer.transaction_id}`
      );

      await tx.update(
        `update transaction_detials set updatedAt=now(),status='${TRANSACTION_STATUS.PRIOR}' where transaction_id=${transfer.transaction_id}`
      );
    });

    res.json({
      success: true,
      message: "Succeffully cancelled.",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err,
    });
    throw err;
  }
};
