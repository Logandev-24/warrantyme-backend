const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ status: 'OK', message: '✅ Server is running smoothly' });
});

module.exports = router;
