const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticate } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/permission.middleware');
const notificationService = require('../services/notification.service');

router.use(authenticate, requirePermission('HOSTING_VIEW'));

// List all hosting requests for admin review
router.get('/requests', async (req, res) => {
  try {
    const result = await query(`
      SELECT hr.*, hp.name as "planName", hp.price_gbp as "priceGBP",
             u.username as "userUsername", u.email as "userEmail"
      FROM hosting_requests hr
      JOIN hosting_plans hp ON hr.plan_id = hp.id
      JOIN users u ON hr.user_id = u.id
      ORDER BY hr.created_at DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error', message: error.message });
  }
});

// Update hosting request status (UNDER_REVIEW, APPROVED, REJECTED, PROVISIONING, ACTIVE)
router.put('/requests/:id/status', async (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    const allowed = ['REQUESTED', 'UNDER_REVIEW', 'APPROVED', 'PROVISIONING', 'ACTIVE', 'REJECTED', 'CANCELLED'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    const result = await query(`
      UPDATE hosting_requests
      SET status = $1, admin_notes = COALESCE($2, admin_notes), updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `, [status, adminNotes || null, req.params.id]);

    if (!result.rows.length) {
      return res.status(404).json({ success: false, error: 'Hosting request not found' });
    }

    const reqData = result.rows[0];

    await notificationService.create(reqData.user_id, {
      type: 'HOSTING',
      title: `Hosting Request ${status}`,
      message: `Your hosting request status for "${reqData.service_name}" was updated to ${status}.`,
      link: '/client-dashboard/index.html',
    });

    res.json({ success: true, data: reqData });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error', message: error.message });
  }
});

// List hosting instances
router.get('/instances', async (req, res) => {
  try {
    const result = await query(`
      SELECT hi.*, hp.name as "planName", u.username as "userUsername", u.email as "userEmail"
      FROM hosting_instances hi
      JOIN hosting_plans hp ON hi.plan_id = hp.id
      JOIN users u ON hi.user_id = u.id
      ORDER BY hi.created_at DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error', message: error.message });
  }
});

// Create/Provision a new hosting instance
router.post('/instances', async (req, res) => {
  try {
    const { requestId, userId, planId, name, serverNode, ipAddress, portMappings, resourceLimits } = req.body;
    if (!userId || !planId || !name) {
      return res.status(422).json({ success: false, error: 'userId, planId, and name are required' });
    }

    const result = await query(`
      INSERT INTO hosting_instances (request_id, user_id, plan_id, name, status, server_node, ip_address, port_mappings, resource_limits)
      VALUES ($1, $2, $3, $4, 'ACTIVE', $5, $6, $7, $8)
      RETURNING *
    `, [
      requestId || null,
      userId,
      planId,
      name,
      serverNode || null,
      ipAddress || null,
      portMappings ? JSON.stringify(portMappings) : null,
      resourceLimits ? JSON.stringify(resourceLimits) : null,
    ]);

    if (requestId) {
      await query("UPDATE hosting_requests SET status = 'ACTIVE' WHERE id = $1", [requestId]);
    }

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error', message: error.message });
  }
});

// Update instance
router.put('/instances/:id', async (req, res) => {
  try {
    const { status, serverNode, ipAddress, suspendedReason } = req.body;
    const result = await query(`
      UPDATE hosting_instances
      SET status = COALESCE($1, status),
          server_node = COALESCE($2, server_node),
          ip_address = COALESCE($3, ip_address),
          suspended_reason = COALESCE($4, suspended_reason),
          updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `, [status, serverNode, ipAddress, suspendedReason, req.params.id]);

    if (!result.rows.length) return res.status(404).json({ success: false, error: 'Instance not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Suspend instance
router.post('/instances/:id/suspend', async (req, res) => {
  try {
    const { reason } = req.body;
    const result = await query(`
      UPDATE hosting_instances
      SET status = 'SUSPENDED', suspended_reason = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [reason || 'Administrative suspension', req.params.id]);

    if (!result.rows.length) return res.status(404).json({ success: false, error: 'Instance not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Activate instance
router.post('/instances/:id/activate', async (req, res) => {
  try {
    const result = await query(`
      UPDATE hosting_instances
      SET status = 'ACTIVE', suspended_reason = NULL, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [req.params.id]);

    if (!result.rows.length) return res.status(404).json({ success: false, error: 'Instance not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;
