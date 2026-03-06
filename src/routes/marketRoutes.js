// matka-backend/src/routes/marketRoutes.js  ← NEW FILE

const express = require("express");
const router = express.Router();
const Market = require("../models/Market");
const { protect } = require("../middleware/auth");

// GET /api/markets — all active markets with results (for users)
router.get("/", protect, async (req, res) => {
  try {
    const markets = await Market.find({ isActive: true }).sort({ createdAt: 1 });
    res.json({ success: true, markets });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;