const mongoose = require("mongoose");

const bidSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    market: { type: String, required: true },
    gameType: { type: String, required: true }, // single_digit, jodi, single_patti, etc.
    betType: { type: String, enum: ["open", "close"], required: true },
    number: { type: String, required: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ["pending", "won", "lost"], default: "pending" },
    winAmount: { type: Number, default: 0 },
    result: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Bid", bidSchema);