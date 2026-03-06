const express = require("express");
const router = express.Router();
const { placeBid, getMyBids } = require("../controllers/bidController");
const { protect } = require("../middleware/auth");

router.post("/place", protect, placeBid);
router.get("/my-bids", protect, getMyBids);

module.exports = router;