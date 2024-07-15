const mydb = require("../config/database.js");
const {
  TRANSACTION_TYPES,
  DEFAULT_ACCOUNTS,
  DEFAULT_ACCOUNT_TYPES,
  TRANSACTION_STATUS,
} = require("../utils/transactionUtils.js");

exports.getAllPurchases = async function (req, res) {
  try {
    let purchases = await mydb.getall(`
    SELECT p.id,p.purchaseNo,p.purchase_date,p.status,v.name,p.subtotal,p.discount,p.total,SUM(py.amount) paid FROM purchases p 
LEFT JOIN vendors v on p.vendor_id = v.id
LEFT JOIN purchase_payments py ON py.purchase_id = p.id and py.status = 'Latest'
WHERE p.status = '${TRANSACTION_STATUS.LATEST}'
GROUP BY p.id
    `);
    res.json({
      success: true,
      purchases,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error,
    });
  }
};

exports.getPurchase = async function (req, res) {
  try {
    let purchase = await mydb.getrow(
      `select p.id,p.purchaseNo,p.vendor_id,p.discount,p.purchase_date,p.discount_account,
      p.paid_account,v.name,a.accountName discountAccountName,
      a2.accountName paidAccountName from purchases p 
      left join vendors v on p.vendor_id = v.id
      LEFT JOIN accounts a on p.discount_account = a.id
      LEFT JOIN accounts a2 on p.paid_account = a2.id
      where p.id=${parseInt(req.params.id)}`
    );

    let purchaseDetails = await mydb.getall(
      `SELECT pu.product_id,p.name,pu.qty,pu.price FROM purchase_details pu
      LEFT JOIN products p on pu.product_id = p.id where purchase_id=${parseInt(
        req.params.id
      )} and pu.status='${TRANSACTION_STATUS.LATEST}'`
    );

    let paid = await mydb.getrow(
      `select sum(amount) amount from purchase_payments
        where purchase_id=${parseInt(req.params.id)}`
    );

    res.json({
      success: true,
      transactionId: purchase.transaction_id,
      purchaseNo: purchase.purchaseNo,
      purchaseDate: purchase.purchase_date,
      vendorId: purchase.vendor_id,
      vendorName: purchase.name,
      discountAccountId: purchase.discount_account,
      discountAccountName: purchase.discountAccountName,
      paidAccountId: purchase.paid_account,
      paidAccountName: purchase.paidAccountName,
      discount: purchase.discount,
      rows: purchaseDetails,
      paid: paid.amount,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: error,
    });
  }
};

exports.createPurchase = async function (req, res) {
  try {
    let {
      purchaseNo,
      userId,
      vendorId,
      purchaseDate,
      selectedIncomeAccount,
      setlectedBankAccount,
      items,
      subTotal,
      discount,
      total,
      paid,
    } = req.body;

    await mydb.transaction(async (tx) => {
      // create transaction
      const transaction = await tx.insert(
        `insert into transaction values(null,'${TRANSACTION_TYPES.PURCHASE}','',now(),now())`
      );

      const purchase = await tx.insert(
        `insert into purchases values(null,'${purchaseNo}',${transaction},'${purchaseDate}',${parseInt(
          vendorId
        )},${parseInt(
          userId
        )},${selectedIncomeAccount},${setlectedBankAccount},${parseFloat(
          subTotal
        )},${parseFloat(discount)},${parseFloat(total)},'${
          TRANSACTION_STATUS.LATEST
        }','no memo')`
      );

      const hqBranch = await tx.getrow(
        'select * from branches where type="hq"'
      );

      for (const item of items) {
        // fetch the product of each row using product id

        await tx.insert(
          `insert into purchase_details values(null,${purchase},${parseInt(
            item.productId
          )},'${item.selectedProduct.label}',${parseInt(
            item.branchId
          )},${parseInt(item.qty)},${parseFloat(item.price)},'${
            TRANSACTION_STATUS.LATEST
          }',now(),now())`
        );

        await tx.insert(
          `insert into products_branches values(null,null,${
            item.productId
          },${parseInt(item.branchId)},${item.qty},'${
            TRANSACTION_STATUS.LATEST
          }',now(),now())`
        );

        const product = await tx.getrow(
          `select * from products where id=${parseInt(item.productId)}`
        );

        const newQtyOnHand = product.qtyOnHand + parseInt(item.qty);
        const newTotalCost =
          product.avgCost * product.qtyOnHand +
          parseFloat(item.qty * item.price);
        const newAvgCost = newTotalCost / newQtyOnHand;

        await tx.update(
          `update products set avgCost=${newAvgCost}, qtyOnHand=${newQtyOnHand} where id=${parseInt(
            item.productId
          )}`
        );
        // create transaction details
        // crediting account payable and debiting the product asset account
        await tx.insert(
          `insert into transaction_detials values(null,now(),now(),${transaction},${parseInt(
            userId
          )},${parseInt(item.branchId)},${parseInt(
            product.assetAccount
          )},${parseFloat(item.total)},null,'${TRANSACTION_STATUS.LATEST}')`
        );
        await tx.insert(
          `insert into transaction_detials values(null,now(),now(),${transaction},${parseInt(
            userId
          )},${parseInt(item.branchId)},${
            DEFAULT_ACCOUNTS.ACCOUNT_PAYABLE
          },null,${parseFloat(item.total)},'${TRANSACTION_STATUS.LATEST}')`
        );
      }

      if (discount > 0) {
        await tx.insert(
          `insert into transaction_detials values(null,now(),now(),${transaction},${parseInt(
            userId
          )},${parseInt(hqBranch.id)},${parseInt(
            DEFAULT_ACCOUNTS.ACCOUNT_PAYABLE
          )},${parseFloat(discount)},null,'${TRANSACTION_STATUS.LATEST}')`
        );
        await tx.insert(
          `insert into transaction_detials values(null,now(),now(),${transaction},${parseInt(
            userId
          )},${parseInt(hqBranch.id)},${parseInt(
            selectedIncomeAccount
          )},null,${parseFloat(discount)},'${TRANSACTION_STATUS.LATEST}')`
        );
      }

      if (parseFloat(paid) > 0) {
        // create purchase payment
        const paymentTransaction = await tx.insert(
          `insert into transaction values(null,'${TRANSACTION_TYPES.PURCHASE_PAYMENT}','',now(),now())`
        );

        await tx.insert(
          `insert into purchase_payments values(null,${paymentTransaction},${purchase},${parseInt(
            vendorId
          )},${parseInt(userId)},${parseInt(
            hqBranch.id
          )},${setlectedBankAccount},${parseFloat(paid)},'${
            TRANSACTION_STATUS.LATEST
          }','memory',now(),now())`
        );

        // create transaction
        await tx.insert(
          `insert into transaction_detials values(null,now(),now(),${paymentTransaction},${parseInt(
            userId
          )},${parseInt(hqBranch.id)},${parseInt(
            DEFAULT_ACCOUNTS.ACCOUNT_PAYABLE
          )},${parseFloat(paid)},null,'${TRANSACTION_STATUS.LATEST}')`
        );
        await tx.insert(
          `insert into transaction_detials values(null,now(),now(),${paymentTransaction},${parseInt(
            userId
          )},${parseInt(hqBranch.id)},${parseInt(
            setlectedBankAccount
          )},null,${parseFloat(paid)},'${TRANSACTION_STATUS.LATEST}')`
        );
      }
    });

    res.status(201).json({
      success: true,
      message: "Purchase created successfully.",
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

exports.cancelPurchase = async function (req, res) {
  try {
    let { purchaseId, userId } = req.body;
    await mydb.transaction(async (tx) => {
      const purchase = await tx.getrow(
        `select * from purchases where id=${parseInt(purchaseId)}`
      );

      if (!purchase) {
        return res.json({
          success: false,
          message: "purchase does not exist",
        });
      }

      await tx.update(
        `update purchases set 
        status='${TRANSACTION_STATUS.PRIOR}',
        user_id=${parseInt(userId)}
         where id=${purchase.id}`
      );

      await tx.update(
        `update transaction set updatedAt=now() where id=${purchase.transaction_id}`
      );

      await tx.update(
        `update transaction_detials set updatedAt=now(),status='${TRANSACTION_STATUS.PRIOR}'
        where transaction_id=${purchase.transaction_id}`
      );

      const purchaseItems = await tx.getall(
        `select * from purchase_details where purchase_id=${purchase.id}`
      );

      for (const purcahseItem of purchaseItems) {
        const product = await tx.getrow(
          `select * from products where id=${purcahseItem.product_id}`
        );
        const newQtyOnHand = product.qtyOnHand - purcahseItem.qty;
        const newAvgCost =
          product.avgCost -
          Math.round(
            ((purcahseItem.price * purcahseItem.qty) / product.qtyOnHand) * 100
          ) /
            100;
        await tx.update(
          `update products set qtyOnHand=${newQtyOnHand},avgCost=${newAvgCost} where id=${purcahseItem.product_id}`
        );

        await tx.insert(
          `insert into products_branches values(null,null,${parseInt(
            purcahseItem.product_id
          )},${parseInt(purcahseItem.branch_id)},${parseInt(
            -purcahseItem.qty
          )},'${TRANSACTION_STATUS.LATEST}',now(),now())`
        );
      }

      await tx.update(
        `update purchase_details set updatedAt=now(),status='${TRANSACTION_STATUS.PRIOR}'
        where purchase_id=${purchase.id}`
      );

      const purchasePayments = await tx.getall(
        `select * from purchase_payments where purchase_id=${purchase.id}`
      );

      for (const payment of purchasePayments) {
        await tx.update(
          `update transaction_detials set updatedAt=now(),user_id=${parseInt(
            userId
          )},status='${TRANSACTION_STATUS.PRIOR}'
          where transaction_id=${payment.transaction_id}`
        );
      }

      await tx.update(
        `update purchase_payments set updatedAt=now(),user_id=${parseInt(
          userId
        )},status='${TRANSACTION_STATUS.PRIOR}'
        where purchase_id=${purchase.id}`
      );

      res.json({
        success: true,
        message: "Succeffuly cancelled",
      });
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error,
    });
    throw error;
  }
};

exports.updatePurchase = async function (req, res) {
  try {
    let {
      purchaseNo,
      vendorId,
      purchaseDate,
      selectedIncomeAccount,
      setlectedBankAccount,
      items,
      subTotal,
      discount,
      total,
      paid,
    } = req.body;

    await mydb.transaction(async (tx) => {
      const purchase = await tx.getrow(
        `select * from purchases where id=${parseInt(req.params.id)}`
      );

      if (!purchase) {
        return res.json({
          success: false,
          message: "purchase does not exist",
        });
      }

      await tx.update(
        `update purchases set 
        purchaseNo='${purchaseNo}',
        purchase_date='${purchaseDate}',
        vendor_id=${vendorId},
        discount_account=${selectedIncomeAccount},
        paid_account=${setlectedBankAccount},
        subtotal=${parseFloat(subTotal)},
        discount=${parseFloat(discount)},
        total=${parseFloat(total)}
         where id=${purchase.id}`
      );

      await tx.update(
        `update transaction set updatedAt=now() where id=${purchase.transaction_id}`
      );

      await tx.update(
        `update transaction_detials set updatedAt=now(),status='${TRANSACTION_STATUS.PRIOR}'
        where transaction_id=${purchase.transaction_id}`
      );

      const purchaseItems = await tx.getall(
        `select * from purchase_details where purchase_id=${purchase.id}`
      );

      for (const purcahseItem of purchaseItems) {
        const product = await tx.getrow(
          `select * from products where id=${purcahseItem.product_id}`
        );
        const newQtyOnHand = product.qtyOnHand - purcahseItem.qty;
        const newAvgCost =
          product.avgCost -
          Math.round((purcahseItem.price / product.qtyOnHand) * 100) / 100;
        await tx.update(
          `update products set qtyOnHand=${newQtyOnHand},avgCost=${newAvgCost} where id=${purcahseItem.product_id}`
        );
      }

      await tx.update(
        `update purchase_details set updatedAt=now(),status='${TRANSACTION_STATUS.PRIOR}'
        where purchase_id=${purchase.id}`
      );

      items.forEach(async (item) => {
        // fetch the product of each row using product id

        await tx.insert(
          `insert into purchase_details values(null,${purchase.id},${parseInt(
            item.productId
          )},'${item.selectedProduct.label}',${parseInt(item.qty)},${parseFloat(
            item.price
          )},'${TRANSACTION_STATUS.LATEST}',now(),now())`
        );

        const product = await tx.getrow(
          `select * from products where id=${parseInt(item.productId)}`
        );

        const newQtyOnHand = product.qtyOnHand + parseInt(item.qty);
        const newTotalCost =
          product.avgCost * product.qtyOnHand +
          parseFloat(item.qty * item.price);
        const newAvgCost = newTotalCost / newQtyOnHand;

        await tx.update(
          `update products set avgCost=${newAvgCost}, qtyOnHand=${newQtyOnHand} where id=${parseInt(
            item.productId
          )}`
        );
        // create transaction details
        // crediting account payable and debiting the product asset account
        await tx.insert(
          `insert into transaction_detials values(null,now(),now(),${
            purchase.transaction_id
          },"hudeifa",${parseInt(product.assetAccount)},${parseFloat(
            item.total
          )},null,'${TRANSACTION_STATUS.LATEST}')`
        );
        await tx.insert(
          `insert into transaction_detials values(null,now(),now(),${
            purchase.transaction_id
          },"hudeifa",${DEFAULT_ACCOUNTS.ACCOUNT_PAYABLE},null,${parseFloat(
            item.total
          )},'${TRANSACTION_STATUS.LATEST}')`
        );
      });

      if (discount > 0) {
        await tx.insert(
          `insert into transaction_detials values(null,now(),now(),${
            purchase.transaction_id
          },"hudeifa",${parseInt(
            DEFAULT_ACCOUNTS.ACCOUNT_PAYABLE
          )},${parseFloat(discount)},null,'${TRANSACTION_STATUS.LATEST}')`
        );
        await tx.insert(
          `insert into transaction_detials values(null,now(),now(),${
            purchase.transaction_id
          },"hudeifa",${parseInt(selectedIncomeAccount)},null,${parseFloat(
            discount
          )},'${TRANSACTION_STATUS.LATEST}')`
        );
      }

      if (parseFloat(paid) > 0) {
        const transaction = await tx.insert(
          `insert into transaction values(null,'${TRANSACTION_TYPES.PAYMENT_ADJUSTMENT}','',now(),now())`
        );

        let totalPayments = await mydb.getrow(
          `select sum(amount) amount from purchase_payments
              where purchase_id=${purchase.id}`
        );

        if (totalPayments.amount != paid) {
          const adjustmentAmount = paid - totalPayments.amount;

          await tx.insert(
            `insert into purchase_payments values(null,${transaction},${
              purchase.id
            },${parseInt(vendorId)},'hudeifa',${parseFloat(
              adjustmentAmount
            )},'purchase edit adjustment',now(),now())`
          );

          // create transaction
          await tx.insert(
            `insert into transaction_detials values(null,now(),now(),${transaction},"hudeifa",${parseInt(
              DEFAULT_ACCOUNTS.ACCOUNT_PAYABLE
            )},${parseFloat(adjustmentAmount)},null,'${
              TRANSACTION_STATUS.LATEST
            }')`
          );
          await tx.insert(
            `insert into transaction_detials values(null,now(),now(),${transaction},"hudeifa",${parseInt(
              setlectedBankAccount
            )},null,${parseFloat(adjustmentAmount)},'${
              TRANSACTION_STATUS.LATEST
            }')`
          );
        }
      }
    });

    res.status(201).json({
      success: true,
      message: "Purchase created successfully.",
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

exports.deletePurchase = async function (req, res) {
  try {
    let vendor = await mydb.getrow(
      `select * from vendors where id=${parseInt(req.params.id)}`
    );

    if (!vendor)
      return res.json({ success: false, message: "Product Does not Exist" });

    if (vendor.openingBalance > 0)
      return res.json({
        success: false,
        message: "Can not delete vendor in stock",
      });

    await mydb.delete(
      `delete from vendors where id=${parseInt(req.params.id)}`
    );

    res.status(200).json({
      success: true,
      message: "Purchase deleted successfully.",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: error,
    });
  }
};

exports.getVendorPurchases = async function (req, res) {
  try {
    let invoices = await mydb.getall(`
        SELECT p.id,p.purchaseNo,p.total,SUM(IFNULL(py.amount,0)) paid, (p.total - SUM(IFNULL(py.amount,0))) balance FROM purchases p 
        LEFT JOIN vendors v on p.vendor_id = v.id
        LEFT JOIN purchase_payments py ON py.purchase_id = p.id 
        WHERE p.vendor_id = ${parseInt(req.params.vendorId)}
        GROUP BY p.id
        `);
    res.json({
      success: true,
      invoices,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error,
    });
  }
};

exports.getRemainingBalace = async function (req, res) {
  try {
    let balance = await mydb.getrow(`
        SELECT (p.total - SUM(IFNULL(pp.amount,0))) as balance FROM purchases p
        LEFT JOIN purchase_payments pp ON pp.purchase_id = p.id and pp.status = 'Latest'
        WHERE p.id =${parseInt(req.params.purchaseId)}
        GROUP BY p.id
            `);
    res.json({
      success: true,
      balance: balance.balance,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error,
    });
  }
};

exports.createPurchaseReturn = async function (req, res) {
  try {
    let {
      userId,
      branchId,
      vendorId,
      purchaseReturnDate,
      selectedInvoice,
      setlectedBankAccount,
      items,
      total,
      paid,
    } = req.body;

    await mydb.transaction(async (tx) => {
      // check if purchaseNo exist
      // iterate through items

      // create transaction
      const transaction = await tx.insert(
        `insert into transaction values(null,'${TRANSACTION_TYPES.PURCHASE_RETURN}','',now(),now())`
      );

      const hqBranch = await tx.getrow(
        'select * from branches where type="hq"'
      );

      const purchaseReturn = await tx.insert(
        `insert into purchase_return values(null,'${parseInt(
          selectedInvoice
        )}',${parseInt(vendorId)},${parseInt(
          userId
        )},${transaction},'${purchaseReturnDate}',${parseFloat(total)},'${
          TRANSACTION_STATUS.LATEST
        }','no memo')`
      );

      for (const item of items) {
        // fetch the product of each row using product id

        await tx.insert(
          `insert into purchase_return_details values(null,${purchaseReturn},${parseInt(
            item.productId
          )},'${item.selectedProduct.label}',${parseInt(
            item.branchId
          )},${parseInt(item.qty)},${parseFloat(item.price)},'${
            TRANSACTION_STATUS.LATEST
          }',now(),now())`
        );

        await tx.insert(
          `insert into products_branches values(null,null,${parseInt(
            item.productId
          )},${parseInt(item.branchId)},${parseInt(-item.qty)},'${
            TRANSACTION_STATUS.LATEST
          }',now(),now())`
        );

        const product = await tx.getrow(
          `select * from products where id=${parseInt(item.productId)}`
        );

        const newQtyOnHand = product.qtyOnHand - parseInt(item.qty);
        const difference = parseFloat(item.price) - product.avgCost; // difference between returning cost and avgcost 12 - 11.33
        const newTotalCost =
          Math.round(product.avgCost * product.qtyOnHand) -
          parseFloat(item.price) +
          difference;
        const newAvgCost =
          Math.round((newTotalCost / newQtyOnHand) * 100) / 100;

        await tx.update(
          `update products set avgCost=${newAvgCost}, qtyOnHand=${newQtyOnHand} where id=${parseInt(
            item.productId
          )}`
        );

        await tx.insert(
          `insert into transaction_detials values(null,now(),now(),${transaction},${parseInt(
            userId
          )},${parseInt(item.branchId)},${parseInt(
            DEFAULT_ACCOUNTS.ACCOUNT_PAYABLE
          )},${parseFloat(item.total)},null,'${TRANSACTION_STATUS.LATEST}')`
        );
        await tx.insert(
          `insert into transaction_detials values(null,now(),now(),${transaction},${parseInt(
            userId
          )},${parseInt(item.branchId)},${
            product.assetAccount
          },null,${parseFloat(item.total)},'${TRANSACTION_STATUS.LATEST}')`
        );

        if (difference != 0) {
          await tx.insert(
            `insert into transaction_detials values(null,now(),now(),${transaction},${parseInt(
              userId
            )},${parseInt(item.branchId)},${parseInt(
              product.assetAccount
            )},${parseFloat(difference)},null,'${TRANSACTION_STATUS.LATEST}')`
          );
          await tx.insert(
            `insert into transaction_detials values(null,now(),now(),${transaction},${parseInt(
              userId
            )},${parseInt(item.branchId)},${
              DEFAULT_ACCOUNTS.COST_OF_GOODS_SOLD
            },null,${parseFloat(difference)},'${TRANSACTION_STATUS.LATEST}')`
          );
        }
      }

      if (parseFloat(paid) > 0) {
        // create purchase payment
        const paymentTransaction = await tx.insert(
          `insert into transaction values(null,'${TRANSACTION_TYPES.PURCHASE_RETURN_PAYMENT}','',now(),now())`
        );

        await tx.insert(
          `insert into purchase_return_payment values(null,${paymentTransaction},${purchaseReturn},${parseInt(
            vendorId
          )},${parseInt(userId)},${parseInt(
            hqBranch.id
          )},${setlectedBankAccount},${parseFloat(paid)},'${
            TRANSACTION_STATUS.LATEST
          }','memory',now(),now())`
        );

        // create transaction
        await tx.insert(
          `insert into transaction_detials values(null,now(),now(),${paymentTransaction},${parseInt(
            userId
          )},${parseInt(hqBranch.id)},${parseInt(
            DEFAULT_ACCOUNTS.ACCOUNT_PAYABLE
          )},${parseFloat(paid)},null,'${TRANSACTION_STATUS.LATEST}')`
        );
        await tx.insert(
          `insert into transaction_detials values(null,now(),now(),${paymentTransaction},${parseInt(
            userId
          )},${parseInt(hqBranch.id)},${parseInt(
            setlectedBankAccount
          )},null,${parseFloat(paid)},'${TRANSACTION_STATUS.LATEST}')`
        );
      }
    });

    res.status(201).json({
      success: true,
      message: "Purchase return created successfully.",
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

exports.getAllPurchaseReturns = async function (req, res) {
  try {
    let returns = await mydb.getall(`
    SELECT p.id,pur.purchaseNo,p.return_date,p.status,v.name,p.total,SUM(py.amount) paid FROM purchase_return p
    LEFT JOIN purchases pur on p.purchase_id = pur.id
    LEFT JOIN vendors v on p.vendor_id = v.id
    LEFT JOIN purchase_return_payment py ON py.return_id = p.id and py.status = 'Latest'
    WHERE p.status = '${TRANSACTION_STATUS.LATEST}'
    GROUP BY p.id
    `);
    res.json({
      success: true,
      returns,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error,
    });
  }
};

exports.getVendorPurchaseReturns = async function (req, res) {
  try {
    let invoices = await mydb.getall(`
    SELECT p.id FROM purchase_return p 
    WHERE p.vendor_id = ${parseInt(req.params.vendorId)}
        `);
    res.json({
      success: true,
      invoices,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error,
    });
  }
};

exports.cancelPurchaseReturn = async function (req, res) {
  try {
    await mydb.transaction(async (tx) => {
      const purchase = await tx.getrow(
        `select * from purchase_return where id=${parseInt(req.params.id)}`
      );

      if (!purchase) {
        return res.json({
          success: false,
          message: "purchase does not exist",
        });
      }

      await tx.update(
        `update purchase_return set 
        status='${TRANSACTION_STATUS.PRIOR}'
         where id=${purchase.id}`
      );

      await tx.update(
        `update transaction set updatedAt=now() where id=${purchase.transaction_id}`
      );

      await tx.update(
        `update transaction_detials set updatedAt=now(),status='${TRANSACTION_STATUS.PRIOR}'
        where transaction_id=${purchase.transaction_id}`
      );

      const purchaseItems = await tx.getall(
        `select * from purchase_return_details where return_id=${purchase.id}`
      );

      for (const purcahseItem of purchaseItems) {
        const product = await tx.getrow(
          `select * from products where id=${purcahseItem.product_id}`
        );
        const newQtyOnHand = product.qtyOnHand + purcahseItem.qty;
        // const newAvgCost =
        //   product.avgCost -
        //   Math.round(
        //     ((purcahseItem.price * purcahseItem.qty) / product.qtyOnHand) * 100
        //   ) /
        //     100;
        await tx.update(
          `update products set qtyOnHand=${newQtyOnHand} where id=${purcahseItem.product_id}`
        );
      }

      await tx.update(
        `update purchase_return_details set updatedAt=now(),status='${TRANSACTION_STATUS.PRIOR}'
        where return_id=${purchase.id}`
      );

      const purchasePayments = await tx.getall(
        `select * from purchase_return_payment where return_id=${purchase.id}`
      );

      for (const payment of purchasePayments) {
        await tx.update(
          `update transaction_detials set updatedAt=now(),status='${TRANSACTION_STATUS.PRIOR}'
          where transaction_id=${payment.transaction_id}`
        );
      }

      await tx.update(
        `update purchase_return_payment set updatedAt=now(),status='${TRANSACTION_STATUS.PRIOR}'
        where return_id=${purchase.id}`
      );

      res.json({
        success: true,
        message: "Succeffuly cancelled",
      });
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error,
    });
    throw error;
  }
};
