-- Add additional fields to hosting_requests table for detailed hosting requests
ALTER TABLE hosting_requests 
ADD COLUMN IF NOT EXISTS email VARCHAR(255),
ADD COLUMN IF NOT EXISTS discord_username VARCHAR(255),
ADD COLUMN IF NOT EXISTS runtime VARCHAR(50),
ADD COLUMN IF NOT EXISTS project_description TEXT,
ADD COLUMN IF NOT EXISTS expected_workload VARCHAR(500),
ADD COLUMN IF NOT EXISTS mod_mail_required BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS database_required BOOLEAN DEFAULT false;
