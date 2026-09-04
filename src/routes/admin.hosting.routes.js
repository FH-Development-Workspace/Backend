const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const { authenticate } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/permission.middleware');

router.use(authenticate, requirePermission('HOSTING_VIEW'));

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

router.get('/orders', async (req, res) => {
  try {
    const orders = await prisma.hostingOrder.findMany({ include: { plan: true, customer: true } });
    res.json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.post('/instances', async (req, res) => {
  try {
    const { customerId, planId, runtime, hostname, resourceAllocation, deploymentStatus } = req.body;
    if (!customerId || !planId) {
      return res.status(422).json({ success: false, error: 'customerId and planId are required' });
    }
    const instance = await prisma.hostingInstance.create({
      data: { customerId, planId, runtime, hostname, resourceAllocation, deploymentStatus },
    });
    res.status(201).json({ success: true, data: instance });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.put('/instances/:id', async (req, res) => {
  try {
    const allowed = ['status', 'runtime', 'hostname', 'resourceAllocation', 'deploymentStatus'];
    const data = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
    const instance = await prisma.hostingInstance.update({ where: { id: req.params.id }, data });
    res.json({ success: true, data: instance });
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
