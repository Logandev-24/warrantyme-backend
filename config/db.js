const mongoose = require("mongoose");
require("dotenv").config();
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    logger.info('MongoDB Connected Successfully');
  } catch (err) {
    logger.error(`Database Connection Error: ${err.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
