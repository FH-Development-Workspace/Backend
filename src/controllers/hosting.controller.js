const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getPlans = async (req, res) => {
  try {
    const plans = await prisma.hostingPlan.findMany({
      where: { active: true },
      orderBy: { priceGBP: 'asc' }
    });
    res.json({ success: true, data: plans });
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({ success: false, error: 'Internal server error', message: error.message });
  }
};

exports.getPlan = async (req, res) => {
  try {
    const plan = await prisma.hostingPlan.findUnique({
      where: { slug: req.params.slug }
    });
    if (!plan) return res.status(404).json({ success: false, error: 'Plan not found' });
    res.json({ success: true, data: plan });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error', message: error.message });
  }
};

exports.requestHosting = async (req, res) => {
  try {
    const { planId, email } = req.body;
    const userId = req.user.id;

    const customer = await prisma.hostingCustomer.create({
      data: {
        userId,
        email,
        planId,
        status: 'PENDING',
        paymentStatus: 'NOT_REQUIRED', // No payment integration
        hostingStatus: 'REQUESTED'
      }
    });

    res.status(201).json({ success: true, data: customer });
  } catch (error) {
    console.error('Error creating hosting request:', error);
    res.status(500).json({ success: false, error: 'Internal server error', message: error.message });
  }
};

exports.getMyHosting = async (req, res) => {
  try {
    const userId = req.user.id;
    const services = await prisma.hostingCustomer.findMany({
      where: { userId },
      include: { plan: true, instances: true }
    });
    res.json({ success: true, data: services });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error', message: error.message });
  }
};
