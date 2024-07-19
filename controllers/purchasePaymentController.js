const mydb = require("../config/database.js");
const {
  TRANSACTION_TYPES,
  DEFAULT_ACCOUNTS,
  DEFAULT_ACCOUNT_TYPES,
  TRANSACTION_STATUS,
} = require("../utils/transactionUtils.js");

exports.getAllPurchasePayments = async function (req, res) {
  try {
    let purchasePayments = await mydb.getall(`
    SELECT pp.id,p.id purchaseId,p.purchaseNo,pp.createdAt,a.id accountId,a.accountName,v.id vendorId,
    v.name vendorName,pp.amount,brn.id branchId,brn.branch_name branchName FROM purchase_payments pp
    LEFT JOIN purchases p on pp.purchase_id = p.id
    LEFT JOIN vendors v on pp.vendor_id = v.id
    LEFT JOIN accounts a on pp.account_id = a.id
    LEFT JOIN branches brn on pp.branch_id = brn.id
    WHERE pp.status = '${TRANSACTION_STATUS.LATEST}'
    `);
    res.json({
      success: true,
      purchasePayments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error,
    });
  }
};

exports.getPurchasePayment = async function (req, res) {
  try {
    let product = await PurchasePayment.findOne({
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

exports.createPurchasePayment = async function (req, res) {
  try {
    let {
      userId,
      branchId,
      vendorId,
      purchaseId,
      paidAmount,
      accountId,
      discount,
      discountAccountId,
    } = req.body;

    await mydb.transaction(async (tx) => {
      const transaction = await tx.insert(
        `insert into transaction values(null,'${TRANSACTION_TYPES.PURCHASE_PAYMENT}','',now(),now())`
      );

      const hqBranch = await tx.getrow(
        'select * from branches where type="hq"'
      );

      await tx.insert(
        `insert into purchase_payments values(null,${transaction},${purchaseId},${parseInt(
          vendorId
        )},${parseInt(userId)},${parseInt(
          hqBranch.id
        )},${accountId},${parseFloat(paidAmount)},${
          discount ? parseFloat(discount) : 0
        },${discountAccountId ? parseInt(discountAccountId) : null},'${
          TRANSACTION_STATUS.LATEST
        }','',now(),now())`
      );

      // create transaction
      await tx.insert(
        `insert into transaction_detials values(null,now(),now(),${transaction},${parseInt(
          userId
        )},${parseInt(hqBranch.id)},${parseInt(
          DEFAULT_ACCOUNTS.ACCOUNT_PAYABLE
        )},${parseFloat(paidAmount) + (parseFloat(discount) || 0)},null,'${
          TRANSACTION_STATUS.LATEST
        }')`
      );
      await tx.insert(
        `insert into transaction_detials values(null,now(),now(),${transaction},${parseInt(
          userId
        )},${parseInt(hqBranch.id)},${parseInt(accountId)},null,${parseFloat(
          paidAmount
        )},'${TRANSACTION_STATUS.LATEST}')`
      );

      if (parseFloat(discount) > 0) {
        await tx.insert(
          `insert into transaction_detials values(null,now(),now(),${transaction},${parseInt(
            userId
          )},${parseInt(hqBranch.id)},${parseInt(
            discountAccountId
          )},null,${parseFloat(discount)},'${TRANSACTION_STATUS.LATEST}')`
        );
      }

      res.status(201).json({
        success: true,
        message: "Payment created successfully.",
      });
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

exports.updatePurchasePayment = async function (req, res) {
  try {
    let { userId, branchId, vendorId, purchaseId, paidAmount, accountId } =
      req.body;

    await mydb.transaction(async (tx) => {
      const payment = await tx.getrow(
        `select * from purchase_payments where id=${parseInt(req.params.id)}`
      );
      if (!payment) {
        return res.json({
          success: false,
          message: "this payment does not exist",
        });
      }

      await tx.update(`update transaction_detials set status='${TRANSACTION_STATUS.PRIOR}' 
        where transaction_id=${payment.transaction_id}`);

      await tx.update(`
        update purchase_payments set status='${TRANSACTION_STATUS.PRIOR}'
        where id=${payment.id}
        `);

      const hqBranch = await tx.getrow(
        'select * from branches where type="hq"'
      );

      await tx.insert(
        `insert into purchase_payments values(null,${
          payment.transaction_id
        },${purchaseId},${parseInt(vendorId)},${parseInt(userId)},${parseInt(
          hqBranch.id
        )},${accountId},${parseFloat(paidAmount)},'${
          TRANSACTION_STATUS.LATEST
        }','',now(),now())`
      );

      // create transaction
      await tx.insert(
        `insert into transaction_detials values(null,now(),now(),${
          payment.transaction_id
        },${parseInt(userId)},${parseInt(hqBranch.id)},${parseInt(
          DEFAULT_ACCOUNTS.ACCOUNT_PAYABLE
        )},${parseFloat(paidAmount)},null,'${TRANSACTION_STATUS.LATEST}')`
      );
      await tx.insert(
        `insert into transaction_detials values(null,now(),now(),${
          payment.transaction_id
        },${parseInt(userId)},${parseInt(hqBranch.id)},${parseInt(
          accountId
        )},null,${parseFloat(paidAmount)},'${TRANSACTION_STATUS.LATEST}')`
      );
      res.status(201).json({
        success: true,
        message: "Payment updated successfully.",
      });
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

exports.deletePurchasePayment = async function (req, res) {
  try {
    let { userId, paymentId } = req.body;
    await mydb.transaction(async (tx) => {
      const payment = await tx.getrow(
        `select * from purchase_payments where id=${parseInt(paymentId)}`
      );
      if (!payment) {
        return res.json({
          success: false,
          message: "this payment does not exist",
        });
      }

      await tx.update(`update transaction_detials set status='${
        TRANSACTION_STATUS.PRIOR
      }',
      user_id=${parseInt(userId)} 
        where transaction_id=${payment.transaction_id}`);

      await tx.update(`
        update purchase_payments set status='${TRANSACTION_STATUS.PRIOR}',
        user_id=${parseInt(userId)}
        where id=${payment.id}
        `);

      res.status(200).json({
        success: true,
        message: "Payment deleted successfully.",
      });
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

exports.createPurchaseReturnPayment = async function (req, res) {
  try {
    let { vendorId, userId, branchId, returnId, paidAmount, accountId } =
      req.body;

    await mydb.transaction(async (tx) => {
      const transaction = await tx.insert(
        `insert into transaction values(null,'${TRANSACTION_TYPES.PURCHASE_RETURN_PAYMENT}','',now(),now())`
      );

      const hqBranch = await tx.getrow(
        'select * from branches where type="hq"'
      );

      await tx.insert(
        `insert into purchase_return_payment values(null,${transaction},${returnId},${parseInt(
          vendorId
        )},${parseInt(userId)},${parseInt(
          hqBranch.id
        )},${accountId},${parseFloat(paidAmount)},'${
          TRANSACTION_STATUS.LATEST
        }','',now(),now())`
      );

      // create transaction
      await tx.insert(
        `insert into transaction_detials values(null,now(),now(),${transaction},${parseInt(
          userId
        )},${parseInt(hqBranch.id)},${parseInt(accountId)},${parseFloat(
          paidAmount
        )},null,'${TRANSACTION_STATUS.LATEST}')`
      );
      await tx.insert(
        `insert into transaction_detials values(null,now(),now(),${transaction},${parseInt(
          userId
        )},${parseInt(hqBranch.id)},${parseInt(
          DEFAULT_ACCOUNTS.ACCOUNT_PAYABLE
        )},null,${parseFloat(paidAmount)},'${TRANSACTION_STATUS.LATEST}')`
      );
      res.status(201).json({
        success: true,
        message: "Payment created successfully.",
      });
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

exports.getAllPurchasePaymentReturns = async function (req, res) {
  try {
    let purchaseReturnPayments = await mydb.getall(`
    SELECT pp.id,p.id purchaseId,pur.purchaseNo,pp.createdAt,a.id accountId,a.accountName,v.id vendorId,v.name vendorName,pp.amount FROM purchase_return_payment pp
    LEFT JOIN purchase_return p on pp.return_id = p.id
    LEFT JOIN purchases pur on p.purchase_id = pur.id 
    LEFT JOIN vendors v on pp.vendor_id = v.id
    LEFT JOIN accounts a on pp.account_id = a.id
    WHERE pp.status = 'Latest'
    `);
    res.json({
      success: true,
      purchaseReturnPayments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error,
    });
  }
};

exports.updatePurchaseReturnPayment = async function (req, res) {
  try {
    let { vendorId, userId, branchId, returnId, paidAmount, accountId } =
      req.body;

    await mydb.transaction(async (tx) => {
      const payment = await tx.getrow(
        `select * from purchase_return_payment where id=${parseInt(
          req.params.id
        )}`
      );
      if (!payment) {
        return res.json({
          success: false,
          message: "this payment does not exist",
        });
      }

      const hqBranch = await tx.getrow(
        'select * from branches where type="hq"'
      );

      await tx.update(`update transaction_detials set status='${TRANSACTION_STATUS.PRIOR}'
        where transaction_id=${payment.transaction_id}`);

      await tx.update(`
        update purchase_return_payment set status='${TRANSACTION_STATUS.PRIOR}'
        where id=${payment.id}
        `);

      await tx.insert(
        `insert into purchase_return_payment values(null,${
          payment.transaction_id
        },${returnId},${parseInt(vendorId)},${parseInt(userId)},${parseInt(
          hqBranch.id
        )},${accountId},${parseFloat(paidAmount)},'${
          TRANSACTION_STATUS.LATEST
        }','',now(),now())`
      );

      // create transaction
      await tx.insert(
        `insert into transaction_detials values(null,now(),now(),${
          payment.transaction_id
        },${parseInt(userId)},${parseInt(hqBranch.id)},${parseInt(
          accountId
        )},${parseFloat(paidAmount)},null,'${TRANSACTION_STATUS.LATEST}')`
      );
      await tx.insert(
        `insert into transaction_detials values(null,now(),now(),${
          payment.transaction_id
        },${parseInt(userId)},${parseInt(hqBranch.id)},${parseInt(
          DEFAULT_ACCOUNTS.ACCOUNT_PAYABLE
        )},null,${parseFloat(paidAmount)},'${TRANSACTION_STATUS.LATEST}')`
      );
      res.status(201).json({
        success: true,
        message: "Payment updated successfully.",
      });
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

exports.deletePurchaseReturnPayment = async function (req, res) {
  try {
    await mydb.transaction(async (tx) => {
      const payment = await tx.getrow(
        `select * from purchase_return_payment where id=${parseInt(
          req.params.id
        )}`
      );
      if (!payment) {
        return res.json({
          success: false,
          message: "this payment does not exist",
        });
      }

      await tx.update(`update transaction_detials set status='${TRANSACTION_STATUS.PRIOR}' 
        where transaction_id=${payment.transaction_id}`);

      await tx.update(`
        update purchase_return_payment set status='${TRANSACTION_STATUS.PRIOR}'
        where id=${payment.id}
        `);

      res.status(200).json({
        success: true,
        message: "Payment deleted successfully.",
      });
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
