const mydb = require("../config/database.js");
const {
  TRANSACTION_TYPES,
  DEFAULT_ACCOUNTS,
  DEFAULT_ACCOUNT_TYPES,
  TRANSACTION_STATUS,
} = require("../utils/transactionUtils.js");

exports.getAllProducts = async function (req, res) {
  try {
    let products = await mydb.getall("select * from products");
    res.json({
      success: true,
      products,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error,
    });
  }
};

exports.getProduct = async function (req, res) {
  try {
    let product = await Product.findOne({
      _id: mongoose.Types.ObjectId.createFromHexString(req.params.id),
    });
    res.json({
      success: true,
      product,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: error,
    });
  }
};

exports.createProduct = async function (req, res) {
  try {
    let {
      name,
      image,
      qtyOnHand,
      costPrice,
      sellingPrice,
      costOfGoodsSoldAccount,
      assetAccount,
      incomeAccount,
      userId,
      branchId,
    } = req.body;

    if (!costOfGoodsSoldAccount)
      return res.json({
        success: false,
        message: "must have cost of goods sold account",
      });
    if (!assetAccount)
      return res.json({
        success: false,
        message: "must have asset  account",
      });
    if (!incomeAccount)
      return res.json({
        success: false,
        message: "must have income account",
      });

    let product = await mydb.getall(
      `select * from products where name='${name}'`
    );

    if (product.length)
      return res.json({ success: false, message: "Product Already Exist" });

    // 1 - create product , if qtyonhand > 0 create inventory adjust
    // transaction debit inventory account selected, credit opening balance equity

    qtyOnHand = qtyOnHand || 0;
    costPrice = costPrice || 0;
    sellingPrice = sellingPrice || 0;

    await mydb.transaction(async (tx) => {
      await tx.insert(
        `insert into products values(null,'${name}',${qtyOnHand},${costPrice},${sellingPrice},
        ${parseInt(costOfGoodsSoldAccount)},${parseInt(
          assetAccount
        )},${parseInt(incomeAccount)},now(),now())`
      );

      if (qtyOnHand > 0) {
        const transaction = await tx.insert(
          `insert into transaction values(null,'${TRANSACTION_TYPES.INVENTORY_ADJUSTMENT}','opening balance',now(),now())`
        );
        const transactionAmount = qtyOnHand * costPrice;

        await tx.insert(
          `insert into transaction_detials values(null,now(),now(),${transaction},${parseInt(
            userId
          )},${parseInt(branchId)},${parseInt(
            assetAccount
          )},${transactionAmount},null,'${TRANSACTION_STATUS.LATEST}')`
        );
        await tx.insert(
          `insert into transaction_detials values(null,now(),now(),${transaction},${parseInt(
            userId
          )},${parseInt(branchId)},${
            DEFAULT_ACCOUNTS.OPENING_BALANCE_EQUITY
          },null,${transactionAmount},'${TRANSACTION_STATUS.LATEST}')`
        );
      }
    });
    res.status(201).json({
      success: true,
      message: "Product created successfully.",
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

exports.updateProduct = async function (req, res) {
  try {
    const {
      name,
      sellingPrice,
      costOfGoodsSoldAccount,
      assetAccount,
      incomeAccount,
    } = req.body;

    if (!costOfGoodsSoldAccount)
      return res.json({
        success: false,
        message: "must have cost of goods sold account",
      });
    if (!assetAccount)
      return res.json({ success: false, message: "must have asset  account" });
    if (!incomeAccount)
      return res.json({ success: false, message: "must have income account" });

    let product = await mydb.getall(
      `select * from products where id=${parseInt(req.params.id)}`
    );
    if (!product.length)
      return res.json({ success: false, message: "Product Does not Exist" });

    await mydb.update(`update products set name='${name}',
    sellingPrice=${sellingPrice},
    costOfGoodsSoldAccount=${parseInt(costOfGoodsSoldAccount)},
    assetAccount=${parseInt(assetAccount)},
    incomeAccount=${parseInt(incomeAccount)}
     where id=${parseInt(req.params.id)}`);

    res.status(201).json({
      success: true,
      message: "Product updated successfully.",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: error,
    });
  }
};

exports.deleteProduct = async function (req, res) {
  try {
    let product = await mydb.getrow(
      `select * from products where id=${parseInt(req.params.id)}`
    );

    if (!product)
      return res.json({ success: false, message: "Product Does not Exist" });

    if (product.qtyOnHand > 0)
      return res.json({
        success: false,
        message: "Can not delete product in stock",
      });

    await mydb.delete(
      `delete from products where id=${parseInt(req.params.id)}`
    );

    res.status(200).json({
      success: true,
      message: "Product deleted successfully.",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: error,
    });
  }
};

exports.transferProduct = async function (req, res) {
  try {
    const { date, userId, rows } = req.body;

    const transfer = await mydb.insert(
      `insert into inventory_transfer values(null,'${date}',${parseInt(
        userId
      )},'${TRANSACTION_STATUS.LATEST}')`
    );

    await mydb.transaction(async (tx) => {
      for (const row of rows) {
        const { productId, fromBranchId, toBranchId, qty } = row;

        await tx.insert(
          `insert into products_branches values(null,${transfer},${parseInt(
            productId
          )},${parseInt(fromBranchId)},${parseInt(-qty)},'${
            TRANSACTION_STATUS.LATEST
          }',now(),now())`
        );

        await tx.insert(
          `insert into products_branches values(null,${transfer},${parseInt(
            productId
          )},${parseInt(toBranchId)},${parseInt(qty)},'${
            TRANSACTION_STATUS.LATEST
          }',now(),now())`
        );

        await tx.insert(`insert into inventory_transfer_detail 
        values(null,${transfer},${parseInt(productId)},${parseInt(
          fromBranchId
        )},
        ${parseInt(toBranchId)},${parseInt(userId)},${parseInt(qty)},
      '${TRANSACTION_STATUS.LATEST}','${date}',now(),now())`);
      }

      res.json({
        success: true,
        message: "successfully transfered inventories",
      });
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
    throw err;
  }
};

exports.updateTransferProduct = async function (req, res) {
  try {
    const { transferId, date, userId, rows } = req.body;

    // substract from product_branches

    await mydb.transaction(async (tx) => {
      await mydb.update(
        `update inventory_transfer set date='${date}',user_id=${parseInt(
          userId
        )}
        where id=${parseInt(transferId)}`
      );

      await tx.update(
        `update products_branches set status='${TRANSACTION_STATUS.PRIOR}',
        updatedAt=now()
        where transfer_id=${parseInt(transferId)}`
      );

      await tx.update(
        `update inventory_transfer_detail set status='${
          TRANSACTION_STATUS.PRIOR
        }',
        updatedAt=now()
        where transfer_id=${parseInt(transferId)}`
      );

      for (const row of rows) {
        const { productId, fromBranchId, toBranchId, qty } = row;

        await tx.insert(
          `insert into products_branches values(null,${parseInt(
            transferId
          )},${parseInt(productId)},${parseInt(fromBranchId)},${parseInt(
            -qty
          )},'${TRANSACTION_STATUS.LATEST}',now(),now())`
        );

        await tx.insert(
          `insert into products_branches values(null,${parseInt(
            transferId
          )},${parseInt(productId)},${parseInt(toBranchId)},${parseInt(qty)},'${
            TRANSACTION_STATUS.LATEST
          }',now(),now())`
        );

        await tx.insert(`insert into inventory_transfer_detail 
        values(null,${transferId},${parseInt(productId)},${parseInt(
          fromBranchId
        )},
        ${parseInt(toBranchId)},${parseInt(userId)},${parseInt(qty)},
      '${TRANSACTION_STATUS.LATEST}','${date}',now(),now())`);
      }

      res.json({
        success: true,
        message: "successfully transfered inventories",
      });
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
    throw err;
  }
};

exports.getProductsTransfered = async function (req, res) {
  try {
    const transfers = await mydb.getall(
      `select * from inventory_transfer where status='Latest'`
    );

    let result = [];

    for (const t of transfers) {
      const transfersDetails = await mydb.getall(`
          SELECT trn.id,trn.transfer_id,p.name,trn.qty,br1.branch_name fromBranch,br2.branch_name toBranch,trn.date FROM inventory_transfer_detail trn
      LEFT JOIN branches br1 on trn.from_branch_id = br1.id
      LEFT JOIN branches br2 on trn.to_branch_id = br2.id
      LEFT JOIN products p on trn.product_id = p.id
      WHERE trn.status = 'Latest' and trn.transfer_id=${t.id} ORDER BY trn.transfer_id`);

      result.push({
        ...t,
        details: transfersDetails,
      });
    }

    res.json({
      success: true,
      transfers: result,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
    throw err;
  }
};

exports.getProductsTransferedById = async function (req, res) {
  try {
    const { transferId } = req.body;

    const transfers =
      await mydb.getall(`SELECT trn.id,p.id productId,p.name productName,trn.qty,br1.id fromBranchId,br1.branch_name fromBranch,br2.id toBranchId, br2.branch_name toBranch,trn.date FROM inventory_transfer_detail trn
LEFT JOIN branches br1 on trn.from_branch_id = br1.id
LEFT JOIN branches br2 on trn.to_branch_id = br2.id
LEFT JOIN products p on trn.product_id = p.id
WHERE trn.status='${
        TRANSACTION_STATUS.LATEST
      }' and trn.transfer_id = ${parseInt(transferId)}`);

    res.json({
      success: true,
      transfers,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
    throw err;
  }
};

exports.detleTransferById = async function (req, res) {
  try {
    const { transferId } = req.body;

    const transfer = await mydb.getrow(`select * from inventory_transfer_detail
WHERE id = ${parseInt(transferId)}`);

    if (!transfer)
      return res.status(404).json({ success: true, message: "does not exist" });

    await mydb.transaction(async (tx) => {
      await tx.update(
        `update inventory_transfer set 
        status='${TRANSACTION_STATUS.PRIOR}' where id=${transfer.id}`
      );

      await tx.update(
        `update inventory_transfer_detail set updatedAt=now(),status='${TRANSACTION_STATUS.PRIOR}' where transfer_id=${transfer.id}`
      );

      await tx.delete(
        `update products_branches set updatedAt=now(),status='${TRANSACTION_STATUS.PRIOR}' where transfer_id=${transfer.id}`
      );
      res.json({
        success: true,
        message: "Deleted transfer succesfull",
      });
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
    throw err;
  }
};
