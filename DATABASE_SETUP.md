# Database Setup & Migrations

The FH Developments backend uses native PostgreSQL via the `pg` driver with parameterized SQL queries.

## Connection Configuration

Configure your PostgreSQL database connection in `.env`:
```env
DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"
```

## Running Migrations

Execute all pending SQL migrations:
```bash
npm run db:migrate
```

## Seeding Initial Data

Seed system roles, permissions, hosting plans, and default administrative configurations:
```bash
npm run db:seed
```

## Resetting Development Database

> [!WARNING]
> Database reset will drop all public tables and re-apply all migrations. This command will fail safely in production.
```bash
npm run db:reset
```