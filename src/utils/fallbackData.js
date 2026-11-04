'use strict';

const FALLBACK_PRODUCTS = [
  {
    id: 'prod-nexus-framework',
    name: 'FH Nexus Framework',
    slug: 'fh-nexus-framework',
    summary: 'Modular Core Architecture for Modern Roblox Games',
    description: 'An enterprise-grade server-client bridge, lifecycle orchestrator, and networking engine designed for complex Roblox experiences.',
    priceGBP: 14.99,
    isFree: false,
    status: 'ACTIVE',
    featured: true,
    bannerUrl: 'assets/logos/Real_White_Logo.png',
    iconUrl: 'assets/logos/White_Logo.jpg',
    category: { id: 'cat-systems', name: 'Frameworks', slug: 'systems' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod-datastore-sync',
    name: 'FH DataStore Sync',
    slug: 'fh-datastore-sync',
    summary: 'Resilient Persistent Cloud Storage for Roblox',
    description: 'Zero-data-loss storage system featuring session locking, automated migration pipelines, and offline backup queues.',
    priceGBP: 9.99,
    isFree: false,
    status: 'ACTIVE',
    featured: true,
    bannerUrl: 'assets/logos/Real_White_Logo.png',
    iconUrl: 'assets/logos/White_Logo.jpg',
    category: { id: 'cat-developer', name: 'Developer Tools', slug: 'developer' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod-fps-engine',
    name: 'FH Advanced FPS Engine',
    slug: 'fh-advanced-fps-engine',
    summary: 'High-Fidelity Combat Mechanics & Weapon Physics',
    description: 'Procedural recoil, spring-based viewmodel physics, modular attachments, and server-side raycasting hit validation.',
    priceGBP: 19.99,
    isFree: false,
    status: 'ACTIVE',
    featured: false,
    bannerUrl: 'assets/logos/Real_White_Logo.png',
    iconUrl: 'assets/logos/White_Logo.jpg',
    category: { id: 'cat-systems', name: 'Game Systems', slug: 'systems' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod-admin-suite',
    name: 'FH Studio Admin Suite',
    slug: 'fh-studio-admin-suite',
    summary: 'Role-Based In-Game Moderation & Command Terminal',
    description: 'Modern glassmorphism admin panel with role permissions, audit trails, Discord webhook alerts, and temporary bans.',
    priceGBP: 7.99,
    isFree: false,
    status: 'ACTIVE',
    featured: false,
    bannerUrl: 'assets/logos/Real_White_Logo.png',
    iconUrl: 'assets/logos/White_Logo.jpg',
    category: { id: 'cat-software', name: 'Software', slug: 'software' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod-automation-bot',
    name: 'FH Automation Bot Kit',
    slug: 'fh-automation-bot-kit',
    summary: 'Roblox-to-Discord Guild Integration Daemon',
    description: 'Automated ranking, Roblox OAuth2 verification, group moderation, and economy synchronization built on Node.js.',
    priceGBP: 12.50,
    isFree: false,
    status: 'ACTIVE',
    featured: false,
    bannerUrl: 'assets/logos/Real_White_Logo.png',
    iconUrl: 'assets/logos/White_Logo.jpg',
    category: { id: 'cat-automation', name: 'Automation', slug: 'automation' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod-ui-library',
    name: 'FH UI Component Library',
    slug: 'fh-ui-component-library',
    summary: 'Polished Modular HUDs & Menu Interfaces',
    description: 'Sleek, responsive UI frames, sound-reactive buttons, and animated modal transitions with gamepad support.',
    priceGBP: 0.00,
    isFree: true,
    status: 'ACTIVE',
    featured: false,
    bannerUrl: 'assets/logos/Real_White_Logo.png',
    iconUrl: 'assets/logos/White_Logo.jpg',
    category: { id: 'cat-ui', name: 'Interface Design', slug: 'ui' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const FALLBACK_SERVICES = [
  {
    id: 'srv-custom-dev',
    name: 'Custom Roblox Architecture',
    slug: 'custom-roblox-systems',
    summary: 'Tailor-made backend mechanics, replication architecture, and custom framework integrations.',
    description: 'End-to-end game system design for high-concurrency experiences. We implement optimized replication, state management, and memory-safe physics.',
    priceGBP: 49.99,
    features: ['Custom Luau Module Architecture', 'Anti-Tamper & Server Validation', 'Multiplayer Stress-Testing', '30-Day Deployment Guarantee'],
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'srv-cloud-hosting',
    name: 'Managed Discord Bot & API Hosting',
    slug: 'bot-and-api-hosting',
    summary: '24/7 dedicated container runtime with 99.9% guaranteed uptime for Python and Node.js bots.',
    description: 'Zero-configuration container hosting on AMD Ryzen hardware. Includes automatic process restarts, live CPU/RAM metrics, and Git deploys.',
    priceGBP: 3.50,
    features: ['Instant Pterodactyl Panel Control', 'Automated Health Watchdogs', 'Dedicated Fast NVMe Storage', 'Mod Mail & Slash Command Ready'],
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'srv-security-audit',
    name: 'Roblox Experience Security Audit',
    slug: 'security-audit',
    summary: 'Comprehensive vulnerability scanning against remote event spoofing and physics exploitation.',
    description: 'Our engineers audit your server remotes, data saving logic, and client-server boundaries to prevent exploits before public release.',
    priceGBP: 34.99,
    features: ['Remote Event Pen-Testing', 'DataStore Race Condition Audit', 'Memory Leak Analysis', 'Detailed Executive Remediation Report'],
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const FALLBACK_BLOG = [
  {
    id: 'blog-1',
    title: 'Optimizing Luau Network Payloads with Buffer Serialization',
    slug: 'optimizing-luau-network-payloads',
    excerpt: 'How packing game telemetry into compact byte buffers reduces server bandwidth by up to 74%.',
    content: 'Replication overhead is the primary bottleneck in large-scale Roblox games. By migrating from traditional RemoteEvent tables to structured binary buffers, developer teams can pack transforms, player health, and action inputs into minified payloads...',
    coverImage: 'assets/logos/Real_White_Logo.png',
    status: 'PUBLISHED',
    author: { username: 'FH Systems Team' },
    category: { name: 'Engineering', slug: 'engineering' },
    publishedAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  },
  {
    id: 'blog-2',
    title: 'Architecting Fault-Tolerant Session Locks on Roblox',
    slug: 'fault-tolerant-session-locking',
    excerpt: 'Eliminating cross-server race conditions and duplication bugs through distributed lease algorithms.',
    content: 'When players jump between teleport destinations rapidly, uncommitted data sessions can cause devastating rollbacks or item duplication. This article details the mathematical model behind lease heartbeats...',
    coverImage: 'assets/logos/Real_White_Logo.png',
    status: 'PUBLISHED',
    author: { username: 'FH Core Team' },
    category: { name: 'Infrastructure', slug: 'infrastructure' },
    publishedAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  }
];

const FALLBACK_REVIEWS = [
  {
    id: 'rev-1',
    userUsername: 'Marcus Thorne',
    productName: 'FH Nexus Framework',
    rating: 5,
    title: 'Flawless engineering and zero memory leaks',
    comment: 'FH Developments delivered an exceptional backend bridge between our Roblox live ops and our web dashboard. Flawless uptime and incredible engineering quality.',
    createdAt: new Date().toISOString()
  },
  {
    id: 'rev-2',
    userUsername: 'Kieran Vance',
    productName: 'Managed Discord Bot Hosting',
    rating: 5,
    title: 'Rock solid 6 month uptime',
    comment: 'The Mod Mail and Discord bot hosting suite has run for over 6 months without a single drop. Fast, reliable, and outstanding support.',
    createdAt: new Date().toISOString()
  },
  {
    id: 'rev-3',
    userUsername: 'Devon Reed',
    productName: 'FH DataStore Sync',
    rating: 5,
    title: 'Shaved months off our release schedule',
    comment: 'Their modular systems shaved months off our game release schedule. Clear documentation, modern Luau coding standards, and zero bugs.',
    createdAt: new Date().toISOString()
  }
];

const FALLBACK_COMPANY = {
  name: 'FH Developments',
  tagline: 'Building Technology for What\'s Next',
  mission: 'To engineer robust digital systems, developer tools, and cloud infrastructure that empower communities and creators worldwide.',
  description: 'FH Developments creates software, digital products, developer tools and custom technology — with a focus on high-quality Roblox Studio assets and dependable Python/Node.js backend hosting.',
  story: 'Founded by passionate systems architects and game engineers, FH Developments began with a mission to eliminate boilerplate headaches for Roblox developers. Today, we power thousands of daily interactions across game networks, cloud services, and community automation.',
  stats: {
    teamMembers: '12+',
    happyCustomers: '1,500+',
    thrivingAffiliates: '40+',
    uptimePercentage: '99.9%'
  }
};

const FALLBACK_FEATURES = [
  { id: 'f-1', title: 'Modular Architecture', description: 'Component-based packages that drop into any existing codebase with zero friction.' },
  { id: 'f-2', title: 'High-Concurrency Replication', description: 'Optimized Luau serialization tuned for 100+ player server instances.' },
  { id: 'f-3', title: 'Automated Cloud Sync', description: 'Persistent state replication to secure PostgreSQL and Redis infrastructure.' },
  { id: 'f-4', title: 'Automated DDoS Mitigation', description: 'Enterprise network filtering ensuring continuous socket connections.' },
  { id: 'f-5', title: 'Comprehensive REST APIs', description: 'Clean JSON contracts with JWT token security and role-based permissions.' },
  { id: 'f-6', title: '24/7 Process Supervision', description: 'Instant auto-restart watchdogs keep your bots and workers operational.' }
];

module.exports = {
  FALLBACK_PRODUCTS,
  FALLBACK_SERVICES,
  FALLBACK_BLOG,
  FALLBACK_REVIEWS,
  FALLBACK_COMPANY,
  FALLBACK_FEATURES
};

