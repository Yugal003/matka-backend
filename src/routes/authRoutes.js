const express = require("express");
const router = express.Router();
const { protect, adminOnly } = require("../middleware/auth");
const {
  getAllUsers, blockUser, updateUserWallet,
  getFundRequests, approveFundRequest, rejectFundRequest,
  getAllBids, getBidsByNumber, giveWinningAmount,
  getMarkets, createMarket, updateMarket, declareResult,
  distributeWins,
  previewWins,
} = require("../controllers/adminController");

router.use(protect, adminOnly);

// Users
router.get("/users", getAllUsers);
router.put("/users/:id/block", blockUser);
router.put("/users/:id/wallet", updateUserWallet);

// Fund Requests
router.get("/fund-requests", getFundRequests);
router.put("/fund-requests/:id/approve", approveFundRequest);
router.put("/fund-requests/:id/reject", rejectFundRequest);

// Bids
router.get("/bids", getAllBids);
router.get("/markets/:name/bids", getBidsByNumber);
router.post("/bids/:id/win", giveWinningAmount);

// Markets
router.get("/markets", getMarkets);
router.post("/markets", createMarket);
router.put("/markets/:id", updateMarket);
router.put("/markets/:id/result", declareResult);
router.get("/markets/:id/preview-wins", previewWins);         // ✅ Preview
router.post("/markets/:id/distribute-wins", distributeWins);  // ✅ Distribute

module.exports = router;