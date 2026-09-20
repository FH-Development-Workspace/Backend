-- Careers + HR System Migration
-- Creates tables for positions, questions, applications, and related functionality

-- Positions table
CREATE TABLE IF NOT EXISTS careers_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  required_skills TEXT[], -- Array of skills
  benefits TEXT,
  experience_required VARCHAR(100),
  education_required VARCHAR(100),
  number_of_openings INT DEFAULT 1,
  application_deadline TIMESTAMPTZ,
  status VARCHAR(50) NOT NULL DEFAULT 'DRAFT', -- DRAFT, OPEN, PAUSED, CLOSED, ARCHIVED
  enabled BOOLEAN NOT NULL DEFAULT false,
  published BOOLEAN NOT NULL DEFAULT false,
  featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_careers_positions_slug ON careers_positions(slug);
CREATE INDEX idx_careers_positions_status ON careers_positions(status);
CREATE INDEX idx_careers_positions_enabled ON careers_positions(enabled);
CREATE INDEX idx_careers_positions_department ON careers_positions(department);

-- Custom questions for positions
CREATE TABLE IF NOT EXISTS career_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id UUID NOT NULL REFERENCES careers_positions(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type VARCHAR(50) NOT NULL, -- short_text, long_text, email, phone, number, date, yes_no, single_choice, multiple_choice, file_upload, url
  required BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  validation_rules JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_career_questions_position ON career_questions(position_id);
CREATE INDEX idx_career_questions_order ON career_questions(position_id, sort_order);

-- Options for choice-based questions
CREATE TABLE IF NOT EXISTS career_question_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES career_questions(id) ON DELETE CASCADE,
  option_text VARCHAR(255) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_career_question_options_question ON career_question_options(question_id);

-- Applications
CREATE TABLE IF NOT EXISTS career_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id UUID NOT NULL REFERENCES careers_positions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Optional if user is logged in
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
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_career_applications_position ON career_applications(position_id);
CREATE INDEX idx_career_applications_status ON career_applications(status);
CREATE INDEX idx_career_applications_user ON career_applications(user_id);
CREATE INDEX idx_career_applications_email ON career_applications(email);

-- Application answers to custom questions
CREATE TABLE IF NOT EXISTS career_application_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES career_applications(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES career_questions(id) ON DELETE CASCADE,
  answer_text TEXT,
  answer_array TEXT[], -- For multiple choice
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_career_application_answers_application ON career_application_answers(application_id);
CREATE INDEX idx_career_application_answers_question ON career_application_answers(question_id);

-- Application file uploads
CREATE TABLE IF NOT EXISTS career_application_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES career_applications(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_size INT,
  file_type VARCHAR(100),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_career_application_files_application ON career_application_files(application_id);

-- HR notes on applications
CREATE TABLE IF NOT EXISTS career_application_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES career_applications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  note_text TEXT NOT NULL,
  is_private BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_career_application_notes_application ON career_application_notes(application_id);
CREATE INDEX idx_career_application_notes_user ON career_application_notes(user_id);

-- Application status history
CREATE TABLE IF NOT EXISTS career_application_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES career_applications(id) ON DELETE CASCADE,
  old_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL,
  changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT
);

CREATE INDEX idx_career_status_history_application ON career_application_status_history(application_id);
CREATE INDEX idx_career_status_history_date ON career_application_status_history(changed_at);

-- Add HR permissions to existing permissions system
INSERT INTO permissions (slug, name, resource, action, description) VALUES
  ('hr.view', 'View HR Dashboard', 'hr', 'view', 'Can view HR overview and statistics'),
  ('hr.positions.view', 'View Positions', 'hr.positions', 'view', 'Can view all career positions'),
  ('hr.positions.create', 'Create Positions', 'hr.positions', 'create', 'Can create new career positions'),
  ('hr.positions.edit', 'Edit Positions', 'hr.positions', 'edit', 'Can edit existing career positions'),
  ('hr.positions.publish', 'Publish Positions', 'hr.positions', 'publish', 'Can publish/unpublish positions'),
  ('hr.positions.delete', 'Delete Positions', 'hr.positions', 'delete', 'Can delete career positions'),
  ('hr.applications.view', 'View Applications', 'hr.applications', 'view', 'Can view job applications'),
  ('hr.applications.update', 'Update Applications', 'hr.applications', 'update', 'Can update application status'),
  ('hr.applications.notes', 'Add Application Notes', 'hr.applications', 'notes', 'Can add notes to applications'),
  ('hr.applications.assign', 'Assign Applications', 'hr.applications', 'assign', 'Can assign applications to recruiters'),
  ('hr.applications.export', 'Export Applications', 'hr.applications', 'export', 'Can export application data'),
  ('hr.settings.manage', 'Manage HR Settings', 'hr.settings', 'manage', 'Can manage HR system settings')
ON CONFLICT (slug) DO NOTHING;

-- Add HR role if it doesn't exist
INSERT INTO roles (name, slug, description, department, is_system) VALUES
  ('HR', 'hr', 'Human Resources staff', 'HR', true)
ON CONFLICT (slug) DO NOTHING;

-- Assign basic HR permissions to HR role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
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
)
ON CONFLICT DO NOTHING;
