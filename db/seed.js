require('dotenv').config();
const bcrypt = require('bcrypt');
const { query, transaction, pool } = require('../src/config/database');

const ROLES = [
  { name: 'User', slug: 'user', description: 'Standard customer user', isSystem: true },
  { name: 'Support', slug: 'support', description: 'Support staff', department: 'COMMUNITY', isSystem: true },
  { name: 'Editor', slug: 'editor', description: 'Content editor', department: 'MARKETING', isSystem: true },
  { name: 'Developer', slug: 'developer', description: 'Engineering staff', department: 'ENGINEERING', isSystem: true },
  { name: 'Manager', slug: 'manager', description: 'Department manager', department: 'OPERATIONS', isSystem: true },
  { name: 'Admin', slug: 'admin', description: 'Platform administrator', department: 'OPERATIONS', isSystem: true },
  { name: 'Super Admin', slug: 'super_admin', description: 'Full system access', department: 'EXECUTIVE', isSystem: true },
];

const PERMISSIONS = [
  ['USER', 'VIEW'], ['USER', 'CREATE'], ['USER', 'EDIT'], ['USER', 'SUSPEND'], ['USER', 'DELETE'],
  ['ROLE', 'VIEW'], ['ROLE', 'CREATE'], ['ROLE', 'EDIT'],
  ['PERMISSION', 'VIEW'], ['PERMISSION', 'CREATE'],
  ['PRODUCT', 'VIEW'], ['PRODUCT', 'CREATE'], ['PRODUCT', 'EDIT'], ['PRODUCT', 'DELETE'], ['PRODUCT', 'PUBLISH'],
  ['SERVICE', 'VIEW'], ['SERVICE', 'CREATE'], ['SERVICE', 'EDIT'], ['SERVICE', 'DELETE'],
  ['PROJECT', 'VIEW'], ['PROJECT', 'CREATE'], ['PROJECT', 'EDIT'], ['PROJECT', 'DELETE'],
  ['LICENSE', 'VIEW'], ['LICENSE', 'CREATE'], ['LICENSE', 'EDIT'], ['LICENSE', 'REVOKE'], ['LICENSE', 'DELETE'],
  ['DOWNLOAD', 'VIEW'],
  ['BLOG', 'VIEW'], ['BLOG', 'CREATE'], ['BLOG', 'EDIT'], ['BLOG', 'DELETE'], ['BLOG', 'PUBLISH'],
  ['DOC', 'VIEW'], ['DOC', 'CREATE'], ['DOC', 'EDIT'], ['DOC', 'DELETE'],
  ['CHANGELOG', 'VIEW'], ['CHANGELOG', 'CREATE'], ['CHANGELOG', 'EDIT'], ['CHANGELOG', 'DELETE'],
  ['FAQ', 'VIEW'], ['FAQ', 'CREATE'], ['FAQ', 'EDIT'], ['FAQ', 'DELETE'],
  ['REVIEW', 'MODERATE'],
  ['SUPPORT', 'VIEW'], ['SUPPORT', 'REPLY'], ['SUPPORT', 'ASSIGN'], ['SUPPORT', 'EDIT'],
  ['CONTACT', 'VIEW'], ['CONTACT', 'EDIT'],
  ['CAREER', 'VIEW'], ['CAREER', 'CREATE'], ['CAREER', 'EDIT'], ['CAREER', 'DELETE'],
  ['APPLICATION', 'VIEW'], ['APPLICATION', 'EDIT'],
  ['TEAM', 'VIEW'], ['TEAM', 'CREATE'], ['TEAM', 'EDIT'], ['TEAM', 'DELETE'],
  ['COMPANY', 'EDIT'],
  ['PARTNER', 'CREATE'], ['PARTNER', 'EDIT'], ['PARTNER', 'DELETE'],
  ['SUBSIDIARY', 'CREATE'], ['SUBSIDIARY', 'EDIT'], ['SUBSIDIARY', 'DELETE'],
  ['ROADMAP', 'VIEW'], ['ROADMAP', 'CREATE'], ['ROADMAP', 'EDIT'], ['ROADMAP', 'DELETE'],
  ['ANALYTICS', 'VIEW'],
  ['AUDIT', 'VIEW'],
  ['SYSTEM', 'SETTINGS'],
  ['HOSTING', 'VIEW'], ['HOSTING', 'MANAGE'],
  ['BLACKLIST', 'VIEW'], ['BLACKLIST', 'MANAGE'],
  ['CONTENT', 'VIEW'], ['CONTENT', 'MANAGE'],
];

const HOSTING_PLANS = [
  {
    name: 'Starter',
    slug: 'starter',
    priceGBP: 1.16,
    ramMB: 512,
    cpuPercent: 50,
    storageGB: 5,
    databaseLimit: 1,
    backupLimit: 1,
    modMailAvailable: true,
    recommended: false,
    description: 'Best for: Small Discord bots',
  },
  {
    name: 'Standard',
    slug: 'standard',
    priceGBP: 2.31,
    ramMB: 1024,
    cpuPercent: 100,
    storageGB: 10,
    databaseLimit: 2,
    backupLimit: 2,
    modMailAvailable: true,
    recommended: true,
    description: 'Best for: Most Discord bots and everyday workloads',
  },
  {
    name: 'Premium',
    slug: 'premium',
    priceGBP: 4.04,
    ramMB: 2048,
    cpuPercent: 200,
    storageGB: 20,
    databaseLimit: 3,
    backupLimit: 5,
    modMailAvailable: true,
    recommended: false,
    description: 'Best for: Larger, more demanding Discord bots',
  }
];

async function seed() {
  console.log('Seeding FH Development PostgreSQL Database...');

  // 1. Roles
  for (const r of ROLES) {
    await query(`
      INSERT INTO roles (name, slug, description, department, is_system)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (slug) DO UPDATE
      SET name = EXCLUDED.name, description = EXCLUDED.description, department = EXCLUDED.department, updated_at = NOW()
    `, [r.name, r.slug, r.description, r.department || null, r.isSystem]);
  }

  // 2. Permissions
  for (const [res, act] of PERMISSIONS) {
    const slug = `${res}_${act}`;
    const name = slug.replace(/_/g, ' ');
    await query(`
      INSERT INTO permissions (name, slug, resource, action)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (slug) DO NOTHING
    `, [name, slug, res, act]);
  }

  // 3. Hosting Plans
  for (const plan of HOSTING_PLANS) {
    await query(`
      INSERT INTO hosting_plans (name, slug, price_gbp, ram_mb, cpu_percent, storage_gb, database_limit, backup_limit, mod_mail_available, recommended, description, active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true)
      ON CONFLICT (slug) DO UPDATE
      SET price_gbp = EXCLUDED.price_gbp,
          ram_mb = EXCLUDED.ram_mb,
          cpu_percent = EXCLUDED.cpu_percent,
          storage_gb = EXCLUDED.storage_gb,
          database_limit = EXCLUDED.database_limit,
          backup_limit = EXCLUDED.backup_limit,
          mod_mail_available = EXCLUDED.mod_mail_available,
          recommended = EXCLUDED.recommended,
          description = EXCLUDED.description,
          updated_at = NOW()
    `, [
      plan.name, plan.slug, plan.priceGBP, plan.ramMB, plan.cpuPercent, plan.storageGB,
      plan.databaseLimit, plan.backupLimit, plan.modMailAvailable, plan.recommended, plan.description
    ]);
  }

  // 4. Seed Admin user if environment variables set
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@fh-development.xyz';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'AdminPass123!';
  const adminUsername = process.env.SEED_ADMIN_USERNAME || 'admin';

  if (adminEmail && adminPassword) {
    const hash = await bcrypt.hash(adminPassword, 12);
    const userRes = await query(`
      INSERT INTO users (username, email, password_hash, email_verified, status)
      VALUES ($1, $2, $3, true, 'ACTIVE')
      ON CONFLICT (email) DO UPDATE
      SET password_hash = EXCLUDED.password_hash, status = 'ACTIVE', email_verified = true, updated_at = NOW()
      RETURNING id
    `, [adminUsername, adminEmail, hash]);

    const userId = userRes.rows[0].id;

    // Profile
    await query(`
      INSERT INTO profiles (user_id, display_name, first_name, last_name)
      VALUES ($1, 'System Administrator', 'Admin', 'User')
      ON CONFLICT (user_id) DO NOTHING
    `, [userId]);

    // Role
    const roleRes = await query(`SELECT id FROM roles WHERE slug = 'super_admin'`);
    if (roleRes.rows.length > 0) {
      const superAdminRoleId = roleRes.rows[0].id;
      await query(`
        INSERT INTO user_roles (user_id, role_id)
        VALUES ($1, $2)
        ON CONFLICT (user_id, role_id) DO NOTHING
      `, [userId, superAdminRoleId]);
    }

    console.log(`Admin user seeded: ${adminEmail}`);
  }

  // 5. Company profile
  await query(`
    INSERT INTO company_profiles (name, tagline, description, story, stats, mission, vision)
    VALUES (
      'FH Developments',
      'Driven by innovation, powered by people.',
      'FH Developments creates meaningful digital experiences for creators, communities and developers.',
      'FH Developments began with three people trying to help a community: Will, Rhys and Hybridz. Will and Hybridz set out to create a leading development store that could help people build better projects, while Rhys joined to support the project and lead public relations. That early collaboration grew into the company we see today. The name FH stands for Fistey and Hybridz Dynamics, with Fistey being Will''s Discord username.',
      '{"teamMembers": "100+", "happyCustomers": "100+", "thrivingAffiliates": "50+"}',
      'To create dependable digital products that help people build, connect and grow.',
      'A more capable and connected future for creators and communities.'
    )
    ON CONFLICT DO NOTHING
  `);

  console.log('Database seeding completed successfully.');
  await pool.end();
}

seed().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
