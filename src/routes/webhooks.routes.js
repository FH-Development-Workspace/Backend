const express = require('express');
const { handleStripeWebhook } = require('../controllers/stripe.controller');

const router = express.Router();

router.post('/stripe', express.raw({ type: 'application/json', limit: '1mb' }), handleStripeWebhook);

module.exports = router;