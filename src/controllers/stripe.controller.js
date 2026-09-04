const crypto = require('crypto');
const prisma = require('../config/database');
const env = require('../config/environment');

const SIGNATURE_TOLERANCE_SECONDS = 300;

const verifySignature = (payload, signature) => {
  if (!env.stripe.webhookSecret || !signature) return false;
  const values = Object.fromEntries(signature.split(',').map((part) => part.split('=')));
  const timestamp = Number(values.t);
  const received = values.v1;
  if (!timestamp || !received || Math.abs(Date.now() / 1000 - timestamp) > SIGNATURE_TOLERANCE_SECONDS) return false;

  const expected = crypto
    .createHmac('sha256', env.stripe.webhookSecret)
    .update(`${timestamp}.${payload}`)
    .digest('hex');
  if (expected.length !== received.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received));
};

const handleCheckoutCompleted = async (event) => {
  const session = event.data?.object;
  if (!session || session.payment_status !== 'paid') return;

  const amount = Number(session.amount_total || 0) / 100;
  const currency = String(session.currency || 'gbp').toUpperCase();
  const email = session.customer_details?.email || session.customer_email;
  if (!email || currency !== 'GBP' || !amount) return;

  const plan = await prisma.hostingPlan.findFirst({
    where: { active: true, priceGBP: amount },
  });
  if (!plan) return;

  const customer = await prisma.hostingCustomer.findFirst({
    where: { email: { equals: email, mode: 'insensitive' }, planId: plan.id },
  });
  if (!customer) return;

  await prisma.$transaction(async (transaction) => {
    const existing = await transaction.hostingOrder.findUnique({ where: { stripeEventId: event.id } });
    if (existing) return;

    await transaction.hostingOrder.create({
      data: {
        customerId: customer.id,
        planId: plan.id,
        amount,
        currency,
        status: 'COMPLETED',
        stripeEventId: event.id,
        stripePaymentReference: session.payment_intent || session.id,
      },
    });
    await transaction.hostingCustomer.update({
      where: { id: customer.id },
      data: { paymentStatus: 'PAID', status: 'ACTIVE', hostingStatus: 'PROVISIONING' },
    });
  });
};

exports.handleStripeWebhook = async (req, res, next) => {
  try {
    if (!req.body) return res.status(400).json({ success: false, error: 'Invalid webhook payload' });
    const payload = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : String(req.body);
    if (!verifySignature(payload, req.headers['stripe-signature'])) {
      return res.status(400).json({ success: false, error: 'Invalid webhook signature' });
    }

    let event;
    try {
      event = JSON.parse(payload);
    } catch {
      return res.status(400).json({ success: false, error: 'Invalid webhook payload' });
    }

    if (!event.id || !event.type) return res.status(400).json({ success: false, error: 'Invalid webhook event' });
    if (event.type === 'checkout.session.completed') await handleCheckoutCompleted(event);
    return res.json({ success: true, received: true });
  } catch (error) {
    next(error);
  }
};