const { query } = require('../config/database');
const { sendSuccess } = require('../utils/response');
const { AppError } = require('../middleware/error.middleware');

const listCategories = async (req, res, next) => {
  try {
    sendSuccess(res, { categories: [{ id: 'general', name: 'General' }, { id: 'hosting', name: 'Hosting' }, { id: 'products', name: 'Products' }] });
  } catch (err) {
    next(err);
  }
};

const list = async (req, res, next) => {
  try {
    const resFaq = await query('SELECT key as id, value FROM system_settings WHERE key LIKE \'faq_%\'');
    if (!resFaq.rows.length) {
      const defaultFaqs = [
        { id: '1', question: 'What backend languages do you support for hosting?', answer: 'FH Developments supports Python and JavaScript backend codebases, including Discord bots.' },
        { id: '2', question: 'How are hosting requests processed?', answer: 'Submit a hosting request with your repository and environment details. Our team manually reviews and provisions your instance.' },
        { id: '3', question: 'Is Mod Mail available?', answer: 'Yes! Mod Mail is supported on all hosting plans, though Standard or Premium is recommended for adequate CPU capacity.' }
      ];
      return sendSuccess(res, { faqs: defaultFaqs });
    }
    const faqs = resFaq.rows.map(r => ({ id: r.id, ...(typeof r.value === 'string' ? JSON.parse(r.value) : r.value) }));
    sendSuccess(res, { faqs });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const { question, answer } = req.body;
    const key = 'faq_' + Date.now();
    const value = JSON.stringify({ question, answer });
    await query('INSERT INTO system_settings (key, value) VALUES ($1, $2)', [key, value]);
    sendSuccess(res, { faq: { id: key, question, answer } }, 'FAQ created', 201);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const { question, answer } = req.body;
    const key = req.params.id;
    const value = JSON.stringify({ question, answer });
    const resUpdate = await query('UPDATE system_settings SET value = $1, updated_at = NOW() WHERE key = $2 RETURNING *', [value, key]);
    if (!resUpdate.rows.length) throw new AppError('FAQ item not found', 404, 'NOT_FOUND');
    sendSuccess(res, { faq: { id: key, question, answer } }, 'FAQ updated');
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    await query('DELETE FROM system_settings WHERE key = $1', [req.params.id]);
    sendSuccess(res, null, 'FAQ deleted');
  } catch (err) {
    next(err);
  }
};

module.exports = { listCategories, list, create, update, remove };
