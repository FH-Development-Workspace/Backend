const express = require('express');
const router = express.Router();

// Webhook routes placeholder (Stripe completely removed per manual hosting system requirements)
router.use((req, res) => {
  res.status(404).json({ message: 'Webhook endpoint unavailable' });
});

module.exports = router;