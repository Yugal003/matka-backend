const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./src/config/db");

dotenv.config();
connectDB();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── ROUTES ───────────────────────────────────────────────────
app.use("/api/auth",         require("./src/routes/authRoutes"));
app.use("/api/wallet",       require("./src/routes/walletRoutes"));
app.use("/api/admin",        require("./src/routes/adminRoutes"));
app.use("/api/bids",         require("./src/routes/bidRoutes"));
app.use("/api/transactions", require("./src/routes/transactionRoutes"));
app.use("/api/markets",      require("./src/routes/marketRoutes"));

app.get("/", (req, res) => {
  res.json({ success: true, message: "Yugal Matka API is running ✅", version: "1.0.0" });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: "Something went wrong on the server." });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});