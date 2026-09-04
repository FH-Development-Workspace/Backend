# Database Setup

The backend uses PostgreSQL through Prisma. The current Neon connection string includes `&channel_binding=require`; quote both `DATABASE_URL` and `DIRECT_URL` in any shell or deployment configuration that parses environment assignments.

For a fresh or additive development schema:

```text
npx prisma validate
npx prisma generate
npx prisma db push --skip-generate
npm run db:seed
```

The schema contains users and sessions, products, licenses, support tickets, carts, purchases, blacklist entries, company content, and hosting plans/customers/orders/instances. The seed creates the real hosting plans and does not create fake customers or purchases. Set `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, and optionally `SEED_ADMIN_USERNAME` before seeding an administrator.

For production, prefer a reviewed Prisma migration and run `npm run db:migrate:deploy`; use `db push` only for controlled initial provisioning.