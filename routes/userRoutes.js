const express = require('express');
const router = express.Router();
const { getUserData } = require('../controllers/userController');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/dashboard', authMiddleware, getUserData);

module.exports = router;
