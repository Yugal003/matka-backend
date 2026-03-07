const cron = require("node-cron");
const Bid = require("../models/Bid");
const Market = require("../models/Market");

// ── IST 7:47 AM = UTC 2:17 AM — TEMP TEST ──
cron.schedule("17 2 * * *", async () => {
  try {
    console.log("⏰ Cron job started: daily cleanup");

    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const deletedBids = await Bid.deleteMany({ createdAt: { $lt: cutoff } });
    console.log(`🗑️ Deleted ${deletedBids.deletedCount} old bids`);

    const resetMarkets = await Market.updateMany(
      { updatedAt: { $lt: cutoff } },
      { $set: { openResult: "", closeResult: "", jodiResult: "" } }
    );
    console.log(`🔄 Reset ${resetMarkets.modifiedCount} market results`);

    console.log("✅ Cron job completed");
  } catch (err) {
    console.error("❌ Cron job error:", err.message);
  }
});

console.log("⏰ Cron job scheduled: IST 7:47 AM (UTC 2:17 AM) test");