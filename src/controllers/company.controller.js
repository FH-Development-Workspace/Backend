const { query } = require('../config/database');
const { sendSuccess } = require('../utils/response');

const getProfile = async (req, res, next) => {
  try {
    const resComp = await query('SELECT * FROM company_profiles LIMIT 1');
    if (!resComp.rows.length) {
      return sendSuccess(res, {
        company: {
          name: 'FH Developments',
          tagline: 'Driven by innovation, powered by people.',
          description: 'FH Developments creates meaningful digital experiences for creators, communities and developers.',
          story: 'FH Developments began with three people trying to help a community: Will, Rhys and Hybridz.',
          stats: { teamMembers: '100+', happyCustomers: '100+', thrivingAffiliates: '50+' },
        }
      });
    }
    const c = resComp.rows[0];
    sendSuccess(res, {
      company: {
        id: c.id,
        name: c.name,
        tagline: c.tagline,
        description: c.description,
        story: c.story,
        stats: typeof c.stats === 'string' ? JSON.parse(c.stats) : c.stats,
        mission: c.mission,
        vision: c.vision,
      }
    });
  } catch (err) {
    next(err);
  }
};

const getTimeline = async (req, res, next) => {
  try {
    sendSuccess(res, { timeline: [] });
  } catch (err) {
    next(err);
  }
};

const createTimelineEvent = async (req, res, next) => {
  try {
    sendSuccess(res, { event: req.body }, 'Timeline event created', 201);
  } catch (err) {
    next(err);
  }
};

const createValue = async (req, res, next) => {
  try {
    sendSuccess(res, { value: req.body }, 'Company value created', 201);
  } catch (err) {
    next(err);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const { name, tagline, description, story, stats, mission, vision } = req.body;
    const existing = await query('SELECT id FROM company_profiles LIMIT 1');

    let result;
    if (existing.rows.length > 0) {
      result = await query(`
        UPDATE company_profiles
        SET name = COALESCE($1, name),
            tagline = COALESCE($2, tagline),
            description = COALESCE($3, description),
            story = COALESCE($4, story),
            stats = COALESCE($5, stats),
            mission = COALESCE($6, mission),
            vision = COALESCE($7, vision),
            updated_at = NOW()
        WHERE id = $8
        RETURNING *
      `, [name, tagline, description, story, stats ? JSON.stringify(stats) : null, mission, vision, existing.rows[0].id]);
    } else {
      result = await query(`
        INSERT INTO company_profiles (name, tagline, description, story, stats, mission, vision)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [name || 'FH Developments', tagline, description, story, stats ? JSON.stringify(stats) : null, mission, vision]);
    }

    sendSuccess(res, { company: result.rows[0] }, 'Company profile updated');
  } catch (err) {
    next(err);
  }
};

module.exports = { getProfile, getTimeline, createTimelineEvent, createValue, updateProfile };
