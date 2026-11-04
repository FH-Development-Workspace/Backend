const { query, transaction } = require('../config/database');
const emailService = require('../services/email.service');
const notificationService = require('../services/notification.service');
const auditService = require('../services/audit.service');

const FALLBACK_HOSTING_PLANS = [
  {
    id: "bbdce768-996b-480b-a70c-425591b5a0fc",
    name: "Starter",
    slug: "starter",
    priceGBP: 1.16,
    ramMB: 512,
    cpuPercent: 50,
    storageGB: 5,
    databaseLimit: 1,
    backupLimit: 1,
    modMailAvailable: true,
    recommended: false,
    description: "Best for: Small Discord bots & lightweight microservices",
    active: true,
  },
  {
    id: "bbef4b2d-2b52-4162-b2af-eb45c2d418fe",
    name: "Standard",
    slug: "standard",
    priceGBP: 2.31,
    ramMB: 1024,
    cpuPercent: 100,
    storageGB: 10,
    databaseLimit: 2,
    backupLimit: 2,
    modMailAvailable: true,
    recommended: true,
    description: "Best for: Most Discord bots, Mod Mail and everyday workloads",
    active: true,
  },
  {
    id: "b2e44203-61cf-4d9a-b112-9b9087e045ac",
    name: "Premium",
    slug: "premium",
    priceGBP: 4.04,
    ramMB: 2048,
    cpuPercent: 200,
    storageGB: 20,
    databaseLimit: 3,
    backupLimit: 5,
    modMailAvailable: true,
    recommended: false,
    description: "Best for: Larger, high-concurrency Discord bots & multi-service APIs",
    active: true,
  }
];

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
    if (result.rows && result.rows.length > 0) {
      return res.json({ success: true, data: result.rows });
    }
    // Return fallback plans if database table is empty
    res.json({ success: true, data: FALLBACK_HOSTING_PLANS });
  } catch (error) {
    // Graceful fallback to cached official plans if database connection is disrupted
    res.json({ success: true, data: FALLBACK_HOSTING_PLANS });
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

    if (result.rows.length) {
      return res.json({ success: true, data: result.rows[0] });
    }

    const fallback = FALLBACK_HOSTING_PLANS.find(p => p.slug === req.params.slug);
    if (fallback) {
      return res.json({ success: true, data: fallback });
    }

    return res.status(404).json({ success: false, error: 'Plan not found' });
  } catch (error) {
    const fallback = FALLBACK_HOSTING_PLANS.find(p => p.slug === req.params.slug);
    if (fallback) {
      return res.json({ success: true, data: fallback });
    }
    res.status(500).json({ success: false, error: 'Internal server error', message: error.message });
  }
};

exports.requestHosting = async (req, res) => {
  try {
    const { 
      planId, 
      serviceName, 
      repoUrl, 
      environmentNotes, 
      additionalNotes,
      email,
      discordUsername,
      runtime,
      projectDescription,
      expectedWorkload,
      modMailRequired,
      databaseRequired
    } = req.body;
    const userId = req.user.id;

    if (!planId || !serviceName) {
      return res.status(400).json({ success: false, error: 'planId and serviceName are required' });
    }

    let planName = 'Hosting Plan';
    try {
      const planRes = await query('SELECT * FROM hosting_plans WHERE id = $1 AND active = true', [planId]);
      if (planRes.rows.length) {
        planName = planRes.rows[0].name;
      } else {
        const fb = FALLBACK_HOSTING_PLANS.find(p => p.id === planId);
        if (fb) planName = fb.name;
      }
    } catch (_) {
      const fb = FALLBACK_HOSTING_PLANS.find(p => p.id === planId);
      if (fb) planName = fb.name;
    }

    const reqRes = await query(`
      INSERT INTO hosting_requests (
        user_id, plan_id, service_name, repo_url, environment_notes, additional_notes,
        email, discord_username, runtime, project_description, expected_workload,
        mod_mail_required, database_required, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'REQUESTED')
      RETURNING *
    `, [
      userId, planId, serviceName, repoUrl || null, environmentNotes || null, additionalNotes || null,
      email || null, discordUsername || null, runtime || null, projectDescription || null, expectedWorkload || null,
      modMailRequired || false, databaseRequired || false
    ]);

    const hostingReq = reqRes.rows[0];

    try {
      await auditService.log({
        actorId: userId,
        action: 'HOSTING_REQUESTED',
        resource: 'hosting_request',
        resourceId: hostingReq.id,
        ipAddress: req.ip,
      });
    } catch (_) {}

    try {
      await notificationService.create(userId, {
        type: 'HOSTING',
        title: 'Hosting Request Submitted',
        message: `Your hosting request for "${serviceName}" under plan ${planName} has been received and is under review.`,
        link: '/client-dashboard/index.html',
      });
    } catch (notificationError) {
      console.error('Notification service error:', notificationError);
    }

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
