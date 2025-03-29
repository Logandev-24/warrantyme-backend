// const axios = require("axios");
// const User = require("../models/User");

// const refreshAccessToken = async (userId, refreshToken) => {
//   try {
//     const response = await axios.post("https://oauth2.googleapis.com/token", {
//       client_id: process.env.GOOGLE_CLIENT_ID,
//       client_secret: process.env.GOOGLE_CLIENT_SECRET,
//       refresh_token: refreshToken,
//       grant_type: "refresh_token",
//     });

//     const newAccessToken = response.data.access_token;
    
//     // ✅ Update user's access token in DB
//     await User.findByIdAndUpdate(userId, { accessToken: newAccessToken });

//     console.log("🔄 Access token refreshed successfully!");
//     return newAccessToken;
//   } catch (error) {
//     console.error("❌ Error refreshing access token:", error.response?.data || error.message);
//     return null;
//   }
// };

// module.exports = { refreshAccessToken };
