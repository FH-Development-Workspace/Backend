const prisma = require('../config/database');
const env = require('../config/environment');

exports.getPlans = async (req, res) => {
  try {
    const plans = await prisma.hostingPlan.findMany({
      where: { active: true },
      orderBy: { priceGBP: 'asc' },
      select: {
        id: true, name: true, slug: true, priceGBP: true, billingPeriod: true,
        ramMB: true, cpuPercent: true, storageGB: true, databaseLimit: true,
        backupLimit: true, modMailAvailable: true, recommended: true,
        description: true, active: true, createdAt: true, updatedAt: true,
      },
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
    if (!plan || !plan.active) return res.status(404).json({ success: false, error: 'Plan not found' });
    delete plan.stripePaymentLink;
    res.json({ success: true, data: plan });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error', message: error.message });
  }
};

exports.requestHosting = async (req, res) => {
  try {
    const { planId, email } = req.body;
    const userId = req.user.id;

    const plan = await prisma.hostingPlan.findFirst({ where: { id: planId, active: true } });
    if (!plan) return res.status(404).json({ success: false, error: 'Active hosting plan not found' });

    const customerEmail = email || req.user.email;
    const existing = await prisma.hostingCustomer.findFirst({
      where: { userId, planId, status: { in: ['PENDING', 'ACTIVE'] } },
    });
    if (existing) return res.status(409).json({ success: false, error: 'An active request already exists for this plan' });

    const customer = await prisma.hostingCustomer.create({
      data: {
        userId,
        email: customerEmail,
        planId,
        status: 'PENDING',
        paymentStatus: 'UNPAID',
        hostingStatus: 'REQUESTED'
      }
    });

    res.status(201).json({
      success: true,
      data: { ...customer, paymentUrl: env.hosting.paymentLinks[plan.slug] || null },
    });
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
