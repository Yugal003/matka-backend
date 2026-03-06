const Bid = require("../models/Bid");
const User = require("../models/User");

// POST /api/bids/place
exports.placeBid = async (req, res) => {
  try {
    const { market, gameType, betType, bets } = req.body;
    // bets = [{ number, amount }, ...]

    if (!bets || bets.length === 0)
      return res.status(400).json({ success: false, message: "No bets provided" });

    const totalAmount = bets.reduce((sum, b) => sum + b.amount, 0);

    const user = await User.findById(req.user.id);
    if (user.walletBalance < totalAmount)
      return res.status(400).json({ success: false, message: "Insufficient balance" });

    // Deduct balance
    user.walletBalance -= totalAmount;
    await user.save();

    // Save all bids
    const bidDocs = bets.map((b) => ({
      user: req.user.id,
      market,
      gameType,
      betType: betType.toLowerCase(),
      number: String(b.number),
      amount: b.amount,
    }));

    await Bid.insertMany(bidDocs);

    res.json({
      success: true,
      message: "Bids placed successfully!",
      totalAmount,
      walletBalance: user.walletBalance,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/bids/my-bids
exports.getMyBids = async (req, res) => {
  try {
    const bids = await Bid.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(100);
    res.json({ success: true, bids });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};