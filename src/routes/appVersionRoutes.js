// matka-backend/src/routes/appVersionRoutes.js

const express = require("express");
const router = express.Router();

// ── Current app version config ──
// Change version and apkUrl whenever you release a new APK
const APP_CONFIG = {
  latestVersion: "1.0.1",          // ← Update this when new APK release karo
  minVersion: "1.0.1",             // ← Users below this version will be force updated
  apkUrl: "https://drive.google.com/drive/folders/1AAvQ5UxBq6qKTZJMau5AXvEK8R2PAyO8?usp=sharing", // ← Google Drive APK link yahan daalo
  updateMessage: "Naya update available hai! Behtar experience ke liye abhi update karo.",
};

// GET /api/app/version — public route, no auth needed
router.get("/version", (req, res) => {
  res.json({
    success: true,
    latestVersion: APP_CONFIG.latestVersion,
    minVersion: APP_CONFIG.minVersion,
    apkUrl: APP_CONFIG.apkUrl,
    updateMessage: APP_CONFIG.updateMessage,
  });
});

module.exports = router;