const express = require("express");
const passport = require("passport");
const jwt = require("jsonwebtoken");
const authController = require("../controllers/authController");
const logger = require("../utils/logger");

const router = express.Router();

// 🔹 Google OAuth Login Route
router.get(
  "/google",
  (req, res, next) => {
    logger.info("🌐 Google OAuth Login Attempt");
    next();
  },
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// 🔹 Google OAuth Callback Route
router.get(
  "/google/callback",
  (req, res, next) => {
    logger.info("✅ Google OAuth Callback Triggered");
    next();
  },
  passport.authenticate("google", {
    failureRedirect: "/auth/failure",
    session: false,
  }),
  authController.handleLoginSuccess
);

// 🔹 OAuth Failure Route
router.get("/failure", authController.handleLoginFailure);

// 🔹 Validate JWT Token Route
router.get("/validate-token", (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    logger.warn("⚠️ No token provided for validation");
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    logger.info(`✅ Token valid for user: ${decoded.email}`);
    res.json({ success: true, user: decoded });
  } catch (error) {
    logger.error(`❌ Token validation failed: ${error.message}`);
    res.status(401).json({ success: false, message: "Invalid token" });
  }
});

module.exports = router;
