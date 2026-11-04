-- Careers + HR System Migration (MySQL Version)
-- Creates tables for positions, questions, applications, and related functionality

-- Positions table
CREATE TABLE IF NOT EXISTS careers_positions (
  id CHAR(36) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  department VARCHAR(100),
  employment_type VARCHAR(50) NOT NULL, -- Full-time, Part-time, Contract, Internship, Volunteer
  work_mode VARCHAR(50) NOT NULL, -- Remote, Hybrid, On-site
  location VARCHAR(255),
  short_description TEXT,
  full_description TEXT,
  responsibilities TEXT,
  requirements TEXT,
  preferred_qualifications TEXT,
  required_skills TEXT, -- Comma-separated or JSON string of skills
  benefits TEXT,
  experience_required VARCHAR(100),
  education_required VARCHAR(100),
  number_of_openings INT DEFAULT 1,
  application_deadline TIMESTAMP,
  status VARCHAR(50) NOT NULL DEFAULT 'DRAFT', -- DRAFT, OPEN, PAUSED, CLOSED, ARCHIVED
  enabled TINYINT(1) NOT NULL DEFAULT 0,
  published TINYINT(1) NOT NULL DEFAULT 0,
  featured TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by CHAR(36),
  updated_by CHAR(36),
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_careers_positions_slug ON careers_positions(slug);
CREATE INDEX idx_careers_positions_status ON careers_positions(status);
CREATE INDEX idx_careers_positions_enabled ON careers_positions(enabled);
CREATE INDEX idx_careers_positions_department ON careers_positions(department);

-- Custom questions for positions
CREATE TABLE IF NOT EXISTS career_questions (
  id CHAR(36) PRIMARY KEY,
  position_id CHAR(36) NOT NULL,
  question_text TEXT NOT NULL,
  question_type VARCHAR(50) NOT NULL, -- short_text, long_text, email, phone, number, date, yes_no, single_choice, multiple_choice, file_upload, url
  required TINYINT(1) NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  validation_rules JSON,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (position_id) REFERENCES careers_positions(id) ON DELETE CASCADE
);

CREATE INDEX idx_career_questions_position ON career_questions(position_id);
CREATE INDEX idx_career_questions_order ON career_questions(position_id, sort_order);

-- Options for choice-based questions
CREATE TABLE IF NOT EXISTS career_question_options (
  id CHAR(36) PRIMARY KEY,
  question_id CHAR(36) NOT NULL,
  option_text VARCHAR(255) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (question_id) REFERENCES career_questions(id) ON DELETE CASCADE
);

CREATE INDEX idx_career_question_options_question ON career_question_options(question_id);

-- Applications
CREATE TABLE IF NOT EXISTS career_applications (
  id CHAR(36) PRIMARY KEY,
  position_id CHAR(36) NOT NULL,
  user_id CHAR(36), -- Optional if user is logged in
  status VARCHAR(50) NOT NULL DEFAULT 'NEW', -- NEW, UNDER_REVIEW, SHORTLISTED, INTERVIEW, OFFER, HIRED, REJECTED, WITHDRAWN
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  location VARCHAR(255),
  resume_url TEXT,
  cover_letter TEXT,
  portfolio_url TEXT,
  github_url TEXT,
  linkedin_url TEXT,
  discord_username VARCHAR(100),
  assigned_to CHAR(36),
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (position_id) REFERENCES careers_positions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_career_applications_position ON career_applications(position_id);
CREATE INDEX idx_career_applications_status ON career_applications(status);
CREATE INDEX idx_career_applications_user ON career_applications(user_id);
CREATE INDEX idx_career_applications_email ON career_applications(email);

-- Application answers to custom questions
CREATE TABLE IF NOT EXISTS career_application_answers (
  id CHAR(36) PRIMARY KEY,
  application_id CHAR(36) NOT NULL,
  question_id CHAR(36) NOT NULL,
  answer_text TEXT,
  answer_array TEXT, -- For multiple choice (JSON array)
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (application_id) REFERENCES career_applications(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES career_questions(id) ON DELETE CASCADE
);

CREATE INDEX idx_career_application_answers_application ON career_application_answers(application_id);
CREATE INDEX idx_career_application_answers_question ON career_application_answers(question_id);

-- Application file uploads
CREATE TABLE IF NOT EXISTS career_application_files (
  id CHAR(36) PRIMARY KEY,
  application_id CHAR(36) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_size INT,
  file_type VARCHAR(100),
  uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (application_id) REFERENCES career_applications(id) ON DELETE CASCADE
);

CREATE INDEX idx_career_application_files_application ON career_application_files(application_id);

-- HR notes on applications
CREATE TABLE IF NOT EXISTS career_application_notes (
  id CHAR(36) PRIMARY KEY,
  application_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  note_text TEXT NOT NULL,
  is_private TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (application_id) REFERENCES career_applications(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_career_application_notes_application ON career_application_notes(application_id);
CREATE INDEX idx_career_application_notes_user ON career_application_notes(user_id);

-- Application status history
CREATE TABLE IF NOT EXISTS career_application_status_history (
  id CHAR(36) PRIMARY KEY,
  application_id CHAR(36) NOT NULL,
  old_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL,
  changed_by CHAR(36),
  changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  FOREIGN KEY (application_id) REFERENCES career_applications(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_career_status_history_application ON career_application_status_history(application_id);
CREATE INDEX idx_career_status_history_date ON career_application_status_history(changed_at);

-- Add HR permissions to existing permissions system
-- Note: IDs will be generated by the application code or using proper UUID generation
INSERT IGNORE INTO permissions (slug, name, resource, action, description, created_at, updated_at) VALUES
  ('hr.view', 'View HR Dashboard', 'hr', 'view', 'Can view HR overview and statistics', NOW(), NOW()),
  ('hr.positions.view', 'View Positions', 'hr.positions', 'view', 'Can view all career positions', NOW(), NOW()),
  ('hr.positions.create', 'Create Positions', 'hr.positions', 'create', 'Can create new career positions', NOW(), NOW()),
  ('hr.positions.edit', 'Edit Positions', 'hr.positions', 'edit', 'Can edit existing career positions', NOW(), NOW()),
  ('hr.positions.publish', 'Publish Positions', 'hr.positions', 'publish', 'Can publish/unpublish positions', NOW(), NOW()),
  ('hr.positions.delete', 'Delete Positions', 'hr.positions', 'delete', 'Can delete career positions', NOW(), NOW()),
  ('hr.applications.view', 'View Applications', 'hr.applications', 'view', 'Can view job applications', NOW(), NOW()),
  ('hr.applications.update', 'Update Applications', 'hr.applications', 'update', 'Can update application status', NOW(), NOW()),
  ('hr.applications.notes', 'Add Application Notes', 'hr.applications', 'notes', 'Can add notes to applications', NOW(), NOW()),
  ('hr.applications.assign', 'Assign Applications', 'hr.applications', 'assign', 'Can assign applications to recruiters', NOW(), NOW()),
  ('hr.applications.export', 'Export Applications', 'hr.applications', 'export', 'Can export application data', NOW(), NOW()),
  ('hr.settings.manage', 'Manage HR Settings', 'hr.settings', 'manage', 'Can manage HR system settings', NOW(), NOW());

-- Add HR role if it doesn't exist
INSERT IGNORE INTO roles (name, slug, description, department, is_system, created_at, updated_at) VALUES
  ('HR', 'hr', 'Human Resources staff', 'HR', 1, NOW(), NOW());

-- Assign basic HR permissions to HR role
INSERT IGNORE INTO role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, NOW() 
FROM roles r, permissions p
WHERE r.slug = 'hr' AND p.slug IN (
  'hr.view',
  'hr.positions.view',
  'hr.positions.create',
  'hr.positions.edit',
  'hr.positions.publish',
  'hr.applications.view',
  'hr.applications.update',
  'hr.applications.notes',
  'hr.applications.assign'
);
