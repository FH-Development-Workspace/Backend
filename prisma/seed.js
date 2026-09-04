require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

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

const ROLE_PERMISSIONS = {
  user: [],
  support: ['SUPPORT_VIEW', 'SUPPORT_REPLY', 'SUPPORT_ASSIGN', 'SUPPORT_EDIT', 'USER_VIEW', 'LICENSE_VIEW', 'DOWNLOAD_VIEW'],
  editor: ['BLOG_VIEW', 'BLOG_CREATE', 'BLOG_EDIT', 'BLOG_PUBLISH', 'DOC_VIEW', 'DOC_CREATE', 'DOC_EDIT', 'FAQ_VIEW', 'FAQ_CREATE', 'FAQ_EDIT', 'CHANGELOG_VIEW', 'CHANGELOG_CREATE', 'CHANGELOG_EDIT'],
  developer: ['PRODUCT_VIEW', 'PRODUCT_CREATE', 'PRODUCT_EDIT', 'PRODUCT_PUBLISH', 'DOC_VIEW', 'DOC_CREATE', 'DOC_EDIT', 'PROJECT_VIEW', 'PROJECT_CREATE', 'PROJECT_EDIT', 'CHANGELOG_VIEW', 'CHANGELOG_CREATE', 'CHANGELOG_EDIT', 'ROADMAP_VIEW', 'ROADMAP_CREATE', 'ROADMAP_EDIT'],
  manager: ['PRODUCT_VIEW', 'PRODUCT_EDIT', 'PRODUCT_PUBLISH', 'SERVICE_VIEW', 'SERVICE_EDIT', 'ANALYTICS_VIEW', 'SUPPORT_VIEW', 'USER_VIEW', 'ROADMAP_VIEW', 'ROADMAP_EDIT', 'REVIEW_MODERATE', 'CAREER_VIEW', 'APPLICATION_VIEW'],
  admin: PERMISSIONS.map(([r, a]) => `${r}_${a}`).filter((p) => p !== 'SYSTEM_SETTINGS'),
  super_admin: PERMISSIONS.map(([r, a]) => `${r}_${a}`),
};

async function main() {
  console.log('Seeding FH Development database...');

  for (const role of ROLES) {
    await prisma.role.upsert({
      where: { slug: role.slug },
      create: role,
      update: role,
    });
  }

  for (const [resource, action] of PERMISSIONS) {
    const slug = `${resource}_${action}`;
    await prisma.permission.upsert({
      where: { slug },
      create: {
        name: slug.replace(/_/g, ' '),
        slug,
        resource,
        action,
      },
      update: {},
    });
  }

  const allPermissions = await prisma.permission.findMany();
  const permMap = Object.fromEntries(allPermissions.map((p) => [p.slug, p.id]));

  for (const [roleSlug, permSlugs] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await prisma.role.findUnique({ where: { slug: roleSlug } });
    if (!role) continue;

    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });

    const ids = permSlugs.map((s) => permMap[s]).filter(Boolean);
    if (ids.length) {
      await prisma.rolePermission.createMany({
        data: ids.map((permissionId) => ({ roleId: role.id, permissionId })),
      });
    }
  }

  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  const adminUsername = process.env.SEED_ADMIN_USERNAME || 'admin';

  if (process.env.NODE_ENV === 'production' && (!adminEmail || !adminPassword)) {
    throw new Error('SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are required in production');
  }

  if (!adminEmail || !adminPassword) {
    console.log('Skipping admin account seed because SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are not configured.');
  }

  const superAdminRole = await prisma.role.findUnique({ where: { slug: 'super_admin' } });

  if (adminEmail && adminPassword) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await prisma.user.upsert({
      where: { email: adminEmail },
      create: {
        username: adminUsername,
        email: adminEmail,
        passwordHash,
        emailVerified: true,
        status: 'ACTIVE',
        profile: { create: { displayName: 'System Administrator' } },
        roles: superAdminRole ? { create: { roleId: superAdminRole.id } } : undefined,
      },
      update: { passwordHash, status: 'ACTIVE', emailVerified: true },
    });
  }

  const companyStory = 'FH Developments began with three people trying to help a community: Will, Rhys and Hybridz. Will and Hybridz set out to create a leading development store that could help people build better projects, while Rhys joined to support the project and lead public relations. That early collaboration grew into the company we see today. The name FH stands for Fistey and Hybridz Dynamics, with Fistey being Will\'s Discord username.';
  const companyStats = { teamMembers: '100+', happyCustomers: '100+', thrivingAffiliates: '50+' };
  const company = await prisma.companyProfile.findFirst();
  if (company) {
    await prisma.companyProfile.update({ where: { id: company.id }, data: { story: companyStory, stats: companyStats } });
  } else {
    await prisma.companyProfile.create({
      data: {
        name: 'FH Developments',
        tagline: 'Driven by innovation, powered by people.',
        description: 'FH Developments creates meaningful digital experiences for creators, communities and developers.',
        story: companyStory,
        stats: companyStats,
        mission: 'To create dependable digital products that help people build, connect and grow.',
        vision: 'A more capable and connected future for creators and communities.',
      },
    });
  }

  const hostingPlans = [
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

  for (const plan of hostingPlans) {
    await prisma.hostingPlan.upsert({
      where: { slug: plan.slug },
      create: plan,
      update: plan,
    });
  }

  console.log('Seed completed successfully.');
  if (adminEmail) console.log(`Admin seeded for ${adminEmail}.`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
