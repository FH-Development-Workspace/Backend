const slugify = require('slugify');
const { query } = require('../config/database');

const createSlug = (text) => {
  return slugify(text || '', { lower: true, strict: true, trim: true });
};

const createUniqueSlug = async (text, tableName, field = 'slug', excludeId = null) => {
  let base = createSlug(text) || 'item';
  let slug = base;
  let counter = 1;

  while (true) {
    let sql = `SELECT id FROM ${tableName} WHERE ${field} = $1`;
    let params = [slug];
    if (excludeId) {
      sql += ` AND id != $2`;
      params.push(excludeId);
    }
    const existing = await query(sql, params);
    if (!existing.rows.length) return slug;
    slug = `${base}-${counter++}`;
  }
};

module.exports = { createSlug, createUniqueSlug };
