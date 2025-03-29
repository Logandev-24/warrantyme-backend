const jwt = require("jsonwebtoken");
const axios = require("axios");
const User = require("../models/User");
const logger = require("../utils/logger");

const refreshAccessToken = async (user) => {
  try {
    if (!user.refreshToken) {
      logger.warn(`🔄 User ${user.email} has no refresh token stored.`);
      return null;
    }

    const response = await axios.post("https://oauth2.googleapis.com/token", {
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: user.refreshToken,
      grant_type: "refresh_token",
    });

    const newAccessToken = response.data.access_token;

    // ✅ Update access token in the database
    await User.findByIdAndUpdate(user.id, { accessToken: newAccessToken });

    logger.info(`🔄 Access token refreshed for user: ${user.email}`);
    return newAccessToken;
  } catch (error) {
    logger.error(`❌ Failed to refresh access token: ${error.message}`);

    // ✅ Detect Invalid Refresh Token
    if (error.response && error.response.data.error === "invalid_grant") {
      logger.warn(`⚠️ Refresh token expired for user: ${user.email}. Re-authentication required.`);
      
      // ✅ Remove expired refresh token from DB
      await User.findByIdAndUpdate(user.id, { refreshToken: null });

      return null; // Force user to log in again
    }

    return null;
  }
};

const authMiddleware = async (req, res, next) => {
  try {
    // ✅ Extract the token from the Authorization header
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      logger.warn("🔒 Unauthorized access attempt: No Token Provided");
      return res.status(401).json({ error: "Unauthorized: No token provided" });
    }

    let decoded;
    try {
      // ✅ Verify the JWT Token
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      logger.info(`🔑 Authenticated User: ${decoded.email}`);
      return next();
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        logger.warn("⚠️ Token expired. Attempting to refresh...");
      } else {
        logger.error("❌ I  nvalid Token. Access is Denied.");
        return res.status(401).json({ error: "Unauthorized: Invalid token" });
      }
    } 

    // ✅ Find User in Database
    const user = await User.findById(decoded?.userId);
    if (!user || !user.refreshToken) {
      logger.error("❌ No valid refresh token found. Re-authentication required.");
      return res.status(401).json({ error: "Unauthorized: No valid refresh token" });
    }

    // ✅ Refresh the Access Token using the refresh token
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ refresh_token: user.refreshToken });

    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      const newAccessToken = credentials.access_token;

      // ✅ Update User's Access Token in DB
      user.accessToken = newAccessToken;
      await user.save();

      logger.info("🔄 Access token refreshed successfully");

      // ✅ Attach new access token to request
      req.user = { ...decoded, accessToken: newAccessToken };
      next();
    } catch (refreshError) {
      logger.error(`❌ Failed to refresh access token: ${refreshError.message}`);
      return res.status(401).json({ error: "Unauthorized: Unable to refresh access token" });
    }
  } catch (error) {
    logger.error(`❌ Authentication error: ${error.message}`);
    return res.status(401).json({ error: "Unauthorized: Authentication failed" });
  }
};


module.exports = {authMiddleware, refreshAccessToken};
