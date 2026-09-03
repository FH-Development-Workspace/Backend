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

  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@fh-development.xyz';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!';
  const adminUsername = process.env.SEED_ADMIN_USERNAME || 'admin';

  const passwordHash = await bcrypt.hash(adminPassword, 12);
  const superAdminRole = await prisma.role.findUnique({ where: { slug: 'super_admin' } });

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    create: {
      username: adminUsername,
      email: adminEmail,
      passwordHash,
      emailVerified: true,
      status: 'ACTIVE',
      profile: { create: { displayName: 'System Administrator', firstName: 'System', lastName: 'Admin' } },
      roles: superAdminRole ? { create: { roleId: superAdminRole.id } } : undefined,
    },
    update: { passwordHash, status: 'ACTIVE', emailVerified: true },
  });

  const userRole = await prisma.role.findUnique({ where: { slug: 'user' } });
  await prisma.user.upsert({
    where: { email: 'demo@fh-development.xyz' },
    create: {
      username: 'demouser',
      email: 'demo@fh-development.xyz',
      passwordHash: await bcrypt.hash('DemoUser123!', 12),
      emailVerified: true,
      status: 'ACTIVE',
      profile: { create: { displayName: 'Demo User' } },
      roles: userRole ? { create: { roleId: userRole.id } } : undefined,
    },
    update: {},
  });

  const productCategory = await prisma.productCategory.upsert({
    where: { slug: 'software' },
    create: { name: 'Software', slug: 'software', description: 'FH Development software products' },
    update: {},
  });

  await prisma.product.upsert({
    where: { slug: 'fh-studio' },
    create: {
      name: 'FH Studio',
      slug: 'fh-studio',
      tagline: 'Professional creative suite',
      description: 'A powerful creative software suite for professionals.',
      status: 'ACTIVE',
      featured: true,
      published: true,
      categoryId: productCategory.id,
      features: {
        create: [
          { title: 'Multi-platform', description: 'Works on Windows, macOS, and Linux', displayOrder: 1 },
          { title: 'Cloud sync', description: 'Sync projects across devices', displayOrder: 2 },
        ],
      },
      technologies: {
        create: [{ name: 'Electron' }, { name: 'React' }],
      },
      versions: {
        create: [{
          version: '1.0.0',
          releaseDate: new Date(),
          releaseNotes: 'Initial release',
          status: 'RELEASED',
          supportedPlatforms: ['windows', 'macos', 'linux'],
        }],
      },
    },
    update: {},
  });

  await prisma.serviceCategory.upsert({
    where: { slug: 'consulting' },
    create: { name: 'Consulting', slug: 'consulting' },
    update: {},
  });

  const consulting = await prisma.serviceCategory.findUnique({ where: { slug: 'consulting' } });
  await prisma.service.upsert({
    where: { slug: 'custom-software-development' },
    create: {
      name: 'Custom Software Development',
      slug: 'custom-software-development',
      tagline: 'Tailored solutions for your business',
      description: 'End-to-end custom software development services.',
      published: true,
      featured: true,
      categoryId: consulting?.id,
    },
    update: {},
  });

  await prisma.fAQCategory.upsert({
    where: { slug: 'general' },
    create: { name: 'General', slug: 'general' },
    update: {},
  });

  const faqCat = await prisma.fAQCategory.findUnique({ where: { slug: 'general' } });
  await prisma.fAQ.createMany({
    data: [
      { question: 'What is FH Development?', answer: 'FH Development is a software company building innovative products.', categoryId: faqCat?.id, status: 'PUBLISHED', displayOrder: 1 },
      { question: 'How do I get support?', answer: 'Create a support ticket from your account dashboard or contact us.', categoryId: faqCat?.id, status: 'PUBLISHED', displayOrder: 2 },
    ],
    skipDuplicates: true,
  });

  await prisma.changelogRelease.upsert({
    where: { version: '1.0.0' },
    create: {
      version: '1.0.0',
      title: 'Initial Platform Release',
      releaseDate: new Date(),
      status: 'PUBLISHED',
      publishedAt: new Date(),
      items: {
        create: [
          { type: 'NEW', title: 'Platform launch', displayOrder: 1 },
          { type: 'NEW', title: 'User authentication system', displayOrder: 2 },
        ],
      },
    },
    update: {},
  });

  await prisma.blogCategory.upsert({
    where: { slug: 'announcements' },
    create: { name: 'Announcements', slug: 'announcements' },
    update: {},
  });

  const blogCat = await prisma.blogCategory.findUnique({ where: { slug: 'announcements' } });
  await prisma.blogPost.upsert({
    where: { slug: 'welcome-to-fh-development' },
    create: {
      title: 'Welcome to FH Development',
      slug: 'welcome-to-fh-development',
      excerpt: 'Introducing our new platform.',
      content: '<p>We are excited to launch the FH Development platform.</p>',
      status: 'PUBLISHED',
      featured: true,
      categoryId: blogCat?.id,
      publishedAt: new Date(),
    },
    update: {},
  });

  await prisma.roadmapItem.createMany({
    data: [
      { title: 'Mobile App', description: 'Native mobile applications', status: 'PLANNED', category: 'Product', targetPeriod: '2026 Q4', isPublic: true, displayOrder: 1 },
      { title: 'API v2', description: 'Next generation API', status: 'IN_PROGRESS', category: 'Engineering', targetPeriod: '2026 Q3', isPublic: true, displayOrder: 2 },
    ],
    skipDuplicates: true,
  });

  await prisma.companyProfile.deleteMany({});
  await prisma.companyProfile.create({
    data: {
      name: 'FH Development',
      tagline: 'Building the future of software',
      description: 'FH Development creates innovative software products and services.',
      mission: 'To build exceptional software that empowers people.',
      foundedYear: 2020,
      headquarters: 'Global',
      website: 'https://fh-development.xyz',
      email: 'hello@fh-development.xyz',
    },
  });

  await prisma.teamMember.createMany({
    data: [
      { name: 'Alex Founder', position: 'CEO & Founder', bio: 'Leading FH Development vision.', published: true, displayOrder: 1 },
      { name: 'Sam Engineer', position: 'Lead Developer', bio: 'Building core platform.', published: true, displayOrder: 2 },
    ],
    skipDuplicates: true,
  });

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
  console.log(`Admin: ${adminEmail} / (from SEED_ADMIN_PASSWORD env)`);
  console.log('Demo user: demo@fh-development.xyz / DemoUser123!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
