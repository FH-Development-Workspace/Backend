# FH Developments Central Backend API Platform

Full-stack production API providing identity, commerce, hosting requests, documentation, support ticketing, and CMS features for FH Developments.

## Architecture & Tech Stack

- **Runtime**: Node.js (>=20.0.0) & Express.js
- **Database**: PostgreSQL (`pg` connection pool with parameterized SQL queries)
- **Authentication**: JWT Access & Refresh Tokens, bcrypt password hashing, role-based access control
- **Storage**: Cloudinary & local disk storage abstraction
- **Integrations**: SpaceMail SMTP, Roblox Vault API
- **Hosting System**: Manual review and provisioning workflow (zero Stripe dependencies)

## Getting Started

1. Copy `.env.example` to `.env` and configure your database and environment settings.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run database migrations:
   ```bash
   npm run db:migrate
   ```
4. Seed essential system data:
   ```bash
   npm run db:seed
   ```
5. Start development server:
   ```bash
   npm run dev
   ```

## Testing

Run test suite:
```bash
npm test
```