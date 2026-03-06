const User = require("../models/User");
const Transaction = require("../models/Transaction");
const Bid = require("../models/Bid");
const Market = require("../models/Market");

// ── USERS ──────────────────────────────────────────────────────
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ isAdmin: false }).select("-password").sort({ createdAt: -1 });
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

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

exports.updateUserWallet = async (req, res) => {
  try {
    const { amount, type, description } = req.body;
    const user = await User.findById(req.params.id);
    if (type === "credit") user.walletBalance += Number(amount);
    else user.walletBalance -= Number(amount);
    await user.save();
    await Transaction.create({
      user: user._id, type, amount,
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
    if (transaction.requestType === "add_funds") {
      await User.findByIdAndUpdate(transaction.user._id, { $inc: { walletBalance: transaction.amount } });
    }
    res.json({ success: true, message: "Request approved" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

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
    if (transaction.requestType === "withdraw") {
      await User.findByIdAndUpdate(transaction.user._id, { $inc: { walletBalance: transaction.amount } });
    }
    res.json({ success: true, message: "Request rejected" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── BIDS ───────────────────────────────────────────────────────
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

// GET /api/admin/markets/:name/bids?gameType=single_digit&number=5
exports.getBidsByNumber = async (req, res) => {
  try {
    const { name } = req.params;
    const { gameType, number } = req.query;

    const filter = { market: name };
    if (gameType) filter.gameType = gameType;
    if (number !== undefined && number !== "") filter.number = String(number);

    const bids = await Bid.find(filter)
      .populate("user", "name mobile walletBalance")
      .sort({ createdAt: -1 });

    res.json({ success: true, bids });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/admin/bids/:id/win
exports.giveWinningAmount = async (req, res) => {
  try {
    const { winAmount } = req.body;
    if (!winAmount || winAmount <= 0)
      return res.status(400).json({ success: false, message: "Enter valid win amount" });

    const bid = await Bid.findById(req.params.id).populate("user");
    if (!bid) return res.status(404).json({ success: false, message: "Bid not found" });

    bid.status = "won";
    bid.winAmount = Number(winAmount);
    await bid.save();

    await User.findByIdAndUpdate(bid.user._id, {
      $inc: { walletBalance: Number(winAmount) }
    });

    await Transaction.create({
      user: bid.user._id,
      type: "credit",
      amount: Number(winAmount),
      description: `Win: ${bid.gameType} | ${bid.market} | No. ${bid.number} | ₹${winAmount}`,
      status: "approved",
      requestType: "add_funds",
      processedBy: req.user.id,
      processedAt: new Date(),
    });

    const updatedUser = await User.findById(bid.user._id).select("walletBalance");
    res.json({
      success: true,
      message: `₹${winAmount} credited to ${bid.user.name}`,
      newWalletBalance: updatedUser.walletBalance,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── MARKETS ────────────────────────────────────────────────────
exports.getMarkets = async (req, res) => {
  try {
    const markets = await Market.find().sort({ createdAt: -1 });
    res.json({ success: true, markets });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createMarket = async (req, res) => {
  try {
    const market = await Market.create(req.body);
    res.json({ success: true, message: "Market created", market });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateMarket = async (req, res) => {
  try {
    const market = await Market.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, message: "Market updated", market });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

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