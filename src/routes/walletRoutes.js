// walletRoutes.js
const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const { getBalance, requestAddFunds, requestWithdraw, getTransactions } = require("../controllers/walletController");

router.get("/balance", protect, getBalance);
router.post("/add-funds", protect, requestAddFunds);
router.post("/withdraw", protect, requestWithdraw);
router.get("/transactions", protect, getTransactions);

module.exports = router;