const { query: dbQuery } = require('../config/database');

const search = async (qText, limit = 5) => {
  if (!qText || qText.trim().length < 2) {
    return { products: [], services: [], blog: [], docs: [], changelog: [], careers: [] };
  }

  const q = `%${qText.trim()}%`;

  const [productsRes, servicesRes, blogRes, docsRes, changelogRes, jobsRes] = await Promise.all([
    dbQuery(`
      SELECT id, name, slug, summary
      FROM products
      WHERE status = 'ACTIVE' AND (name ILIKE $1 OR description ILIKE $1 OR summary ILIKE $1)
      LIMIT $2
    `, [q, limit]),
    dbQuery(`
      SELECT id, name, slug, summary
      FROM services
      WHERE active = true AND (name ILIKE $1 OR description ILIKE $1 OR summary ILIKE $1)
      LIMIT $2
    `, [q, limit]),
    dbQuery(`
      SELECT id, title, slug, excerpt
      FROM blog_posts
      WHERE status = 'PUBLISHED' AND (title ILIKE $1 OR excerpt ILIKE $1 OR content ILIKE $1)
      LIMIT $2
    `, [q, limit]),
    dbQuery(`
      SELECT id, title, slug
      FROM documentation_articles
      WHERE title ILIKE $1 OR content ILIKE $1
      LIMIT $2
    `, [q, limit]),
    dbQuery(`
      SELECT id, version, title, summary
      FROM changelog_releases
      WHERE version ILIKE $1 OR title ILIKE $1 OR summary ILIKE $1
      LIMIT $2
    `, [q, limit]),
    dbQuery(`
      SELECT id, title, department, location
      FROM jobs
      WHERE status = 'OPEN' AND (title ILIKE $1 OR description ILIKE $1 OR department ILIKE $1)
      LIMIT $2
    `, [q, limit]),
  ]);

  return {
    products: productsRes.rows,
    services: servicesRes.rows,
    blog: blogRes.rows,
    docs: docsRes.rows,
    changelog: changelogRes.rows,
    careers: jobsRes.rows,
  };
};

module.exports = { search };
