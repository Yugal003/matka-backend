const jwt = require("jsonwebtoken");
const User = require("../models/User");

exports.protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }
  if (!token) return res.status(401).json({ success: false, message: "Not authorized" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-password");
    if (!req.user) return res.status(401).json({ success: false, message: "User not found" });
    // ✅ Fixed: isActive undefined bhi allow karo (old users ke liye)
    if (req.user.isActive === false) {
      return res.status(403).json({ success: false, message: "Your account has been blocked" });
    }
    next();
  } catch (err) {
    res.status(401).json({ success: false, message: "Token invalid or expired" });
  }
};

exports.adminOnly = (req, res, next) => {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ success: false, message: "Admin access required" });
  }
  next();
};