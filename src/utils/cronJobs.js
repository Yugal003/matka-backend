const cron = require("node-cron");
const Bid = require("../models/Bid");
const Market = require("../models/Market");

// ── Runs every day at midnight (00:00) ──
cron.schedule("0 0 * * *", async () => {
  try {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

    // 1. Delete all bids older than 24 hours
    const deletedBids = await Bid.deleteMany({ createdAt: { $lt: cutoff } });
    console.log(`🗑️ Deleted ${deletedBids.deletedCount} old bids`);

    // 2. Reset market results (clear openResult, closeResult, jodiResult)
    const resetMarkets = await Market.updateMany(
      { updatedAt: { $lt: cutoff } },
      {
        $set: {
          openResult:  "",
          closeResult: "",
          jodiResult:  "",
        },
      }
    );
    console.log(`🔄 Reset ${resetMarkets.modifiedCount} market results`);

  } catch (err) {
    console.error("❌ Cron job error:", err.message);
  }
});

console.log("⏰ Cron job scheduled: daily cleanup at midnight");