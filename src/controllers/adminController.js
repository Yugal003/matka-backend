const User = require("../models/User");
const Transaction = require("../models/Transaction");
const Bid = require("../models/Bid");
const Market = require("../models/Market");

// ── GAME RATES ─────────────────────────────────────────────────
const RATES = {
  single_digit: 10,
  jodi:         100,
  single_patti: 150,
  double_patti: 300,
  triple_patti: 800,
  single_panna: 150,
  double_panna: 300,
};

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

// GET /api/admin/users/:id/bids — all bids of a specific user (today)
exports.getUserBids = async (req, res) => {
  try {
    const bids = await Bid.find({ user: req.params.id })
      .sort({ createdAt: -1 });
    res.json({ success: true, bids });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

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
    await User.findByIdAndUpdate(bid.user._id, { $inc: { walletBalance: Number(winAmount) } });
    await Transaction.create({
      user: bid.user._id,
      type: "credit",
      amount: Number(winAmount),
      description: `Win: ${bid.gameType} | ${bid.market} | No. ${bid.number} | ₹${winAmount}`,
      status: "approved",
      requestType: "winning",
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

// ── PREVIEW WINNERS ───────────────────────────────────────────
// GET /api/admin/markets/:id/preview-wins?round=open
exports.previewWins = async (req, res) => {
  try {
    const market = await Market.findById(req.params.id);
    if (!market) return res.status(404).json({ success: false, message: "Market not found" });

    const { round } = req.query;
    if (!round || !["open", "close"].includes(round)) {
      return res.status(400).json({ success: false, message: "round must be 'open' or 'close'" });
    }

    const marketName = market.name;
    const winners = [];
    let totalPayout = 0;

    if (round === "open") {
      if (!market.openResult || market.openResult === "" || market.openResult === "**") {
        return res.status(400).json({ success: false, message: "Open result declare karo pehle!" });
      }
      const openResult = market.openResult.toString().trim();
      const openDigit  = openResult.slice(-1);

      const bids = await Bid.find({
        market: marketName,
        betType: "open",
        status: "pending",
      }).populate("user", "name mobile");

      for (const bid of bids) {
        let isWinner = false;
        if (bid.gameType === "single_digit") {
          isWinner = bid.number.toString() === openDigit;
        } else {
          isWinner = bid.number.toString() === openResult;
        }
        if (isWinner) {
          const rate = RATES[bid.gameType] ?? 10;
          const winAmount = bid.amount * rate;
          totalPayout += winAmount;
          winners.push({
            userId: bid.user._id,
            name: bid.user.name,
            mobile: bid.user.mobile,
            gameType: bid.gameType,
            number: bid.number,
            betAmount: bid.amount,
            winAmount,
          });
        }
      }

    } else {
      if (!market.closeResult || market.closeResult === "" || market.closeResult === "**") {
        return res.status(400).json({ success: false, message: "Close result declare karo pehle!" });
      }
      if (!market.jodiResult || market.jodiResult === "" || market.jodiResult === "**") {
        return res.status(400).json({ success: false, message: "Jodi result declare karo pehle!" });
      }
      const closeResult = market.closeResult.toString().trim();
      const jodiResult  = market.jodiResult.toString().trim();
      const closeDigit  = closeResult.slice(-1);

      const bids = await Bid.find({
        market: marketName,
        betType: { $in: ["close", "jodi"] },
        status: "pending",
      }).populate("user", "name mobile");

      for (const bid of bids) {
        let isWinner = false;
        if (bid.betType === "jodi") {
          isWinner = bid.number.toString() === jodiResult;
        } else if (bid.gameType === "single_digit") {
          isWinner = bid.number.toString() === closeDigit;
        } else {
          isWinner = bid.number.toString() === closeResult;
        }
        if (isWinner) {
          const rate = RATES[bid.gameType] ?? 10;
          const winAmount = bid.amount * rate;
          totalPayout += winAmount;
          winners.push({
            userId: bid.user._id,
            name: bid.user.name,
            mobile: bid.user.mobile,
            gameType: bid.gameType,
            number: bid.number,
            betAmount: bid.amount,
            winAmount,
          });
        }
      }
    }

    res.json({ success: true, winners, totalPayout, winnersCount: winners.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── DISTRIBUTE WINS ────────────────────────────────────────────
// POST /api/admin/markets/:id/distribute-wins
// body: { round: "open" | "close" }
exports.distributeWins = async (req, res) => {
  try {
    const market = await Market.findById(req.params.id);
    if (!market) return res.status(404).json({ success: false, message: "Market not found" });

    const { round } = req.body;
    if (!round || !["open", "close"].includes(round)) {
      return res.status(400).json({ success: false, message: "round must be 'open' or 'close'" });
    }

    const marketName = market.name;
    let winnersCount = 0;
    let totalPaid = 0;
    const results = [];

    if (round === "open") {
      // ── Already distributed check ──
      if (market.openWinsDistributed === true) {
        return res.status(400).json({ success: false, message: "⚠️ Open wins already distributed! Double payment nahi hoga." });
      }
      // ── Validate open result ──
      if (!market.openResult || market.openResult === "" || market.openResult === "**") {
        return res.status(400).json({ success: false, message: "Open result declare karo pehle!" });
      }

      const openResult = market.openResult.toString().trim();
      // Last digit of open patti for single digit open
      const openDigit = openResult.slice(-1);

      const openBids = await Bid.find({
        market: marketName,
        betType: "open",
        status: "pending",
      }).populate("user", "name mobile");

      for (const bid of openBids) {
        let isWinner = false;

        if (bid.gameType === "single_digit") {
          // single digit open: match last digit of open result
          isWinner = bid.number.toString() === openDigit;
        } else {
          // patti/panna open: exact match with open result
          isWinner = bid.number.toString() === openResult;
        }

        if (isWinner) {
          const rate = RATES[bid.gameType] ?? 10;
          const winAmount = bid.amount * rate;

          await User.findByIdAndUpdate(bid.user._id, {
            $inc: { walletBalance: winAmount },
          });

          bid.status = "won";
          bid.winAmount = winAmount;
          await bid.save();

          await Transaction.create({
            user: bid.user._id,
            type: "credit",
            amount: winAmount,
            description: `Win: ${marketName} | ${bid.gameType} | No. ${bid.number} | Open`,
            status: "approved",
            requestType: "winning",
            processedBy: req.user.id,
            processedAt: new Date(),
          });

          winnersCount++;
          totalPaid += winAmount;
          results.push({
            user: bid.user.name,
            mobile: bid.user.mobile,
            gameType: bid.gameType,
            number: bid.number,
            betAmount: bid.amount,
            winAmount,
          });
        }
      }

      // ✅ Mark open wins as distributed
      await Market.findByIdAndUpdate(market._id, { openWinsDistributed: true });

    } else {
      // ── CLOSE ROUND ──
      if (market.closeWinsDistributed === true) {
        return res.status(400).json({ success: false, message: "⚠️ Close wins already distributed! Double payment nahi hoga." });
      }
      if (!market.closeResult || market.closeResult === "" || market.closeResult === "**") {
        return res.status(400).json({ success: false, message: "Close result declare karo pehle!" });
      }
      if (!market.jodiResult || market.jodiResult === "" || market.jodiResult === "**") {
        return res.status(400).json({ success: false, message: "Jodi result declare karo pehle!" });
      }

      const closeResult = market.closeResult.toString().trim();
      const jodiResult  = market.jodiResult.toString().trim();
      const closeDigit  = closeResult.slice(-1);

      const closeBids = await Bid.find({
        market: marketName,
        betType: { $in: ["close", "jodi"] },
        status: "pending",
      }).populate("user", "name mobile");

      for (const bid of closeBids) {
        let isWinner = false;

        if (bid.betType === "jodi") {
          isWinner = bid.number.toString() === jodiResult;
        } else if (bid.gameType === "single_digit") {
          isWinner = bid.number.toString() === closeDigit;
        } else {
          isWinner = bid.number.toString() === closeResult;
        }

        if (isWinner) {
          const rate = RATES[bid.gameType] ?? 10;
          const winAmount = bid.amount * rate;

          await User.findByIdAndUpdate(bid.user._id, {
            $inc: { walletBalance: winAmount },
          });

          bid.status = "won";
          bid.winAmount = winAmount;
          await bid.save();

          await Transaction.create({
            user: bid.user._id,
            type: "credit",
            amount: winAmount,
            description: `Win: ${marketName} | ${bid.gameType} | No. ${bid.number} | Close`,
            status: "approved",
            requestType: "winning",
            processedBy: req.user.id,
            processedAt: new Date(),
          });

          winnersCount++;
          totalPaid += winAmount;
          results.push({
            user: bid.user.name,
            mobile: bid.user.mobile,
            gameType: bid.gameType,
            number: bid.number,
            betAmount: bid.amount,
            winAmount,
          });
        }
      }

      // ✅ Mark close wins as distributed
      await Market.findByIdAndUpdate(market._id, { closeWinsDistributed: true });
    }

    res.json({
      success: true,
      message: winnersCount > 0
        ? `${winnersCount} winners ko ₹${totalPaid} credit kiya ✅`
        : "Koi winner nahi mila",
      winnersCount,
      totalPaid,
      results,
    });

  } catch (err) {
    console.error("distributeWins error:", err);
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