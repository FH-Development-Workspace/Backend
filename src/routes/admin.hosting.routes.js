const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// const { protect, restrictTo } = require('../middleware/auth.middleware');

// Apply protection if it was uncommented
// router.use(protect);
// router.use(restrictTo('admin', 'super_admin'));

router.get('/customers', async (req, res) => {
  try {
    const customers = await prisma.hostingCustomer.findMany({ include: { plan: true } });
    res.json({ success: true, data: customers });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/instances', async (req, res) => {
  try {
    const instances = await prisma.hostingInstance.findMany({ include: { plan: true, customer: true } });
    res.json({ success: true, data: instances });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.post('/instances/:id/suspend', async (req, res) => {
  try {
    const instance = await prisma.hostingInstance.update({
      where: { id: req.params.id },
      data: { status: 'SUSPENDED' }
    });
    res.json({ success: true, data: instance });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.post('/instances/:id/activate', async (req, res) => {
  try {
    const instance = await prisma.hostingInstance.update({
      where: { id: req.params.id },
      data: { status: 'RUNNING' }
    });
    res.json({ success: true, data: instance });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;
