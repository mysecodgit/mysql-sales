const mydb = require("../config/database.js");
const {
  TRANSACTION_TYPES,
  DEFAULT_ACCOUNTS,
  DEFAULT_ACCOUNT_TYPES,
  TRANSACTION_STATUS,
} = require("../utils/transactionUtils.js");

exports.getAllSales = async function (req, res) {
  try {
    let sales = await mydb.getall(`
    SELECT s.id,s.salesNo,s.sales_date,s.status,c.name,s.subtotal,s.discount,s.total,SUM(IFNULL(py.amount,0)) paid FROM sales s
LEFT JOIN customers c on s.customer_id = c.id
LEFT JOIN sales_payment py ON py.sales_id = s.id and py.status = 'Latest'
WHERE s.status = '${TRANSACTION_STATUS.LATEST}'
GROUP BY s.id
    `);
    res.json({
      success: true,
      sales,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error,
    });
  }
};

exports.getSale = async function (req, res) {
  let { salesId } = req.body;

  try {
    let sale = await mydb.getrow(
      `select s.id,s.salesNo,s.discount,s.sales_date,s.subtotal,s.total,
      c.name,c.phone from sales s 
      left join customers c on s.customer_id = c.id
      where s.id=${parseInt(salesId)} and s.status='${
        TRANSACTION_STATUS.LATEST
      }'`
    );

    let salesDetails = await mydb.getall(
      `SELECT sd.product_name,sd.qty,sd.price FROM sales_details sd
      LEFT JOIN products p on sd.product_id = p.id where sd.sales_id=${parseInt(
        salesId
      )} and sd.status='${TRANSACTION_STATUS.LATEST}'`
    );

    let paid = await mydb.getrow(
      `select sum(amount) amount from sales_payment
        where sales_id=${parseInt(salesId)} and status='${
        TRANSACTION_STATUS.LATEST
      }'`
    );

    res.json({
      success: true,
      sale,
      details: salesDetails,
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

exports.createSale = async function (req, res) {
  try {
    let {
      salesNo,
      userId,
      branchId,
      customerId,
      salesDate,
      selectedExpenseAccount,
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
        `insert into transaction values(null,'${TRANSACTION_TYPES.SALES}','',now(),now())`
      );

      const sale = await tx.insert(
        `insert into sales values(null,'${salesNo}',${transaction},'${salesDate}',${parseInt(
          customerId
        )},${parseInt(userId)},${parseInt(
          branchId
        )},${selectedExpenseAccount},${setlectedBankAccount},${parseFloat(
          subTotal
        )},${parseFloat(discount)},${parseFloat(total)},'${
          TRANSACTION_STATUS.LATEST
        }','')`
      );

      for (const item of items) {
        // fetch the product of each row using product id

        await tx.insert(
          `insert into sales_details values(null,${sale},${parseInt(
            item.productId
          )},'${item.selectedProduct.label}',${parseInt(branchId)},${parseInt(
            item.qty
          )},${parseFloat(item.price)},${parseFloat(
            item.selectedProduct.costPrice
          )},'${TRANSACTION_STATUS.LATEST}',now(),now())`
        );

        const product = await tx.getrow(
          `select * from products where id=${parseInt(item.productId)}`
        );

        const newQtyOnHand = product.qtyOnHand - parseInt(item.qty);

        await tx.update(
          `update products set qtyOnHand=${newQtyOnHand} where id=${parseInt(
            item.productId
          )}`
        );
        // create transaction details
        // crediting account payable and debiting the product asset account
        await tx.insert(
          `insert into transaction_detials values(null,now(),now(),${transaction},${parseInt(
            userId
          )},${parseInt(branchId)},${parseInt(
            product.incomeAccount
          )},null,${parseFloat(item.total)},'${TRANSACTION_STATUS.LATEST}')`
        );
        await tx.insert(
          `insert into transaction_detials values(null,now(),now(),${transaction},${parseInt(
            userId
          )},${parseInt(branchId)},${
            DEFAULT_ACCOUNTS.ACCOUNT_RECEIVABLE
          },${parseFloat(item.total)},null,'${TRANSACTION_STATUS.LATEST}')`
        );

        await tx.insert(
          `insert into transaction_detials values(null,now(),now(),${transaction},${parseInt(
            userId
          )},${parseInt(branchId)},${parseInt(
            product.assetAccount
          )},null,${parseFloat(product.avgCost * item.qty)},'${
            TRANSACTION_STATUS.LATEST
          }')`
        );
        await tx.insert(
          `insert into transaction_detials values(null,now(),now(),${transaction},${parseInt(
            userId
          )},${parseInt(branchId)},${parseInt(
            product.costOfGoodsSoldAccount
          )},${parseFloat(product.avgCost * item.qty)},null,'${
            TRANSACTION_STATUS.LATEST
          }')`
        );

        await tx.insert(
          `insert into products_branches values(null,null,${parseInt(
            item.productId
          )},${parseInt(branchId)},${parseInt(-item.qty)},'${
            TRANSACTION_STATUS.LATEST
          }',now(),now())`
        );
      }

      if (discount > 0) {
        await tx.insert(
          `insert into transaction_detials values(null,now(),now(),${transaction},${parseInt(
            userId
          )},${parseInt(branchId)},${parseInt(
            selectedExpenseAccount
          )},${parseFloat(discount)},null,'${TRANSACTION_STATUS.LATEST}')`
        );
        await tx.insert(
          `insert into transaction_detials values(null,now(),now(),${transaction},${parseInt(
            userId
          )},${parseInt(branchId)},${parseInt(
            DEFAULT_ACCOUNTS.ACCOUNT_RECEIVABLE
          )},null,${parseFloat(discount)},'${TRANSACTION_STATUS.LATEST}')`
        );
      }

      if (parseFloat(paid) > 0) {
        // create purchase payment
        const paymentTransaction = await tx.insert(
          `insert into transaction values(null,'${TRANSACTION_TYPES.SALES_PAMENT}','',now(),now())`
        );

        await tx.insert(
          `insert into sales_payment values(null,${paymentTransaction},${sale},${parseInt(
            customerId
          )},${parseInt(userId)},${parseInt(
            branchId
          )},${setlectedBankAccount},${parseFloat(paid)},'${
            TRANSACTION_STATUS.LATEST
          }','memory',now(),now())`
        );

        // create transaction
        await tx.insert(
          `insert into transaction_detials values(null,now(),now(),${paymentTransaction},${parseInt(
            userId
          )},${parseInt(branchId)},${parseInt(
            setlectedBankAccount
          )},${parseFloat(paid)},null,'${TRANSACTION_STATUS.LATEST}')`
        );
        await tx.insert(
          `insert into transaction_detials values(null,now(),now(),${paymentTransaction},${parseInt(
            userId
          )},${parseInt(branchId)},${parseInt(
            DEFAULT_ACCOUNTS.ACCOUNT_RECEIVABLE
          )},null,${parseFloat(paid)},'${TRANSACTION_STATUS.LATEST}')`
        );
      }
    });

    res.status(201).json({
      success: true,
      message: "Sales created successfully.",
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

exports.cancelSale = async function (req, res) {
  try {
    await mydb.transaction(async (tx) => {
      const { saleId, userId } = req.body;
      const sale = await tx.getrow(
        `select * from sales where id=${parseInt(saleId)}`
      );

      if (!sale) {
        return res.json({
          success: false,
          message: "sales does not exist",
        });
      }

      await tx.update(
        `update sales set 
        status='${TRANSACTION_STATUS.PRIOR}',
        user_id=${parseInt(userId)},
        sales_date=now()
         where id=${sale.id}`
      );

      await tx.update(
        `update transaction set updatedAt=now() where id=${sale.transaction_id}`
      );

      await tx.update(
        `update transaction_detials set updatedAt=now(),status='${
          TRANSACTION_STATUS.PRIOR
        }',
        user_id=${parseInt(userId)}
        where transaction_id=${sale.transaction_id}`
      );

      const salesItems = await tx.getall(
        `select * from sales_details where sales_id=${sale.id}`
      );

      for (const saleItem of salesItems) {
        const product = await tx.getrow(
          `select * from products where id=${saleItem.product_id}`
        );
        const newQtyOnHand = product.qtyOnHand + saleItem.qty;
        await tx.update(
          `update products set qtyOnHand=${newQtyOnHand} where id=${saleItem.product_id}`
        );
      }

      await tx.update(
        `update sales_details set updatedAt=now(),status='${TRANSACTION_STATUS.PRIOR}'
        where sales_id=${sale.id}`
      );

      const salesPayments = await tx.getall(
        `select * from sales_payment where sales_id=${sale.id}`
      );

      for (const payment of salesPayments) {
        await tx.update(
          `update transaction_detials set updatedAt=now(),status='${
            TRANSACTION_STATUS.PRIOR
          }',
          user_id=${parseInt(userId)}
          where transaction_id=${payment.transaction_id}`
        );
      }

      await tx.update(
        `update sales_payment set updatedAt=now(),status='${
          TRANSACTION_STATUS.PRIOR
        }',
        user_id=${parseInt(userId)}
        where sales_id=${sale.id}`
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

exports.updateSale = async function (req, res) {
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

      purchaseItems.forEach(async (purcahseItem) => {
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
      });

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

exports.deleteSale = async function (req, res) {
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

exports.getCustomerSales = async function (req, res) {
  try {
    let invoices = await mydb.getall(`
    SELECT s.id,s.salesNo,s.total,SUM(IFNULL(py.amount,0)) paid, (s.total - SUM(IFNULL(py.amount,0))) balance FROM sales s 
    LEFT JOIN customers c on s.customer_id = c.id
    LEFT JOIN sales_payment py ON py.sales_id = s.id 
    WHERE s.customer_id = ${parseInt(
      req.params.customerId
    )} and s.status='Latest'
    GROUP BY s.id
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
        SELECT (p.total - SUM(IFNULL(pp.amount,0))) as balance FROM sales p
        LEFT JOIN sales_payment pp ON pp.sales_id = p.id and pp.status = 'Latest'
        WHERE p.id =${parseInt(req.params.salesId)}
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

// sales return functions

exports.createSaleReturn = async function (req, res) {
  try {
    let {
      customerId,
      userId,
      branchId,
      salesReturnDate,
      selectedInvoice,
      setlectedBankAccount,
      items,
      total,
      paid,
    } = req.body;

    await mydb.transaction(async (tx) => {
      // create transaction
      const transaction = await tx.insert(
        `insert into transaction values(null,'${TRANSACTION_TYPES.SALES_RETURN}','',now(),now())`
      );

      const saleReturn = await tx.insert(
        `insert into sales_return values(null,'${selectedInvoice}',${transaction},${parseInt(
          customerId
        )},${parseInt(userId)},${parseInt(
          branchId
        )},'${salesReturnDate}',${parseFloat(total)},'${
          TRANSACTION_STATUS.LATEST
        }','')`
      );

      for (const item of items) {
        // fetch the product of each row using product id

        await tx.insert(
          `insert into sales_return_details values(null,${saleReturn},${parseInt(
            item.productId
          )},'${item.selectedProduct.label}',${parseInt(branchId)},${parseInt(
            item.qty
          )},${parseFloat(item.price)},'${
            TRANSACTION_STATUS.LATEST
          }',now(),now())`
        );

        const product = await tx.getrow(
          `select * from products where id=${parseInt(item.productId)}`
        );

        const newQtyOnHand = product.qtyOnHand + parseInt(item.qty);

        await tx.update(
          `update products set qtyOnHand=${newQtyOnHand} where id=${parseInt(
            item.productId
          )}`
        );
        // create transaction details
        // crediting account payable and debiting the product asset account
        await tx.insert(
          `insert into transaction_detials values(null,now(),now(),${transaction},${parseInt(
            userId
          )},${parseInt(branchId)},${parseInt(
            DEFAULT_ACCOUNTS.ACCOUNT_RECEIVABLE
          )},null,${parseFloat(item.total)},'${TRANSACTION_STATUS.LATEST}')`
        );
        await tx.insert(
          `insert into transaction_detials values(null,now(),now(),${transaction},${parseInt(
            userId
          )},${parseInt(branchId)},${parseInt(
            product.incomeAccount
          )},${parseFloat(item.total)},null,'${TRANSACTION_STATUS.LATEST}')`
        );

        await tx.insert(
          `insert into transaction_detials values(null,now(),now(),${transaction},${parseInt(
            userId
          )},${parseInt(branchId)},${parseInt(
            product.costOfGoodsSoldAccount
          )},null,${parseFloat(product.avgCost * item.qty)},'${
            TRANSACTION_STATUS.LATEST
          }')`
        );
        await tx.insert(
          `insert into transaction_detials values(null,now(),now(),${transaction},${parseInt(
            userId
          )},${parseInt(branchId)},${parseInt(
            product.assetAccount
          )},${parseFloat(product.avgCost * item.qty)},null,'${
            TRANSACTION_STATUS.LATEST
          }')`
        );

        await tx.insert(
          `insert into products_branches values(null,null,${parseInt(
            item.productId
          )},${parseInt(branchId)},${parseInt(item.qty)},'${
            TRANSACTION_STATUS.LATEST
          }',now(),now())`
        );
      }

      if (parseFloat(paid) > 0) {
        // create purchase payment
        const paymentTransaction = await tx.insert(
          `insert into transaction values(null,'${TRANSACTION_TYPES.SALES_RETURN_PAYMENT}','',now(),now())`
        );

        await tx.insert(
          `insert into sales_return_payment values(null,${paymentTransaction},${saleReturn},${parseInt(
            customerId
          )},${parseInt(userId)},${parseInt(
            branchId
          )},${setlectedBankAccount},${parseFloat(paid)},'${
            TRANSACTION_STATUS.LATEST
          }','memory',now(),now())`
        );

        // create transaction
        await tx.insert(
          `insert into transaction_detials values(null,now(),now(),${paymentTransaction},${parseInt(
            userId
          )},${parseInt(branchId)},${parseInt(
            DEFAULT_ACCOUNTS.ACCOUNT_RECEIVABLE
          )},${parseFloat(paid)},null,'${TRANSACTION_STATUS.LATEST}')`
        );
        await tx.insert(
          `insert into transaction_detials values(null,now(),now(),${paymentTransaction},${parseInt(
            userId
          )},${parseInt(branchId)},${parseInt(
            setlectedBankAccount
          )},null,${parseFloat(paid)},'${TRANSACTION_STATUS.LATEST}')`
        );
      }
    });

    res.status(201).json({
      success: true,
      message: "Sales return created successfully.",
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

exports.getAllSalesReturns = async function (req, res) {
  try {
    let returns = await mydb.getall(`
    SELECT s.id,sls.salesNo,s.return_date,s.status,c.name,s.total,SUM(spy.amount) paid FROM sales_return s
    LEFT JOIN sales sls on s.sales_id = sls.id
    LEFT JOIN customers c on s.customer_id = c.id
    LEFT JOIN sales_return_payment spy ON spy.return_id = s.id and spy.status = 'Latest'
    WHERE s.status = '${TRANSACTION_STATUS.LATEST}'
    GROUP BY s.id
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

exports.getSalesReturnById = async function (req, res) {
  let { returnId } = req.body;

  try {
    let saleReturn = await mydb.getrow(
      `select s.id,s.return_date,s.total,
      c.name,c.phone from sales_return s 
      left join customers c on s.customer_id = c.id
      where s.id=${parseInt(returnId)} and s.status='${
        TRANSACTION_STATUS.LATEST
      }'`
    );

    let saleReturnDetails = await mydb.getall(
      `SELECT sd.product_name,sd.qty,sd.price FROM sales_return_details sd
      LEFT JOIN products p on sd.product_id = p.id where sd.return_id=${parseInt(
        returnId
      )} and sd.status='${TRANSACTION_STATUS.LATEST}'`
    );

    let paid = await mydb.getrow(
      `select sum(amount) amount from sales_return_payment
        where return_id=${parseInt(returnId)} and status='${
        TRANSACTION_STATUS.LATEST
      }'`
    );

    res.json({
      success: true,
      saleReturn,
      details: saleReturnDetails,
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

exports.getCustomerSalesReturns = async function (req, res) {
  try {
    let invoices = await mydb.getall(`
    SELECT s.id FROM sales_return s
    WHERE s.customer_id = ${parseInt(req.params.customerId)}
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

exports.cancelSalesReturn = async function (req, res) {
  try {
    const { salesReturnId, userId } = req.body;

    await mydb.transaction(async (tx) => {
      const sale = await tx.getrow(
        `select * from sales_return where id=${parseInt(salesReturnId)}`
      );

      if (!sale) {
        return res.json({
          success: false,
          message: "sales return does not exist",
        });
      }

      await tx.update(
        `update sales_return set 
        status='${TRANSACTION_STATUS.PRIOR}',
        user_id=${parseInt(userId)}
         where id=${sale.id}`
      );

      await tx.update(
        `update transaction set updatedAt=now() where id=${sale.transaction_id}`
      );

      await tx.update(
        `update transaction_detials set updatedAt=now(),status='${
          TRANSACTION_STATUS.PRIOR
        }',
        user_id=${parseInt(userId)}
        where transaction_id=${sale.transaction_id}`
      );

      const salesItems = await tx.getall(
        `select * from sales_return_details where return_id=${sale.id}`
      );

      for (const saleItem of salesItems) {
        const product = await tx.getrow(
          `select * from products where id=${saleItem.product_id}`
        );
        const newQtyOnHand = product.qtyOnHand - saleItem.qty;
        await tx.update(
          `update products set qtyOnHand=${newQtyOnHand} where id=${saleItem.product_id}`
        );
      }

      await tx.update(
        `update sales_return_details set updatedAt=now(),status='${TRANSACTION_STATUS.PRIOR}'
        where return_id=${sale.id}`
      );

      const salesPayments = await tx.getall(
        `select * from sales_return_payment where return_id=${sale.id}`
      );

      for (const payment of salesPayments) {
        await tx.update(
          `update transaction_detials set updatedAt=now(),status='${
            TRANSACTION_STATUS.PRIOR
          }',
          user_id=${parseInt(userId)}
          where transaction_id=${payment.transaction_id}`
        );
      }

      await tx.update(
        `update sales_return_payment set updatedAt=now(),status='${
          TRANSACTION_STATUS.PRIOR
        }',
        user_id=${parseInt(userId)}
        where return_id=${sale.id}`
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
