# BillingPro Deployment

This app is a Next.js full-stack app. For the requested split:

- Neon hosts PostgreSQL.
- Render hosts the API backend by running this same Next.js app.
- Vercel hosts the frontend and proxies `/api/*` to Render.

## 1. Neon database

Create a Neon project and database, then copy the pooled connection string.

Use the pooled connection string for production, usually shaped like:

```env
DATABASE_URL=postgresql://user:password@ep-xxx-pooler.region.aws.neon.tech/dbname?sslmode=require
DB_SSL=true
```

If you already have local data, export/import it:

```powershell
pg_dump -h localhost -U postgres -d billingpro -Fc -f billingpro.dump
pg_restore --clean --if-exists --no-owner --no-privileges -d "NEON_DATABASE_URL" billingpro.dump
```

## 2. Render backend

Create a new Render Web Service from the repo.

Settings:

- Root directory: `billing-software`
- Build command: `npm install && npm run build`
- Start command: `npm run start`
- Health check path: `/api/health`

Environment variables:

```env
NODE_ENV=production
DATABASE_URL=NEON_POOLED_DATABASE_URL
DB_SSL=true
PG_POOL_MAX=5
PG_IDLE_TIMEOUT_MS=10000
PG_CONNECT_TIMEOUT_MS=10000
JWT_SECRET=GENERATE_A_LONG_RANDOM_SECRET
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_EXPIRES_IN=30d
SUPER_ADMIN_EMAIL=owner@grocerymart.com
SUPER_ADMIN_PASSWORD=Owner@12345
SUPER_ADMIN_NAME=Super Admin
SUPER_ADMIN_PHONE=super-admin
NEXT_PUBLIC_APP_URL=https://YOUR-VERCEL-DOMAIN
WHATSAPP_ENABLED=false
```

After deploy, check:

```text
https://YOUR-RENDER-SERVICE.onrender.com/api/health
```

## 3. Vercel frontend

Import the same repo into Vercel.

Settings:

- Framework: Next.js
- Root directory: `billing-software`
- Build command: `npm run build`
- Install command: `npm install`

Environment variables:

```env
NODE_ENV=production
BACKEND_URL=https://YOUR-RENDER-SERVICE.onrender.com
NEXT_PUBLIC_APP_URL=https://YOUR-VERCEL-DOMAIN
JWT_SECRET=SAME_SECRET_AS_RENDER
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_EXPIRES_IN=30d
WHATSAPP_ENABLED=false
```

Do not set `NEXT_PUBLIC_BACKEND_URL` on Vercel unless you intentionally want browser-side direct API calls. The app uses `/api/*`; Vercel rewrites those calls to Render through `BACKEND_URL`.

## 4. Client link and login

Give the client the Vercel URL:

```text
https://YOUR-VERCEL-DOMAIN
```

Login with the super-admin email/password configured in Render. If the database was migrated from local, existing users remain. If it is a fresh Neon database, the app will create/use the configured super-admin during auth setup.

## 5. Production notes

- Rotate local secrets before sharing the app.
- Keep `.env.local` out of git.
- Use a strong `JWT_SECRET` on both Render and Vercel.
- Keep Render and Vercel `NEXT_PUBLIC_APP_URL` pointed at the final Vercel domain.
- Neon requires SSL, so keep `DB_SSL=true` or use `sslmode=require` in `DATABASE_URL`.
