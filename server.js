const express = require("express");
const cors = require("cors");
const session = require("express-session");
const passport = require("passport");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const driveRoutes = require("./routes/driveRoutes");
const healthRoutes = require("./routes/healthRoutes");
const logger = require("./utils/logger");
const morgan = require("morgan");
require("dotenv").config();

// ✅ Ensure Passport configuration is required before use
require("./config/Passport");

const app = express();

// ✅ Connect to MongoDB
connectDB();

// ✅ Logging requests using Morgan + Winston
app.use(morgan("combined", { stream: { write: (message) => logger.info(message.trim()) } }));

// ✅ Enable CORS with frontend URL from .env
const corsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
};
app.use(cors(corsOptions));

// ✅ Parse JSON request body
app.use(express.json());

// ✅ Secure session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    },
  })
);

// ✅ Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// ✅ Routes
app.use("/auth", authRoutes);
app.use("/drive", driveRoutes);
app.use("/", healthRoutes);

// ✅ Global Error Handling Middleware (Move it here)
app.use((err, req, res, next) => {
  logger.error(`❌ Error: ${err.message} - ${req.method} ${req.url}`);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || "Internal Server Error",
  });
});

// ✅ Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  logger.info(`🚀 Server running on port ${PORT}`);
});
