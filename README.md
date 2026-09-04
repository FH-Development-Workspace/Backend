# FH Developments Backend

## Local setup

1. Copy `.env.example` to `.env` and provide local PostgreSQL and JWT values.
2. Install dependencies with `npm ci`.
3. Generate Prisma Client with `npm run db:generate`.
4. Apply the development schema with `npm run db:push`.
5. Seed plans and baseline content with `npm run db:seed`.
6. Start the API with `npm run dev`.

The API is served under `/api/v1`. Health checks are available at `/health` and system status at `/api/v1/system/status`.

## Tests and CI

Run `npm test`. GitHub Actions validates the Prisma schema, creates a disposable PostgreSQL database, applies the schema, and runs the test suite on pull requests and pushes to `main`.

## Deployment

Render uses `render.yaml`, runs Prisma generation during build, applies the production schema before deploy, and starts `npm start`. Configure all `sync: false` variables in Render. `RENDER_DEPLOY_HOOK` is only needed when using the optional deploy workflow.

Stripe must be configured with the three hosting Payment Links and a webhook endpoint at:

`https://api.fh-development.xyz/api/v1/webhooks/stripe`

Use the `checkout.session.completed` event. The webhook signature is verified server-side and duplicate event IDs are ignored.