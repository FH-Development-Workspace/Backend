const { query, transaction } = require('../config/database');
const { sendSuccess } = require('../utils/response');
const { AppError } = require('../middleware/error.middleware');

const list = async (req, res, next) => {
  try {
    const relRes = await query('SELECT * FROM changelog_releases ORDER BY released_at DESC');
    const releases = relRes.rows;

    for (const rel of releases) {
      const entRes = await query('SELECT * FROM changelog_entries WHERE release_id = $1', [rel.id]);
      rel.entries = entRes.rows;
    }

    sendSuccess(res, { releases });
  } catch (err) {
    next(err);
  }
};

const getByVersion = async (req, res, next) => {
  try {
    const relRes = await query('SELECT * FROM changelog_releases WHERE version = $1', [req.params.version]);
    if (!relRes.rows.length) throw new AppError('Release not found', 404, 'NOT_FOUND');
    const release = relRes.rows[0];

    const entRes = await query('SELECT * FROM changelog_entries WHERE release_id = $1', [release.id]);
    release.entries = entRes.rows;

    sendSuccess(res, { release });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const { version, title, summary, entries } = req.body;
    const release = await transaction(async (client) => {
      const rRes = await client.query(`
        INSERT INTO changelog_releases (version, title, summary)
        VALUES ($1, $2, $3)
        RETURNING *
      `, [version, title, summary || null]);

      const r = rRes.rows[0];

      if (entries?.length) {
        for (const entry of entries) {
          await client.query(`
            INSERT INTO changelog_entries (release_id, type, description)
            VALUES ($1, COALESCE($2, 'ADDED'), $3)
          `, [r.id, entry.type, entry.description]);
        }
      }

      return r;
    });

    sendSuccess(res, { release }, 'Release created', 201);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const { version, title, summary } = req.body;
    const rRes = await query(`
      UPDATE changelog_releases
      SET version = COALESCE($1, version),
          title = COALESCE($2, title),
          summary = COALESCE($3, summary)
      WHERE id = $4
      RETURNING *
    `, [version, title, summary, req.params.id]);

    if (!rRes.rows.length) throw new AppError('Release not found', 404, 'NOT_FOUND');
    sendSuccess(res, { release: rRes.rows[0] }, 'Release updated');
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    await query('DELETE FROM changelog_releases WHERE id = $1', [req.params.id]);
    sendSuccess(res, null, 'Release deleted');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  list,
  getByVersion,
  create,
  createRelease: create,
  update,
  remove,
  removeRelease: remove,
};
