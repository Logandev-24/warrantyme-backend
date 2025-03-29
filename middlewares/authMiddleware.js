const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    logger.warn('🔒 Unauthorized access attempt: No Token Provided');
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    logger.info(`🔑 Authenticated User: ${decoded.email}`);
    next();
  } catch (error) {
    logger.error(`❌ Invalid Token Attempt: ${error.message}`);
    res.status(403).json({ error: 'Invalid or expired token' });
  }
};

module.exports = authMiddleware;
