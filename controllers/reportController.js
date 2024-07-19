const mydb = require("../config/database.js");
const { TRANSACTION_STATUS } = require("../utils/transactionUtils.js");

exports.getTrialBalance = async function (req, res) {
  try {
    // be carefull with joins the two id of table can
    // cause conflict if alias not used
    let report = await mydb.getall(`
      SELECT 
        td.account_id,
        acc.accountName,
        atp.typeStatus,
        CASE WHEN atp.typeStatus = 'debit' THEN SUM(IFNULL(td.debit,0)) ELSE -SUM(IFNULL(td.debit,0)) END AS debit,
        CASE WHEN atp.typeStatus = 'credit' THEN SUM(IFNULL(td.credit,0)) ELSE -SUM(IFNULL(td.credit,0)) END AS credit,
        CASE WHEN atp.typeStatus = 'debit' THEN SUM(IFNULL(td.debit,0)) - SUM(IFNULL(td.credit,0)) 
            WHEN atp.typeStatus = 'credit' THEN SUM(IFNULL(td.credit,0)) - SUM(IFNULL(td.debit,0))
            ELSE 0 END AS balance
      FROM 
        transaction_detials td
        LEFT JOIN 
        accounts acc ON td.account_id = acc.id
        LEFT JOIN 
        account_types atp ON acc.accountType = atp.id
        WHERE td.status='${TRANSACTION_STATUS.LATEST}'
        GROUP BY 
        acc.id ORDER BY acc.accountNumber ASC;
      `);
    res.json({
      success: true,
      report,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: error,
    });
  }
};

exports.getBalanceSheet = async function (req, res) {
  try {
    await mydb.transaction(async (tx) => {
      let report = await tx.getall(`
      SELECT 
      td.account_id,
      acc.accountName,
      atp.type,
      FIELD(atp.type, 'Asset', 'Liability', 'Equity') AS type_order,
      CASE WHEN atp.typeStatus = 'debit' THEN SUM(IFNULL(td.debit,0)) - SUM(IFNULL(td.credit,0)) 
          WHEN atp.typeStatus = 'credit' THEN SUM(IFNULL(td.credit,0)) - SUM(IFNULL(td.debit,0))
          ELSE 0 END AS balance
      FROM 
          transaction_detials td
      LEFT JOIN 
          accounts acc ON td.account_id = acc.id
      LEFT JOIN 
          account_types atp ON acc.accountType = atp.id
      WHERE atp.type IN ('Asset','Liability','Equity') and td.status='${TRANSACTION_STATUS.LATEST}'
      GROUP BY 
          acc.id
      ORDER BY type_order ASC
    `);

      let netIncome = await tx.getrow(`
    SELECT
    ((CASE WHEN a.type = 'Income' THEN SUM(IFNULL(t.credit,0)) - SUM(IFNULL(t.debit,0)) ELSE 0 END) -
    (CASE WHEN a.type = 'Expense' THEN SUM(IFNULL(t.debit,0)) - SUM(IFNULL(t.credit,0)) ELSE 0 END)) AS net_income
    FROM transaction_detials t
    JOIN accounts acc ON t.account_id = acc.id
    JOIN account_types a on acc.accountType = a.id
    WHERE a.type IN ('Income','Expense') and t.status = '${TRANSACTION_STATUS.LATEST}'
  `);
      res.json({
        success: true,
        report,
        netIncome: netIncome.net_income,
      });
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: error,
    });
  }
};
