const { query } = require('../config/database');
const { sendSuccess, sendPaginated } = require('../utils/response');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');
const { AppError } = require('../middleware/error.middleware');
const { createUniqueSlug } = require('../utils/slug');

const formatPosition = (p) => ({
  id: p.id,
  title: p.title,
  slug: p.slug,
  department: p.department,
  employmentType: p.employment_type,
  workMode: p.work_mode,
  location: p.location,
  shortDescription: p.short_description,
  fullDescription: p.full_description,
  responsibilities: p.responsibilities,
  requirements: p.requirements,
  preferredQualifications: p.preferred_qualifications,
  requiredSkills: p.required_skills || [],
  benefits: p.benefits,
  experienceRequired: p.experience_required,
  educationRequired: p.education_required,
  numberOfOpenings: p.number_of_openings,
  applicationDeadline: p.application_deadline,
  status: p.status,
  enabled: p.enabled,
  published: p.published,
  featured: p.featured,
  createdAt: p.created_at,
  updatedAt: p.updated_at,
});

// Public: List all enabled and published positions
const listPublic = async (req, res, next) => {
  try {
    const positionsRes = await query(`
      SELECT * FROM careers_positions
      WHERE enabled = true AND published = true AND status = 'OPEN'
      ORDER BY featured DESC, created_at DESC
    `);
    sendSuccess(res, { positions: positionsRes.rows.map(formatPosition) });
  } catch (err) {
    next(err);
  }
};

// Public: Get position by slug
const getBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const positionRes = await query(`
      SELECT * FROM careers_positions
      WHERE slug = $1 AND enabled = true AND published = true
    `, [slug]);
    
    if (!positionRes.rows.length) {
      throw new AppError('Position not found', 404, 'NOT_FOUND');
    }
    
    // Get custom questions for this position
    const questionsRes = await query(`
      SELECT * FROM career_questions
      WHERE position_id = $1
      ORDER BY sort_order ASC
    `, [positionRes.rows[0].id]);
    
    const questions = await Promise.all(questionsRes.rows.map(async (q) => {
      const optionsRes = await query(`
        SELECT * FROM career_question_options
        WHERE question_id = $1
        ORDER BY sort_order ASC
      `, [q.id]);
      
      return {
        id: q.id,
        questionText: q.question_text,
        questionType: q.question_type,
        required: q.required,
        sortOrder: q.sort_order,
        validationRules: q.validation_rules,
        options: optionsRes.rows.map(o => ({
          id: o.id,
          optionText: o.option_text,
          sortOrder: o.sort_order,
        })),
      };
    }));
    
    sendSuccess(res, {
      position: formatPosition(positionRes.rows[0]),
      questions,
    });
  } catch (err) {
    next(err);
  }
};

// Admin: List all positions with filtering
const listAdmin = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    let whereClauses = [];
    let params = [];
    
    if (req.query.status) {
      params.push(req.query.status);
      whereClauses.push(`status = $${params.length}`);
    }
    if (req.query.department) {
      params.push(req.query.department);
      whereClauses.push(`department = $${params.length}`);
    }
    if (req.query.enabled !== undefined) {
      params.push(req.query.enabled === 'true');
      whereClauses.push(`enabled = $${params.length}`);
    }
    
    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    
    const countRes = await query(`SELECT COUNT(*) FROM careers_positions ${whereSql}`, params);
    const total = parseInt(countRes.rows[0].count, 10);
    
    const listParams = [...params, limit, skip];
    const itemsRes = await query(`
      SELECT * FROM careers_positions
      ${whereSql}
      ORDER BY created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, listParams);
    
    sendPaginated(res, itemsRes.rows.map(formatPosition), buildPaginationMeta(page, limit, total));
  } catch (err) {
    next(err);
  }
};

// Admin: Create position
const create = async (req, res, next) => {
  try {
    const {
      title,
      department,
      employmentType,
      workMode,
      location,
      shortDescription,
      fullDescription,
      responsibilities,
      requirements,
      preferredQualifications,
      requiredSkills,
      benefits,
      experienceRequired,
      educationRequired,
      numberOfOpenings,
      applicationDeadline,
      status,
      enabled,
      published,
      featured,
      questions,
    } = req.body;
    
    const slug = await createUniqueSlug(title, 'careers_positions');
    
    const positionRes = await query(`
      INSERT INTO careers_positions (
        title, slug, department, employment_type, work_mode, location,
        short_description, full_description, responsibilities, requirements,
        preferred_qualifications, required_skills, benefits, experience_required,
        education_required, number_of_openings, application_deadline, status,
        enabled, published, featured, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      RETURNING *
    `, [
      title, slug, department, employmentType, workMode, location,
      shortDescription, fullDescription, responsibilities, requirements,
      preferredQualifications, requiredSkills, benefits, experienceRequired,
      educationRequired, numberOfOpenings, applicationDeadline, status,
      enabled, published, featured, req.user.id,
    ]);
    
    // Add custom questions if provided
    if (questions && Array.isArray(questions)) {
      for (const q of questions) {
        const questionRes = await query(`
          INSERT INTO career_questions (position_id, question_text, question_type, required, sort_order, validation_rules)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id
        `, [positionRes.rows[0].id, q.questionText, q.questionType, q.required, q.sortOrder, JSON.stringify(q.validationRules || {})]);
        
        // Add options for choice-based questions
        if (q.options && Array.isArray(q.options)) {
          for (const opt of q.options) {
            await query(`
              INSERT INTO career_question_options (question_id, option_text, sort_order)
              VALUES ($1, $2, $3)
            `, [questionRes.rows[0].id, opt.optionText, opt.sortOrder]);
          }
        }
      }
    }
    
    sendSuccess(res, { position: formatPosition(positionRes.rows[0]) }, 'Position created', 201);
  } catch (err) {
    next(err);
  }
};

// Admin: Update position
const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      title,
      department,
      employmentType,
      workMode,
      location,
      shortDescription,
      fullDescription,
      responsibilities,
      requirements,
      preferredQualifications,
      requiredSkills,
      benefits,
      experienceRequired,
      educationRequired,
      numberOfOpenings,
      applicationDeadline,
      status,
      enabled,
      published,
      featured,
    } = req.body;
    
    const positionRes = await query(`
      UPDATE careers_positions
      SET title = COALESCE($1, title),
          department = COALESCE($2, department),
          employment_type = COALESCE($3, employment_type),
          work_mode = COALESCE($4, work_mode),
          location = COALESCE($5, location),
          short_description = COALESCE($6, short_description),
          full_description = COALESCE($7, full_description),
          responsibilities = COALESCE($8, responsibilities),
          requirements = COALESCE($9, requirements),
          preferred_qualifications = COALESCE($10, preferred_qualifications),
          required_skills = COALESCE($11, required_skills),
          benefits = COALESCE($12, benefits),
          experience_required = COALESCE($13, experience_required),
          education_required = COALESCE($14, education_required),
          number_of_openings = COALESCE($15, number_of_openings),
          application_deadline = COALESCE($16, application_deadline),
          status = COALESCE($17, status),
          enabled = COALESCE($18, enabled),
          published = COALESCE($19, published),
          featured = COALESCE($20, featured),
          updated_by = $21,
          updated_at = NOW()
      WHERE id = $22
      RETURNING *
    `, [
      title, department, employmentType, workMode, location,
      shortDescription, fullDescription, responsibilities, requirements,
      preferredQualifications, requiredSkills, benefits, experienceRequired,
      educationRequired, numberOfOpenings, applicationDeadline, status,
      enabled, published, featured, req.user.id, id,
    ]);
    
    if (!positionRes.rows.length) {
      throw new AppError('Position not found', 404, 'NOT_FOUND');
    }
    
    sendSuccess(res, { position: formatPosition(positionRes.rows[0]) }, 'Position updated');
  } catch (err) {
    next(err);
  }
};

// Admin: Delete position
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const positionRes = await query('DELETE FROM careers_positions WHERE id = $1 RETURNING id', [id]);
    if (!positionRes.rows.length) {
      throw new AppError('Position not found', 404, 'NOT_FOUND');
    }
    sendSuccess(res, null, 'Position deleted');
  } catch (err) {
    next(err);
  }
};

// Submit application
const submitApplication = async (req, res, next) => {
  try {
    const { positionId } = req.params;
    const {
      fullName,
      email,
      phone,
      location,
      resumeUrl,
      coverLetter,
      portfolioUrl,
      githubUrl,
      linkedinUrl,
      discordUsername,
      answers,
    } = req.body;
    
    const userId = req.user?.id || null;
    
    const applicationRes = await query(`
      INSERT INTO career_applications (
        position_id, user_id, full_name, email, phone, location,
        resume_url, cover_letter, portfolio_url, github_url, linkedin_url, discord_username
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      positionId, userId, fullName, email, phone, location,
      resumeUrl, coverLetter, portfolioUrl, githubUrl, linkedinUrl, discordUsername,
    ]);
    
    // Add answers to custom questions
    if (answers && Array.isArray(answers)) {
      for (const answer of answers) {
        await query(`
          INSERT INTO career_application_answers (application_id, question_id, answer_text, answer_array)
          VALUES ($1, $2, $3, $4)
        `, [
          applicationRes.rows[0].id,
          answer.questionId,
          answer.answerText || null,
          answer.answerArray || null,
        ]);
      }
    }
    
    // Add status history
    await query(`
      INSERT INTO career_application_status_history (application_id, old_status, new_status, changed_by)
      VALUES ($1, NULL, 'NEW', $2)
    `, [applicationRes.rows[0].id, userId]);
    
    sendSuccess(res, { application: applicationRes.rows[0] }, 'Application submitted', 201);
  } catch (err) {
    next(err);
  }
};

// Admin: List applications
const listApplications = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    let whereClauses = [];
    let params = [];
    
    if (req.query.positionId) {
      params.push(req.query.positionId);
      whereClauses.push(`position_id = $${params.length}`);
    }
    if (req.query.status) {
      params.push(req.query.status);
      whereClauses.push(`status = $${params.length}`);
    }
    
    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    
    const countRes = await query(`SELECT COUNT(*) FROM career_applications ${whereSql}`, params);
    const total = parseInt(countRes.rows[0].count, 10);
    
    const listParams = [...params, limit, skip];
    const itemsRes = await query(`
      SELECT a.*, p.title as position_title, p.department
      FROM career_applications a
      LEFT JOIN careers_positions p ON a.position_id = p.id
      ${whereSql}
      ORDER BY a.applied_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, listParams);
    
    sendPaginated(res, itemsRes.rows, buildPaginationMeta(page, limit, total));
  } catch (err) {
    next(err);
  }
};

// Admin: Get application details
const getApplication = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const applicationRes = await query(`
      SELECT a.*, p.title as position_title, p.department, p.location as position_location
      FROM career_applications a
      LEFT JOIN careers_positions p ON a.position_id = p.id
      WHERE a.id = $1
    `, [id]);
    
    if (!applicationRes.rows.length) {
      throw new AppError('Application not found', 404, 'NOT_FOUND');
    }
    
    // Get answers
    const answersRes = await query(`
      SELECT aa.*, q.question_text, q.question_type
      FROM career_application_answers aa
      LEFT JOIN career_questions q ON aa.question_id = q.id
      WHERE aa.application_id = $1
    `, [id]);
    
    // Get notes
    const notesRes = await query(`
      SELECT n.*, u.username as note_author
      FROM career_application_notes n
      LEFT JOIN users u ON n.user_id = u.id
      WHERE n.application_id = $1
      ORDER BY n.created_at DESC
    `, [id]);
    
    // Get status history
    const historyRes = await query(`
      SELECT h.*, u.username as changed_by_user
      FROM career_application_status_history h
      LEFT JOIN users u ON h.changed_by = u.id
      WHERE h.application_id = $1
      ORDER BY h.changed_at DESC
    `, [id]);
    
    sendSuccess(res, {
      application: applicationRes.rows[0],
      answers: answersRes.rows,
      notes: notesRes.rows,
      history: historyRes.rows,
    });
  } catch (err) {
    next(err);
  }
};

// Admin: Update application status
const updateApplicationStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    
    const currentRes = await query('SELECT status FROM career_applications WHERE id = $1', [id]);
    if (!currentRes.rows.length) {
      throw new AppError('Application not found', 404, 'NOT_FOUND');
    }
    
    const oldStatus = currentRes.rows[0].status;
    
    await query(`
      UPDATE career_applications
      SET status = $1, updated_at = NOW()
      WHERE id = $2
    `, [status, id]);
    
    // Add status history
    await query(`
      INSERT INTO career_application_status_history (application_id, old_status, new_status, changed_by, notes)
      VALUES ($1, $2, $3, $4, $5)
    `, [id, oldStatus, status, req.user.id, notes || null]);
    
    sendSuccess(res, null, 'Application status updated');
  } catch (err) {
    next(err);
  }
};

// Admin: Add note to application
const addNote = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { noteText, isPrivate } = req.body;
    
    await query(`
      INSERT INTO career_application_notes (application_id, user_id, note_text, is_private)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [id, req.user.id, noteText, isPrivate !== false]);
    
    sendSuccess(res, null, 'Note added', 201);
  } catch (err) {
    next(err);
  }
};

// Admin: Assign application
const assignApplication = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { assignedTo } = req.body;
    
    await query(`
      UPDATE career_applications
      SET assigned_to = $1, updated_at = NOW()
      WHERE id = $2
    `, [assignedTo, id]);
    
    sendSuccess(res, null, 'Application assigned');
  } catch (err) {
    next(err);
  }
};

// Admin: Get HR overview statistics
const getOverview = async (req, res, next) => {
  try {
    const [
      positionsRes,
      applicationsRes,
      statsRes,
    ] = await Promise.all([
      query('SELECT status, enabled, COUNT(*) FROM careers_positions GROUP BY status, enabled'),
      query('SELECT status, COUNT(*) FROM career_applications GROUP BY status'),
      query(`
        SELECT 
          COUNT(*) as total_positions,
          COUNT(*) FILTER (WHERE enabled = true) as open_positions,
          COUNT(*) FILTER (WHERE enabled = false) as closed_positions,
          COUNT(*) FILTER (WHERE status = 'DRAFT') as draft_positions
        FROM careers_positions
      `),
    ]);
    
    const applicationStats = await query(`
      SELECT 
        COUNT(*) as total_applications,
        COUNT(*) FILTER (WHERE status = 'NEW') as new_applications,
        COUNT(*) FILTER (WHERE status = 'UNDER_REVIEW') as under_review,
        COUNT(*) FILTER (WHERE status = 'SHORTLISTED') as shortlisted,
        COUNT(*) FILTER (WHERE status = 'INTERVIEW') as interview,
        COUNT(*) FILTER (WHERE status = 'HIRED') as hired,
        COUNT(*) FILTER (WHERE status = 'REJECTED') as rejected
      FROM career_applications
    `);
    
    sendSuccess(res, {
      positions: positionsRes.rows,
      applications: applicationsRes.rows,
      stats: statsRes.rows[0],
      applicationStats: applicationStats.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listPublic,
  getBySlug,
  listAdmin,
  create,
  update,
  remove,
  submitApplication,
  listApplications,
  getApplication,
  updateApplicationStatus,
  addNote,
  assignApplication,
  getOverview,
};
