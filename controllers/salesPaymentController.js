const mydb = require("../config/database.js");
const {
  TRANSACTION_TYPES,
  DEFAULT_ACCOUNTS,
  DEFAULT_ACCOUNT_TYPES,
  TRANSACTION_STATUS,
} = require("../utils/transactionUtils.js");

exports.getAllSalesPayments = async function (req, res) {
  try {
    let salesPayments = await mydb.getall(`
    SELECT pp.id,p.id saleId,p.salesNo,pp.createdAt,a.id accountId,a.accountName,v.id customerId,v.name customerName,pp.amount FROM sales_payment pp
    LEFT JOIN sales p on pp.sales_id = p.id
    LEFT JOIN customers v on pp.customer_id = v.id
    LEFT JOIN accounts a on pp.account_id = a.id
    WHERE pp.status = 'Latest'
    `);
    res.json({
      success: true,
      salesPayments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error,
    });
  }
};

exports.getSalesPayment = async function (req, res) {
  try {
    let product = await SalesPayment.findOne({
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

exports.createSalesPayment = async function (req, res) {
  try {
    let { customerId, userId, saleId, paidAmount, accountId } = req.body;

    await mydb.transaction(async (tx) => {
      const transaction = await tx.insert(
        `insert into transaction values(null,'${TRANSACTION_TYPES.SALES_PAMENT}','',now(),now())`
      );

      await tx.insert(
        `insert into sales_payment values(null,${transaction},${saleId},${parseInt(
          customerId
        )},${parseInt(userId)},${accountId},${parseFloat(paidAmount)},'${
          TRANSACTION_STATUS.LATEST
        }','',now(),now())`
      );

      // create transaction
      await tx.insert(
        `insert into transaction_detials values(null,now(),now(),${transaction},${parseInt(
          userId
        )},${parseInt(accountId)},${parseFloat(paidAmount)},null,'${
          TRANSACTION_STATUS.LATEST
        }')`
      );
      await tx.insert(
        `insert into transaction_detials values(null,now(),now(),${transaction},${parseInt(
          userId
        )},${parseInt(DEFAULT_ACCOUNTS.ACCOUNT_RECEIVABLE)},null,${parseFloat(
          paidAmount
        )},'${TRANSACTION_STATUS.LATEST}')`
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

exports.updateSalesPayment = async function (req, res) {
  try {
    let { customerId, userId, saleId, paidAmount, accountId } = req.body;

    await mydb.transaction(async (tx) => {
      const payment = await tx.getrow(
        `select * from sales_payment where id=${parseInt(req.params.id)}`
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
        update sales_payment set status='${TRANSACTION_STATUS.PRIOR}',
        user_id=${parseInt(userId)}
        where id=${payment.id}
        `);

      await tx.insert(
        `insert into sales_payment values(null,${
          payment.transaction_id
        },${saleId},${parseInt(customerId)},${parseInt(
          userId
        )},${accountId},${parseFloat(paidAmount)},'${
          TRANSACTION_STATUS.LATEST
        }','',now(),now())`
      );

      // create transaction
      await tx.insert(
        `insert into transaction_detials values(null,now(),now(),${
          payment.transaction_id
        },${parseInt(userId)},${parseInt(accountId)},${parseFloat(
          paidAmount
        )},null,'${TRANSACTION_STATUS.LATEST}')`
      );
      await tx.insert(
        `insert into transaction_detials values(null,now(),now(),${
          payment.transaction_id
        },${parseInt(userId)},${parseInt(
          DEFAULT_ACCOUNTS.ACCOUNT_RECEIVABLE
        )},null,${parseFloat(paidAmount)},'${TRANSACTION_STATUS.LATEST}')`
      );
      res.status(200).json({
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

exports.deleteSalesPayment = async function (req, res) {
  try {
    const { paymentId, userId } = req.body;
    await mydb.transaction(async (tx) => {
      const payment = await tx.getrow(
        `select * from sales_payment where id=${parseInt(paymentId)}`
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
        update sales_payment set status='${TRANSACTION_STATUS.PRIOR}',
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

// sales return apyment

exports.createSalesReturnPayment = async function (req, res) {
  try {
    let { customerId, userId, return_id, paidAmount, accountId } = req.body;

    await mydb.transaction(async (tx) => {
      const transaction = await tx.insert(
        `insert into transaction values(null,'${TRANSACTION_TYPES.SALES_RETURN_PAYMENT}','',now(),now())`
      );

      await tx.insert(
        `insert into sales_return_payment values(null,${transaction},${return_id},${parseInt(
          customerId
        )},${parseInt(userId)},${accountId},${parseFloat(paidAmount)},'${
          TRANSACTION_STATUS.LATEST
        }','',now(),now())`
      );

      // create transaction
      await tx.insert(
        `insert into transaction_detials values(null,now(),now(),${transaction},${parseInt(
          userId
        )},${parseInt(DEFAULT_ACCOUNTS.ACCOUNT_RECEIVABLE)},${parseFloat(
          paidAmount
        )},null,'${TRANSACTION_STATUS.LATEST}')`
      );
      await tx.insert(
        `insert into transaction_detials values(null,now(),now(),${transaction},${parseInt(
          userId
        )},${parseInt(accountId)},null,${parseFloat(paidAmount)},'${
          TRANSACTION_STATUS.LATEST
        }')`
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

exports.updateSalesReturnPayment = async function (req, res) {
  try {
    let { customerId, userId, return_id, paidAmount, accountId } = req.body;

    await mydb.transaction(async (tx) => {
      const payment = await tx.getrow(
        `select * from sales_return_payment where id=${parseInt(req.params.id)}`
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
        update sales_return_payment set status='${TRANSACTION_STATUS.PRIOR}',
        user_id=${parseInt(userId)}
        where id=${payment.id}
        `);

      await tx.insert(
        `insert into sales_return_payment values(null,${
          payment.transaction_id
        },${return_id},${parseInt(customerId)},${parseInt(
          userId
        )},${accountId},${parseFloat(paidAmount)},'${
          TRANSACTION_STATUS.LATEST
        }','',now(),now())`
      );

      // create transaction
      await tx.insert(
        `insert into transaction_detials values(null,now(),now(),${
          payment.transaction_id
        },${parseInt(userId)},${parseInt(
          DEFAULT_ACCOUNTS.ACCOUNT_RECEIVABLE
        )},${parseFloat(paidAmount)},null,'${TRANSACTION_STATUS.LATEST}')`
      );
      await tx.insert(
        `insert into transaction_detials values(null,now(),now(),${
          payment.transaction_id
        },${parseInt(userId)},${parseInt(accountId)},null,${parseFloat(
          paidAmount
        )},'${TRANSACTION_STATUS.LATEST}')`
      );
      res.status(200).json({
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

exports.getAllSalesPaymentReturns = async function (req, res) {
  try {
    let salesReturnPayments = await mydb.getall(`
    SELECT srp.id,sr.id salesReturnId,s.salesNo,srp.createdAt,a.id accountId,a.accountName,c.id customerId,c.name customerName,srp.amount FROM sales_return_payment srp
    LEFT JOIN sales_return sr  on srp.return_id = sr.id
    LEFT JOIN sales s on sr.sales_id = s.id 
    LEFT JOIN customers c on srp.customer_id = c.id
    LEFT JOIN accounts a on srp.account_id = a.id
    WHERE srp.status = 'Latest'
    `);
    res.json({
      success: true,
      salesReturnPayments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error,
    });
  }
};

exports.deleteSalesReturnPayment = async function (req, res) {
  try {
    const { paymentId, userId } = req.body;
    await mydb.transaction(async (tx) => {
      const payment = await tx.getrow(
        `select * from sales_return_payment where id=${parseInt(paymentId)}`
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
        update sales_return_payment set status='${TRANSACTION_STATUS.PRIOR}',
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
