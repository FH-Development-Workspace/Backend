const { query } = require('../config/database');
const { sendSuccess } = require('../utils/response');
const { AppError } = require('../middleware/error.middleware');

const list = async (req, res, next) => {
  try {
    const itemsRes = await query('SELECT * FROM team_members ORDER BY sort_order ASC, created_at DESC');
    sendSuccess(res, { members: itemsRes.rows });
  } catch (err) {
    next(err);
  }
};

const listAll = async (req, res, next) => {
  return list(req, res, next);
};

const create = async (req, res, next) => {
  try {
    const { name, role, bio, avatarUrl, sortOrder, githubUrl, twitterUrl, linkedinUrl } = req.body;
    const resMember = await query(`
      INSERT INTO team_members (name, role, bio, avatar_url, sort_order, github_url, twitter_url, linkedin_url)
      VALUES ($1, $2, $3, $4, COALESCE($5, 0), $6, $7, $8)
      RETURNING *
    `, [name, role, bio || null, avatarUrl || null, sortOrder, githubUrl || null, twitterUrl || null, linkedinUrl || null]);

    sendSuccess(res, { member: resMember.rows[0] }, 'Team member created', 201);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const { name, role, bio, avatarUrl, sortOrder, githubUrl, twitterUrl, linkedinUrl } = req.body;
    const resMember = await query(`
      UPDATE team_members
      SET name = COALESCE($1, name),
          role = COALESCE($2, role),
          bio = COALESCE($3, bio),
          avatar_url = COALESCE($4, avatar_url),
          sort_order = COALESCE($5, sort_order),
          github_url = COALESCE($6, github_url),
          twitter_url = COALESCE($7, twitter_url),
          linkedin_url = COALESCE($8, linkedin_url),
          updated_at = NOW()
      WHERE id = $9
      RETURNING *
    `, [name, role, bio, avatarUrl, sortOrder, githubUrl, twitterUrl, linkedinUrl, req.params.id]);

    if (!resMember.rows.length) throw new AppError('Team member not found', 404, 'NOT_FOUND');
    sendSuccess(res, { member: resMember.rows[0] }, 'Team member updated');
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    await query('DELETE FROM team_members WHERE id = $1', [req.params.id]);
    sendSuccess(res, null, 'Team member deleted');
  } catch (err) {
    next(err);
  }
};

module.exports = { list, listAll, create, update, remove };
