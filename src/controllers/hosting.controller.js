const { query, transaction } = require('../config/database');
const emailService = require('../services/email.service');
const notificationService = require('../services/notification.service');
const auditService = require('../services/audit.service');

exports.getPlans = async (req, res) => {
  try {
    const result = await query(`
      SELECT id, name, slug, price_gbp as "priceGBP", ram_mb as "ramMB", cpu_percent as "cpuPercent",
             storage_gb as "storageGB", database_limit as "databaseLimit", backup_limit as "backupLimit",
             mod_mail_available as "modMailAvailable", recommended, description, active, created_at as "createdAt"
      FROM hosting_plans
      WHERE active = true
      ORDER BY price_gbp ASC
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error', message: error.message });
  }
};

exports.getPlan = async (req, res) => {
  try {
    const result = await query(`
      SELECT id, name, slug, price_gbp as "priceGBP", ram_mb as "ramMB", cpu_percent as "cpuPercent",
             storage_gb as "storageGB", database_limit as "databaseLimit", backup_limit as "backupLimit",
             mod_mail_available as "modMailAvailable", recommended, description, active, created_at as "createdAt"
      FROM hosting_plans
      WHERE slug = $1 AND active = true
    `, [req.params.slug]);

    if (!result.rows.length) {
      return res.status(404).json({ success: false, error: 'Plan not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error', message: error.message });
  }
};

exports.requestHosting = async (req, res) => {
  try {
    const { planId, serviceName, repoUrl, environmentNotes, additionalNotes } = req.body;
    const userId = req.user.id;

    if (!planId || !serviceName) {
      return res.status(400).json({ success: false, error: 'planId and serviceName are required' });
    }

    const planRes = await query('SELECT * FROM hosting_plans WHERE id = $1 AND active = true', [planId]);
    if (!planRes.rows.length) {
      return res.status(404).json({ success: false, error: 'Active hosting plan not found' });
    }
    const plan = planRes.rows[0];

    const reqRes = await query(`
      INSERT INTO hosting_requests (user_id, plan_id, service_name, repo_url, environment_notes, additional_notes, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'REQUESTED')
      RETURNING *
    `, [userId, planId, serviceName, repoUrl || null, environmentNotes || null, additionalNotes || null]);

    const hostingReq = reqRes.rows[0];

    await auditService.log({
      actorId: userId,
      action: 'HOSTING_REQUESTED',
      resource: 'hosting_request',
      resourceId: hostingReq.id,
      ipAddress: req.ip,
    });

    await notificationService.create(userId, {
      type: 'HOSTING',
      title: 'Hosting Request Submitted',
      message: `Your hosting request for "${serviceName}" under plan ${plan.name} has been received and is under review.`,
      link: '/client-dashboard/index.html',
    });

    res.status(201).json({
      success: true,
      message: 'Hosting request submitted successfully for manual review.',
      data: hostingReq,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error', message: error.message });
  }
};

exports.getMyHosting = async (req, res) => {
  try {
    const userId = req.user.id;

    const requestsRes = await query(`
      SELECT hr.*, hp.name as "planName", hp.slug as "planSlug", hp.price_gbp as "priceGBP"
      FROM hosting_requests hr
      JOIN hosting_plans hp ON hr.plan_id = hp.id
      WHERE hr.user_id = $1
      ORDER BY hr.created_at DESC
    `, [userId]);

    const instancesRes = await query(`
      SELECT hi.*, hp.name as "planName"
      FROM hosting_instances hi
      JOIN hosting_plans hp ON hi.plan_id = hp.id
      WHERE hi.user_id = $1
      ORDER BY hi.created_at DESC
    `, [userId]);

    res.json({
      success: true,
      data: {
        requests: requestsRes.rows,
        instances: instancesRes.rows,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error', message: error.message });
  }
};

exports.getMyHostingById = async (req, res) => {
  try {
    const userId = req.user.id;

    const requestRes = await query(`
      SELECT hr.*, hp.name as "planName", hp.price_gbp as "priceGBP", hp.ram_mb as "ramMB", hp.cpu_percent as "cpuPercent"
      FROM hosting_requests hr
      JOIN hosting_plans hp ON hr.plan_id = hp.id
      WHERE hr.id = $1 AND hr.user_id = $2
    `, [req.params.id, userId]);

    if (!requestRes.rows.length) {
      return res.status(404).json({ success: false, error: 'Hosting request not found' });
    }

    res.json({ success: true, data: requestRes.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
