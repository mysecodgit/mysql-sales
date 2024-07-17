const mydb = require("../config/database.js");
const {
  TRANSACTION_TYPES,
  DEFAULT_ACCOUNTS,
  DEFAULT_ACCOUNT_TYPES,
  TRANSACTION_STATUS,
} = require("../utils/transactionUtils.js");

exports.getAdjustments = async function (req, res) {
  try {
    let { type } = req.body;

    const adjustments = await mydb.getall(
      `select * from inventory_adjustment where type='${type}' and status='Latest'`
    );

    let result = [];

    for (const t of adjustments) {
      const adjustmentsDetails = await mydb.getall(`
        SELECT p.name,dt.old_qty,dt.new_qty,dt.old_value,dt.new_value FROM inventory_adjustment_details dt
        LEFT JOIN products p on dt.product_id = p.id
        WHERE dt.adjustment_id = ${t.id} ORDER BY dt.adjustment_id`);

      result.push({
        ...t,
        details: adjustmentsDetails,
      });
    }

    res.json({
      success: true,
      adjustments: result,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
    throw err;
  }
};

exports.createQtyAdjustment = async function (req, res) {
  try {
    let {
      date,
      adjustmentType,
      branchId,
      adjustmentAccount,
      adjustmentAmount,
      userId,
      rows,
    } = req.body;

    await mydb.transaction(async (tx) => {
      const transaction = await tx.insert(
        `insert into transaction values(null,'${TRANSACTION_TYPES.INVENTORY_ADJUSTMENT}','',now(),now())`
      );

      const adjustment = await tx.insert(
        `insert into inventory_adjustment values(null,${transaction},${parseInt(
          userId
        )},${parseInt(branchId)},'${adjustmentType}',${parseFloat(
          adjustmentAmount
        )},'${date}','${TRANSACTION_STATUS.LATEST}',now(),now())`
      );

      for (const row of rows) {
        const product = await mydb.getrow(
          `select * from products where id = ${parseInt(row.productId)}`
        );

        const newQty = product.qtyOnHand + row.difference;

        await mydb.update(
          `update products set qtyOnHand=${parseInt(
            newQty
          )} where id = ${parseInt(row.productId)}`
        );

        await tx.insert(
          `insert into inventory_adjustment_details values(null,${adjustment},${parseInt(
            row.productId
          )},${parseInt(row.qtyOnHand)},
            ${parseInt(row.newQty)},null,null,${
            product.assetAccount
          },${parseInt(adjustmentAccount)},'${
            TRANSACTION_STATUS.LATEST
          }',now(),now())`
        );

        const account = await mydb.getrow(`
             SELECT acc.accountName,atp.typeName FROM accounts acc
            LEFT JOIN account_types atp on acc.accountType = atp.id
            WHERE acc.id = ${parseInt(adjustmentAccount)}
          `);

        if (account.typeName == DEFAULT_ACCOUNT_TYPES.EXPENSE) {
          await tx.insert(
            `insert into transaction_detials values(null,now(),now(),${transaction},${parseInt(
              userId
            )},${parseInt(branchId)},${parseInt(adjustmentAccount)},${Math.abs(
              row.total
            )},null,'${TRANSACTION_STATUS.LATEST}')`
          );
          await tx.insert(
            `insert into transaction_detials values(null,now(),now(),${transaction},${parseInt(
              userId
            )},${parseInt(branchId)},${product.assetAccount},null,${Math.abs(
              row.total
            )},'${TRANSACTION_STATUS.LATEST}')`
          );
        }

        if (account.typeName == DEFAULT_ACCOUNT_TYPES.INCOME) {
          await tx.insert(
            `insert into transaction_detials values(null,now(),now(),${transaction},${parseInt(
              userId
            )},${parseInt(branchId)},${parseInt(
              product.assetAccount
            )},${Math.abs(row.total)},null,'${TRANSACTION_STATUS.LATEST}')`
          );
          await tx.insert(
            `insert into transaction_detials values(null,now(),now(),${transaction},${parseInt(
              userId
            )},${parseInt(branchId)},${parseInt(
              adjustmentAccount
            )},null,${Math.abs(row.total)},'${TRANSACTION_STATUS.LATEST}')`
          );
        }
      }
    });
    res.status(201).json({
      success: true,
      message: "Adjustment created successfully.",
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

exports.createValueAdjustment = async function (req, res) {
  try {
    let {
      date,
      adjustmentType,
      adjustmentAccount,
      adjustmentAmount,
      userId,
      rows,
    } = req.body;

    await mydb.transaction(async (tx) => {
      const transaction = await tx.insert(
        `insert into transaction values(null,'${TRANSACTION_TYPES.INVENTORY_ADJUSTMENT}','',now(),now())`
      );

      const hqBranch = await tx.getrow(
        'select * from branches where type="hq"'
      );

      const adjustment = await tx.insert(
        `insert into inventory_adjustment values(null,${transaction},${parseInt(
          userId
        )},${parseInt(hqBranch.id)},'${adjustmentType}',${parseFloat(
          adjustmentAmount
        )},'${date}','${TRANSACTION_STATUS.LATEST}',now(),now())`
      );

      for (const row of rows) {
        const product = await mydb.getrow(
          `select * from products where id = ${parseInt(row.productId)}`
        );

        const division = parseFloat(row.newValue) / product.qtyOnHand;
        const newAvgCost = Math.trunc(division * 100) / 100;

        await mydb.update(
          `update products set avgCost=${parseFloat(
            newAvgCost
          )} where id = ${parseInt(row.productId)}`
        );

        await tx.insert(
          `insert into inventory_adjustment_details values(null,${adjustment},${parseInt(
            row.productId
          )},null,
              null,${parseFloat(row.totalValue)},${parseFloat(row.newValue)},${
            product.assetAccount
          },${parseInt(adjustmentAccount)},'${
            TRANSACTION_STATUS.LATEST
          }',now(),now())`
        );

        const account = await mydb.getrow(`
               SELECT acc.accountName,atp.typeName FROM accounts acc
              LEFT JOIN account_types atp on acc.accountType = atp.id
              WHERE acc.id = ${parseInt(adjustmentAccount)}
            `);

        if (account.typeName == DEFAULT_ACCOUNT_TYPES.EXPENSE) {
          await tx.insert(
            `insert into transaction_detials values(null,now(),now(),${transaction},${parseInt(
              userId
            )},${parseInt(hqBranch.id)},${parseInt(
              adjustmentAccount
            )},${Math.abs(row.difference)},null,'${TRANSACTION_STATUS.LATEST}')`
          );
          await tx.insert(
            `insert into transaction_detials values(null,now(),now(),${transaction},${parseInt(
              userId
            )},${parseInt(hqBranch.id)},${product.assetAccount},null,${Math.abs(
              row.difference
            )},'${TRANSACTION_STATUS.LATEST}')`
          );
        }

        if (account.typeName == DEFAULT_ACCOUNT_TYPES.INCOME) {
          await tx.insert(
            `insert into transaction_detials values(null,now(),now(),${transaction},${parseInt(
              userId
            )},${parseInt(hqBranch.id)},${parseInt(
              product.assetAccount
            )},${Math.abs(row.difference)},null,'${TRANSACTION_STATUS.LATEST}')`
          );
          await tx.insert(
            `insert into transaction_detials values(null,now(),now(),${transaction},${parseInt(
              userId
            )},${parseInt(hqBranch.id)},${parseInt(
              adjustmentAccount
            )},null,${Math.abs(row.difference)},'${TRANSACTION_STATUS.LATEST}')`
          );
        }
      }
    });
    res.status(201).json({
      success: true,
      message: "Adjustment created successfully.",
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
