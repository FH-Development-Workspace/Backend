# FH Developments Central Backend API Platform

Full-stack production API providing identity, commerce, hosting requests, documentation, support ticketing, and CMS features for FH Developments.

## Architecture & Tech Stack

- **Runtime**: Node.js (>=20.0.0) & Express.js
- **Database**: MySQL (`mysql2` connection pool with parameterized SQL queries)
- **Authentication**: JWT Access & Refresh Tokens, bcrypt password hashing, role-based access control
- **Storage**: Cloudinary & local disk storage abstraction
- **Integrations**: SMTP email, Roblox Vault API (optional)
- **Hosting System**: Manual review and provisioning workflow

## Required Environment Variables

The following environment variables **MUST** be set for production deployment:

### Database (Required)
- `DATABASE_URL` - MySQL connection string (mysql://user:pass@host:port/db)
  OR
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`

### Security (Required)
- `JWT_ACCESS_SECRET` - Strong random secret (32+ characters)
- `JWT_REFRESH_SECRET` - Strong random secret (32+ characters)

### Email (Required for email functionality)
- `SMTP_HOST` - SMTP server hostname
- `SMTP_PORT` - SMTP server port (usually 587)
- `SMTP_USER` - SMTP username
- `SMTP_PASSWORD` - SMTP password

### Storage (Optional - if using Cloudinary)
- `CLOUDINARY_URL` - Cloudinary connection string
- `CLOUDINARY_CLOUD_NAME` - Cloudinary cloud name
- `CLOUDINARY_API_KEY` - Cloudinary API key
- `CLOUDINARY_API_SECRET` - Cloudinary API secret

### Database Seeding (For initial admin user)
- `SEED_ADMIN_EMAIL` - Admin email address
- `SEED_ADMIN_PASSWORD` - Strong admin password
- `SEED_ADMIN_USERNAME` - Admin username (default: admin)

## Getting Started

1. **Copy environment template:**
   ```bash
   cp .env.example .env
   ```

2. **Configure required variables in `.env`:**
   - Set database connection details
   - Generate and set JWT secrets
   - Configure SMTP if email is needed
   - Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD to create initial admin

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Run database migrations:**
   ```bash
   npm run db:migrate
   ```

5. **Seed essential system data:**
   ```bash
   npm run db:seed
   ```
   *Note: This will create roles, permissions, hosting plans, and an admin user if SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are set.*

6. **Start development server:**
   ```bash
   npm run dev
   ```

7. **Start production server:**
   ```bash
   npm start
   ```

## Deployment

### Pterodactyl
1. Set `MAIN_FILE` to `server.js`
2. Set startup command to `node server.js`
3. Configure all required environment variables in the panel
4. Upload files
5. Run migrations manually: `npm run db:migrate`
6. Run seed manually: `npm run db:seed`

### Render
1. Connect repository
2. Configure environment variables in Render dashboard
3. Deploy - migrations run automatically via npm scripts

## API Endpoints

- `GET /health` - Health check
- `GET /api/v1/health` - API health check
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh` - Refresh access token
- `GET /api/v1/auth/me` - Get current user
- `GET /api/v1/products` - List products
- `GET /api/v1/licenses` - List user licenses
- `POST /api/v1/support/tickets` - Create support ticket

## Testing

Run test suite:
```bash
npm test
```

## Security Notes

- Never commit `.env` file to version control
- Always use strong, randomly generated secrets for JWT
- Rotate secrets regularly in production
- Ensure database is not publicly accessible
- Use HTTPS in production
- Keep dependencies updated
