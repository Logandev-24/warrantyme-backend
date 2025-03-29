const jwt = require("jsonwebtoken");
const logger = require("../utils/logger");


const handleLoginSuccess = async (req, res) => {
  try {
    if (!req.user) {
      logger.error("❌ User authentication failed");
      return res.status(401).json({ success: false, message: "Authentication Failed" });
    }

    logger.info(`✅ User Authenticated: ${req.user.email}`);

    // Generate JWT Token with additional user info
    const token = jwt.sign(
      { 
        userId: req.user._id, 
        email: req.user.email, 
        name: req.user.name, 
        profilePic: req.user.profilePic 
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    logger.info("🔑 JWT Token Generated Successfully");

    // Redirect to frontend with token
    res.redirect(`${process.env.FRONTEND_URL}/?token=${token}`);
  } catch (error) {
    logger.error(`🚨 Error in Login Success: ${error.message}`);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const handleLoginFailure = (req, res) => {
  logger.warn("⚠️ Google OAuth Login Failed");
  res.status(401).json({ success: false, message: "Google Authentication Failed" });
};

// ✅ Ensure the functions are exported correctly
module.exports = {
  handleLoginSuccess,
  handleLoginFailure,
};
