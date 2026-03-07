const cron = require("node-cron");
const Bid = require("../models/Bid");
const Market = require("../models/Market");
const Transaction = require("../models/Transaction");

// ── IST 7:00 AM = UTC 1:30 AM ──
cron.schedule("30 1 * * *", async () => {
  try {
    console.log("⏰ Cron job started: daily cleanup");

    // 1. Delete ALL bids
    const deletedBids = await Bid.deleteMany({});
    console.log(`🗑️ Deleted ${deletedBids.deletedCount} bids`);

    // 2. Delete winning transactions only
    const deletedTxns = await Transaction.deleteMany({ requestType: "winning" });
    console.log(`🗑️ Deleted ${deletedTxns.deletedCount} winning transactions`);

    // 3. Reset ALL market results + distribution flags
    const resetMarkets = await Market.updateMany(
      {},
      {
        $set: {
          openResult:  "",
          closeResult: "",
          jodiResult:  "",
          openWinsDistributed:  false,
          closeWinsDistributed: false,
        },
      }
    );
    console.log(`🔄 Reset ${resetMarkets.modifiedCount} market results`);

    console.log("✅ Cron job completed");
  } catch (err) {
    console.error("❌ Cron job error:", err.message);
  }
});

console.log("⏰ Cron job scheduled: IST 7:00 AM daily cleanup");