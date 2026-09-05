// Stripe functionality has been completely removed per master application requirements.
// Hosting operates via manual request workflow.

exports.handleStripeWebhook = async (req, res) => {
  res.status(404).json({ message: 'Stripe webhook integration removed' });
};