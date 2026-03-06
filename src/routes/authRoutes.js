const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const { register, login, getMe, changePassword } = require("../controllers/authController");
const { protect } = require("../middleware/auth");

// Validation rules
const registerValidation = [
  body("name")
    .trim()
    .notEmpty().withMessage("Name is required")
    .isLength({ min: 2 }).withMessage("Name must be at least 2 characters"),

  body("mobile")
    .trim()
    .notEmpty().withMessage("Mobile number is required")
    .matches(/^[0-9]{10}$/).withMessage("Enter a valid 10-digit mobile number"),

  body("password")
    .notEmpty().withMessage("Password is required")
    .isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
];

const loginValidation = [
  body("mobile")
    .trim()
    .notEmpty().withMessage("Mobile number is required")
    .matches(/^[0-9]{10}$/).withMessage("Enter a valid 10-digit mobile number"),

  body("password")
    .notEmpty().withMessage("Password is required"),
];

// Routes
router.post("/register", registerValidation, register);
router.post("/login", loginValidation, login);
router.get("/me", protect, getMe);
router.put("/change-password", protect, changePassword);

module.exports = router;