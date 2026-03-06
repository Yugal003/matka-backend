const User = require("../models/User");
const Transaction = require("../models/Transaction");
const Bid = require("../models/Bid");
const Market = require("../models/Market");

// ── USERS ──────────────────────────────────────────────────────
// GET /api/admin/users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ isAdmin: false }).select("-password").sort({ createdAt: -1 });
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/admin/users/:id/block
exports.blockUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    user.isActive = !user.isActive;
    await user.save();
    res.json({ success: true, message: `User ${!user.isActive ? "blocked" : "unblocked"}`, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/admin/users/:id/wallet
exports.updateUserWallet = async (req, res) => {
  try {
    const { amount, type, description } = req.body;
    const user = await User.findById(req.params.id);
    if (type === "credit") user.walletBalance += Number(amount);
    else user.walletBalance -= Number(amount);
    await user.save();
    await Transaction.create({
      user: user._id,
      type,
      amount,
      description: description || `Admin ${type} of ₹${amount}`,
      status: "approved",
      requestType: type === "credit" ? "add_funds" : "withdraw",
      processedBy: req.user.id,
      processedAt: new Date(),
    });
    res.json({ success: true, message: "Wallet updated", walletBalance: user.walletBalance });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── FUND REQUESTS ──────────────────────────────────────────────
// GET /api/admin/fund-requests
exports.getFundRequests = async (req, res) => {
  try {
    const requests = await Transaction.find({ status: "pending" })
      .populate("user", "name mobile walletBalance")
      .sort({ createdAt: -1 });
    res.json({ success: true, requests });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/admin/fund-requests/:id/approve
exports.approveFundRequest = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id).populate("user");
    if (!transaction) return res.status(404).json({ success: false, message: "Request not found" });
    if (transaction.status !== "pending")
      return res.status(400).json({ success: false, message: "Request already processed" });

    transaction.status = "approved";
    transaction.processedBy = req.user.id;
    transaction.processedAt = new Date();
    transaction.adminNote = req.body.note || "";
    await transaction.save();

    // Credit walletBalance only for add_funds (withdraw already deducted)
    if (transaction.requestType === "add_funds") {
      await User.findByIdAndUpdate(transaction.user._id, {
        $inc: { walletBalance: transaction.amount },
      });
    }

    res.json({ success: true, message: "Request approved" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/admin/fund-requests/:id/reject
exports.rejectFundRequest = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id).populate("user");
    if (!transaction) return res.status(404).json({ success: false, message: "Request not found" });
    if (transaction.status !== "pending")
      return res.status(400).json({ success: false, message: "Request already processed" });

    transaction.status = "rejected";
    transaction.processedBy = req.user.id;
    transaction.processedAt = new Date();
    transaction.adminNote = req.body.note || "";
    await transaction.save();

    // Refund walletBalance for rejected withdrawals
    if (transaction.requestType === "withdraw") {
      await User.findByIdAndUpdate(transaction.user._id, {
        $inc: { walletBalance: transaction.amount },
      });
    }

    res.json({ success: true, message: "Request rejected" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── BIDS ───────────────────────────────────────────────────────
// GET /api/admin/bids
exports.getAllBids = async (req, res) => {
  try {
    const bids = await Bid.find()
      .populate("user", "name mobile")
      .sort({ createdAt: -1 })
      .limit(200);
    res.json({ success: true, bids });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── MARKETS ────────────────────────────────────────────────────
// GET /api/admin/markets
exports.getMarkets = async (req, res) => {
  try {
    const markets = await Market.find().sort({ createdAt: -1 });
    res.json({ success: true, markets });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/admin/markets
exports.createMarket = async (req, res) => {
  try {
    const market = await Market.create(req.body);
    res.json({ success: true, message: "Market created", market });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/admin/markets/:id
exports.updateMarket = async (req, res) => {
  try {
    const market = await Market.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, message: "Market updated", market });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/admin/markets/:id/result
exports.declareResult = async (req, res) => {
  try {
    const { openResult, closeResult, jodiResult } = req.body;
    const market = await Market.findByIdAndUpdate(
      req.params.id,
      { openResult, closeResult, jodiResult },
      { new: true }
    );
    res.json({ success: true, message: "Result declared", market });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};