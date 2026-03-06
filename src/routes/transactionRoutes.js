const express = require("express");
const router = express.Router();
const Transaction = require("../models/Transaction");
const User = require("../models/User");
const { protect } = require("../middleware/auth");

// GET /api/transactions/my — user ki apni transactions
router.get("/my", protect, async (req, res) => {
  try {
    const transactions = await Transaction.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(100);
    res.json({ success: true, transactions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/transactions/add-funds — user fund add request
router.post("/add-funds", protect, async (req, res) => {
  try {
    const { amount, upiId } = req.body;
    if (!amount || amount <= 0)
      return res.status(400).json({ success: false, message: "Invalid amount" });

    const transaction = await Transaction.create({
      user: req.user.id,
      type: "credit",
      amount: Number(amount),
      description: `Fund add request of ₹${amount}`,
      status: "pending",
      requestType: "add_funds",
      upiId: upiId || "",
    });

    res.json({ success: true, message: "Fund request submitted", transaction });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/transactions/withdraw — user withdraw request
router.post("/withdraw", protect, async (req, res) => {
  try {
    const { amount, upiId } = req.body;
    if (!amount || amount <= 0)
      return res.status(400).json({ success: false, message: "Invalid amount" });

    const user = await User.findById(req.user.id);
    if (user.walletBalance < amount)
      return res.status(400).json({ success: false, message: "Insufficient balance" });

    // Hold the amount
    user.walletBalance -= Number(amount);
    await user.save();

    const transaction = await Transaction.create({
      user: req.user.id,
      type: "debit",
      amount: Number(amount),
      description: `Withdrawal request of ₹${amount}`,
      status: "pending",
      requestType: "withdraw",
      upiId: upiId || "",
    });

    res.json({
      success: true,
      message: "Withdrawal request submitted",
      transaction,
      walletBalance: user.walletBalance,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;