const mongoose = require("mongoose");

const marketSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    openBid: { type: String, required: true },
    closeBid: { type: String, required: true },
    openResult: { type: String, default: "" },
    closeResult: { type: String, default: "" },
    jodiResult: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
    // ✅ Security: prevent double payment
    openWinsDistributed:  { type: Boolean, default: false },
    closeWinsDistributed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Market", marketSchema);