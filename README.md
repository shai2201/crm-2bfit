# 2Bfit CRM — Production Deployment Guide

A full-stack fitness CRM built with **Next.js 15**, **Prisma/PostgreSQL**, **NextAuth v5**, **OpenAI**, and **Stripe**.

---

## Tech Stack

| Layer       | Technology                          |
|-------------|-------------------------------------|
| Frontend    | Next.js 15 (App Router), TypeScript |
| Styling     | Tailwind CSS + custom brand tokens  |
| Database    | PostgreSQL via Prisma ORM           |
| Auth        | NextAuth.js v5 (JWT strategy)       |
| AI          | OpenAI GPT-4o-mini (streaming)      |
| Payments    | Stripe Checkout + Webhooks          |
| Charts      | Recharts                            |
| Deployment  | Vercel (frontend + API) + Supabase  |

---

## Prerequisites

- Node.js 20+
- npm / pnpm / yarn
- A [Supabase](https://supabase.com) account (free tier is enough to start)
- A [Stripe](https://stripe.com) account (test mode)
- An [OpenAI](https://platform.openai.com) account

---

## 1. Local Development Setup

```bash
# Clone the repository
git clone <your-repo-url>
cd 2bfit

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local
```

Edit `.env.local` and fill in all the values (see section 3 below).

```bash
# Push the database schema
npm run db:push

# Generate the Prisma client
npm run db:generate

# Start the dev server
npm run dev
```

The app will be running at **http://localhost:3000**.

---

## 2. Supabase Database Setup

### 2.1 Create a Project
1. Go to [supabase.com](https://supabase.com) → New Project
2. Choose a region close to your users (e.g. **eu-central-1** for Israel)
3. Set a strong database password and save it

### 2.2 Get the Connection String
1. Go to **Project Settings → Database**
2. Copy the **Connection string** (URI format)
3. Replace `[YOUR-PASSWORD]` with your actual password
4. Paste it as your `DATABASE_URL` in `.env.local`

> **Important:** Use the **Transaction pooler** URL (port 6543) for serverless environments like Vercel:
> `postgresql://postgres.xxxx:password@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`
> Add `?pgbouncer=true` at the end.

### 2.3 Push the Schema

```bash
npm run db:push
```

This will create all tables (User, Profile, Membership, Session, Booking, ExerciseLog, etc.).

### 2.4 Create the First Admin User

```bash
npm run db:studio
```

In Prisma Studio, create a `User` row with:
- `role`: `ADMIN`
- `passwordHash`: generate with `node -e "const b=require('bcryptjs');console.log(b.hashSync('YourPassword123',12))"`

---

## 3. Environment Variables

Create `.env.local` with these values:

```env
# ── Database ──────────────────────────────────────────────────────────────────
DATABASE_URL="postgresql://postgres.xxx:password@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# ── NextAuth ──────────────────────────────────────────────────────────────────
# Generate with: openssl rand -base64 32
AUTH_SECRET="your-random-secret-here"
NEXTAUTH_URL="http://localhost:3000"
# In production: NEXTAUTH_URL="https://your-domain.vercel.app"

# ── OpenAI ────────────────────────────────────────────────────────────────────
OPENAI_API_KEY="sk-proj-..."

# ── Stripe ────────────────────────────────────────────────────────────────────
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."          # Set after step 5
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."

# ── Demo / Dev ────────────────────────────────────────────────────────────────
# Used as fallback trainee ID before real auth is wired into every page
DEMO_TRAINEE_ID="your-trainee-user-id"
```

---

## 4. Deploy to Vercel

### 4.1 Connect Repository
1. Go to [vercel.com](https://vercel.com) → **New Project**
2. Import your GitHub / GitLab repository
3. Framework: **Next.js** (auto-detected)

### 4.2 Set Environment Variables in Vercel
1. In the Vercel project → **Settings → Environment Variables**
2. Add **all** the variables from section 3
3. For `NEXTAUTH_URL`, set it to your Vercel domain: `https://your-project.vercel.app`
4. For `DATABASE_URL`, use the **Supabase pooler URL** (port 6543 + `?pgbouncer=true`)

### 4.3 Deploy

```bash
git push origin main
```

Vercel will auto-build and deploy. Check the **Deployments** tab for logs.

### 4.4 Run Database Migration on Production

After first deploy, run from your local machine:

```bash
DATABASE_URL="your-production-url" npm run db:push
```

---

## 5. Stripe Webhook Setup

### 5.1 Test (Local)

Install Stripe CLI:
```bash
brew install stripe/stripe-cli/stripe
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Copy the webhook signing secret (`whsec_...`) to `STRIPE_WEBHOOK_SECRET` in `.env.local`.

### 5.2 Production Webhook
1. Go to [stripe.com/webhooks](https://dashboard.stripe.com/webhooks) → **Add endpoint**
2. Endpoint URL: `https://your-domain.vercel.app/api/stripe/webhook`
3. Select events:
   - `checkout.session.completed`
   - `payment_intent.payment_failed`
4. Copy the **Signing secret** → set as `STRIPE_WEBHOOK_SECRET` in Vercel

### 5.3 Link Products to Membership Plans
1. Create a **Product** in the Stripe dashboard
2. Create a **Price** for it
3. Copy the **Price ID** (starts with `price_...`)
4. In the 2Bfit admin: go to **מוצרים ותמחור** and set the `stripePriceId` field

---

## 6. OpenAI Setup

1. Go to [platform.openai.com](https://platform.openai.com/api-keys)
2. Create a new API key
3. Set as `OPENAI_API_KEY` in your environment variables
4. Recommended: set a **usage limit** ($10–$50/month) to avoid surprise bills

The nutrition chat uses **GPT-4o-mini** (cost-efficient). To switch to GPT-4o, edit:
`app/api/nutrition/chat/route.ts` → change `model: "gpt-4o-mini"` to `model: "gpt-4o"`.

---

## 7. Route Architecture

| URL Pattern              | Who can access         | Description                    |
|--------------------------|------------------------|--------------------------------|
| `/login`                 | Anyone                 | Login page                     |
| `/register`              | Anyone                 | Self-service trainee signup     |
| `/dashboard/*`           | ADMIN, COACH           | Admin CRM dashboard             |
| `/portal`                | TRAINEE only           | Trainee personal dashboard      |
| `/dashboard/my-booklet`  | TRAINEE only           | Workout booklet view            |
| `/dashboard/my-nutrition`| TRAINEE only           | AI nutrition chat               |
| `/dashboard/schedule`    | TRAINEE only           | Weekly class schedule           |
| `/api/*`                 | Authenticated (vary)   | REST API endpoints              |
| `/api/stripe/webhook`    | Stripe server only     | Payment webhook                 |

**Middleware** (`middleware.ts`) enforces all role-based redirects automatically.

---

## 8. User Roles

| Role      | Access                                                       |
|-----------|--------------------------------------------------------------|
| `ADMIN`   | Full CRM access, BI dashboard, manage all data              |
| `COACH`   | Client list, workout booklets, sessions they're assigned to |
| `TRAINEE` | Portal, own booklet, nutrition chat, schedule                |

To create a COACH or ADMIN user, create them via `/dashboard/clients/new` and change the role in Prisma Studio.

---

## 9. Post-Deployment Checklist

- [ ] Database schema pushed (`npm run db:push`)
- [ ] First ADMIN user created in Prisma Studio
- [ ] All environment variables set in Vercel
- [ ] Stripe webhook endpoint registered and signing secret saved
- [ ] OpenAI API key set and usage limit configured
- [ ] Test login at `/login` with admin credentials
- [ ] Test trainee registration at `/register`
- [ ] Test Stripe checkout with test card `4242 4242 4242 4242`
- [ ] Verify Stripe webhook received in the Stripe dashboard
- [ ] Test nutrition chat (requires OpenAI key and user profile with firstName)

---

## 10. Available npm Scripts

```bash
npm run dev          # Start local dev server (http://localhost:3000)
npm run build        # Build for production
npm run start        # Start production server locally
npm run lint         # Run ESLint
npm run db:push      # Push Prisma schema to DB (no migration file)
npm run db:generate  # Regenerate Prisma Client after schema changes
npm run db:studio    # Open Prisma Studio (visual DB editor)
```

---

## 11. Project Structure

```
2bfit/
├── app/
│   ├── (auth)/               # Login + Register pages (no sidebar)
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/          # Admin/Coach dashboard (with sidebar)
│   │   ├── page.tsx          # Overview / home
│   │   ├── clients/          # CRM client management
│   │   ├── coaches/
│   │   ├── sessions/         # Class scheduling
│   │   ├── booklets/         # Workout booklet builder
│   │   ├── my-booklet/       # Trainee view
│   │   ├── my-nutrition/     # AI nutrition chat
│   │   ├── analytics/        # BI dashboard
│   │   └── products/
│   ├── portal/               # Trainee personal portal
│   └── api/
│       ├── auth/             # NextAuth + register
│       ├── clients/          # CRUD
│       ├── sessions/         # Sessions + booking
│       ├── booklets/         # Workout booklets
│       ├── exercises/[id]/logs/
│       ├── analytics/        # Progress + BI overview
│       ├── nutrition/        # AI chat + plan
│       └── stripe/           # Checkout + webhook
├── components/
│   ├── ui/                   # Button, Input, Modal, Badge, Table
│   ├── dashboard/            # Sidebar, Header, StatsCard
│   ├── clients/
│   ├── sessions/
│   ├── booklets/             # BookletBuilder, ExerciseCard, ProgressChart
│   ├── nutrition/            # NutritionChat
│   ├── analytics/            # RevenueChart, OccupancyChart, AttendanceTable
│   └── products/             # CheckoutButton
├── lib/
│   ├── prisma.ts             # Singleton Prisma client
│   ├── utils.ts              # cn(), formatDate(), formatPrice()
│   └── booking.ts            # Race-condition-safe booking logic
├── prisma/
│   └── schema.prisma         # Full database schema
├── auth.ts                   # NextAuth v5 configuration
├── middleware.ts             # Route protection + role-based redirects
└── .env.example              # Environment variable template
```

---

## Support

For questions or issues, open a GitHub issue or contact the development team.

Built with ❤️ for 2Bfit fitness studio.
