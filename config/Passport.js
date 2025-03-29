const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/User");
require("dotenv").config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.BACKEND_URL}/auth/google/callback`,
      scope: [
        "profile",
        "email",
        "https://www.googleapis.com/auth/drive.file",
        "https://www.googleapis.com/auth/drive.metadata.readonly",
      ],
      accessType: "offline", // ✅ Required for refresh token
      prompt: "consent", // ✅ Force Google to reissue refresh token
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        console.log("🔹 FULL GOOGLE RESPONSE:", JSON.stringify(profile, null, 2));
        console.log("✅ Access Token:", accessToken);
        console.log("🔄 Refresh Token:", refreshToken || "Not Provided by Google");

        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
          // 🔹 Create a new user in the database
          user = new User({
            googleId: profile.id,
            email: profile.emails[0].value,
            name: profile.displayName,
            profilePic: profile.photos[0].value,
            accessToken: accessToken, // ✅ Store access token
            refreshToken: refreshToken || null, // ✅ Store refresh token only if available
          });
          await user.save();
          console.log("✅ New User Created:", user.email);
        } else {
          // 🔹 Update existing user
          user.accessToken = accessToken;

          if (refreshToken) {
            user.refreshToken = refreshToken;
            console.log("🔄 Refresh Token Updated for:", user.email);
          }

          await user.save();
          console.log("✅ Existing User Updated:", user.email);
        }

        return done(null, user);
      } catch (error) {
        console.error("❌ Error in Google OAuth:", error);
        return done(error, null);
      }
    }
  )
);

// 🔹 Serialize & Deserialize user
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;
