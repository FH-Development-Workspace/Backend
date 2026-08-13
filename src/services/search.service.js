const prisma = require('../config/database');

const search = async (query, limit = 5) => {
  if (!query || query.trim().length < 2) {
    return { products: [], services: [], projects: [], blog: [], docs: [], changelog: [], faq: [], careers: [] };
  }

  const q = query.trim();
  const contains = { contains: q, mode: 'insensitive' };

  const [products, services, projects, blog, docs, changelog, faq, careers] = await Promise.all([
    prisma.product.findMany({
      where: { published: true, deletedAt: null, OR: [{ name: contains }, { description: contains }] },
      select: { id: true, name: true, slug: true, tagline: true },
      take: limit,
    }),
    prisma.service.findMany({
      where: { published: true, deletedAt: null, OR: [{ name: contains }, { description: contains }] },
      select: { id: true, name: true, slug: true, tagline: true },
      take: limit,
    }),
    prisma.project.findMany({
      where: { status: 'PUBLISHED', deletedAt: null, OR: [{ name: contains }, { description: contains }] },
      select: { id: true, name: true, slug: true, description: true },
      take: limit,
    }),
    prisma.blogPost.findMany({
      where: { status: 'PUBLISHED', deletedAt: null, OR: [{ title: contains }, { excerpt: contains }] },
      select: { id: true, title: true, slug: true, excerpt: true },
      take: limit,
    }),
    prisma.documentationArticle.findMany({
      where: { status: 'PUBLISHED', deletedAt: null, OR: [{ title: contains }, { content: contains }] },
      select: { id: true, title: true, slug: true },
      take: limit,
    }),
    prisma.changelogRelease.findMany({
      where: { status: 'PUBLISHED', OR: [{ version: contains }, { title: contains }] },
      select: { id: true, version: true, title: true },
      take: limit,
    }),
    prisma.fAQ.findMany({
      where: { status: 'PUBLISHED', OR: [{ question: contains }, { answer: contains }] },
      select: { id: true, question: true },
      take: limit,
    }),
    prisma.job.findMany({
      where: { status: 'PUBLISHED', deletedAt: null, OR: [{ title: contains }, { description: contains }] },
      select: { id: true, title: true, slug: true, location: true },
      take: limit,
    }),
  ]);

  return { products, services, projects, blog, docs, changelog, faq, careers };
};

module.exports = { search };
