const User = require("../models/User");
const Transaction = require("../models/Transaction");

// GET /api/wallet/balance
exports.getBalance = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("wallet name mobile");
    res.json({ success: true, balance: user.wallet, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/wallet/add-funds
exports.requestAddFunds = async (req, res) => {
  try {
    const { amount, upiId } = req.body;
    if (!amount || amount < 100)
      return res.status(400).json({ success: false, message: "Minimum add funds amount is ₹100" });

    const transaction = await Transaction.create({
      user: req.user.id,
      type: "credit",
      amount,
      description: `Add funds request of ₹${amount}`,
      status: "pending",
      requestType: "add_funds",
      upiId: upiId || "",
    });

    res.json({ success: true, message: "Add funds request submitted. Admin will approve shortly.", transaction });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/wallet/withdraw
exports.requestWithdraw = async (req, res) => {
  try {
    const { amount, upiId } = req.body;
    const user = await User.findById(req.user.id);

    if (!amount || amount < 100)
      return res.status(400).json({ success: false, message: "Minimum withdrawal amount is ₹100" });
    if (!upiId)
      return res.status(400).json({ success: false, message: "UPI ID is required for withdrawal" });
    if (user.wallet < amount)
      return res.status(400).json({ success: false, message: "Insufficient balance" });

    // Deduct balance immediately and hold
    user.wallet -= amount;
    await user.save();

    const transaction = await Transaction.create({
      user: req.user.id,
      type: "debit",
      amount,
      description: `Withdrawal request of ₹${amount}`,
      status: "pending",
      requestType: "withdraw",
      upiId,
    });

    res.json({ success: true, message: "Withdrawal request submitted. Will be processed within 24 hours.", transaction });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/wallet/transactions
exports.getTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ success: true, transactions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};