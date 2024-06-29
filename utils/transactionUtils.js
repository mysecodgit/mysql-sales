exports.TRANSACTION_TYPES = {
  INVENTORY_ADJUSTMENT: "Inventory adjustment",
  PURCHASE: "Purchase",
  PURCHASE_PAYMENT: "Purchase Payment",
  PURCHASE_RETURN: "Purchase return",
  PURCHASE_RETURN_PAYMENT: "Purchase return payment",
  SALES: "Sales",
  SALES_PAMENT: "Sales Payment",
  SALES_RETURN: "Sales return",
  SALES_RETURN_PAYMENT: "Sales return payment",
  GENERAL_LEDGER: "General ledger",
  DEPOSIT: "Deposit",
  PAYMENT_ADJUSTMENT: "Payment adjustment",
  CHECK: "Check",
  TRANSFER_MONEY: "Transfer money",
  GENERAL_JOURNAL: "General journal",
};

exports.TRANSACTION_STATUS = {
  LATEST: "Latest",
  PRIOR: "Prior",
  CANCELLED: "Cancelled",
};

exports.DEFAULT_ACCOUNTS = {
  OPENING_BALANCE_EQUITY: 1,
  ACCOUNT_RECEIVABLE: 2,
  ACCOUNT_PAYABLE: 3,
  UNCATEGORIZED_INCOME: 4,
  UNCATEGORIZED_EXPENSE: 5,
  COST_OF_GOODS_SOLD: 6,
};

exports.DEFAULT_ACCOUNT_TYPES = {
  EQUITY: "Equity",
  BANK: "Bank",
  OTHER_CURRENT_ASSET: "Other current asset",
  COST_OF_GOODS_SOLD: "Cost of goods sold",
  INCOME: "Income",
  EXPENSE: "Expense",
};
