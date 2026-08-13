const slugify = require('slugify');

const createSlug = (text) => {
  return slugify(text, { lower: true, strict: true, trim: true });
};

const createUniqueSlug = async (text, model, field = 'slug', excludeId = null) => {
  let base = createSlug(text);
  let slug = base;
  let counter = 1;

  while (true) {
    const where = { [field]: slug };
    if (excludeId) where.id = { not: excludeId };
    const existing = await model.findFirst({ where });
    if (!existing) return slug;
    slug = `${base}-${counter++}`;
  }
};

module.exports = { createSlug, createUniqueSlug };
