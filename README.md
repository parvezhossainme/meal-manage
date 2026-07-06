# Meal Manage

A comprehensive meal management system for mess/hostel communities built with Next.js, Prisma, and PostgreSQL.

## Tech Stack

- **Framework:** Next.js 16, React 19
- **Database:** PostgreSQL + Prisma 7 ORM
- **Styling:** Tailwind CSS 4, shadcn/ui
- **Charts:** Recharts
- **Icons:** Lucide React
- **Forms:** React Hook Form + Zod
- **Auth:** JWT (bcryptjs)
- **Notifications:** sonner

## Role System

| Role | Permissions |
|------|------------|
| **SUPER_ADMIN** | Full access — manage members, users, roles, sheets, expenses, funds, reports, settings, announcements |
| **MANAGER** | Manage daily operations — meals, bazar, expenses, funds, sheets. Cannot add/edit members, manage users, or change roles |
| **MEMBER** | View-only dashboard, bazar requests, own statement. Cannot modify any data |

## Features

### Authentication & Users
- Login / Logout with JWT
- Role-based route protection (`requireAuth`, `requireAdmin`, `requireSuperAdmin`)
- Password change (own and admin-forced)
- User management (SUPER_ADMIN can create/edit users and assign roles)
- Register new account

### Public Dashboard
- Landing page with full month overview — no login required
- Summary cards: Meal Rate, Total Bazar, Total Expenses, Total Funds, Outstanding Balance
- Member Summary table with per-member breakdown (fund, meals, costs, balance)
- Total Fund by Member bar chart
- Responsive layout with side-by-side sections

### Admin Dashboard
- Top summary cards (meal rate, opening balance, funds, expenses, outstanding)
- Member Summary table with deposits, meals, costs, balance
- Member Meals bar chart
- Member Balance bar chart
- Expenses by Category pie chart

### Member Dashboard
- Personal meal rate, total fund, and current balance overview
- Per-member charts: meals, balance, expenses by category
- Summary table with all members' data

### Monthly Sheets
- Create monthly sheets (month/year label)
- Lock/unlock sheets to prevent edits
- Carry forward opening balances between months
- Auto-calculate balances on carry-forward

### Meal Management
- Daily meal grid with half-month views (Day 1–15, Day 16+)
- Per-member meal entries per day
- Default meal entries configurable per member
- Guest meal tracking (name, host, count)
- Meal rate calculation: `(Main category expenses) / (member meals + guest meals + default meals)`
- `countDefaultMeals` setting controls whether default meals are included in meal rate

### Shopping / Bazar
- Record daily bazar entries with date, purchaser, cost, details
- Top Shopper — member who did bazar the most times
- Largest Purchase amount
- Shopping summary stats (total, average)
- **Bazar Requests** — MEMBERs can submit bazar requests; MANAGER/SUPER_ADMIN approve/reject
- Shopping page with sheet selector

### Funds
- Fund deposits per member (date, amount, payment method, reference, remarks)
- Opening balance carried from previous month
- Per-member fund history
- Fund Transaction Ledger report
- Total Fund by Member chart
- Fund transactions grouped by member on public dashboard

### Expenses
- Expense categories (Main, others)
- Record expenses with category, amount, vendor, receipt, remarks
- Extra costs outside standard categories
- Paid-by-member tracking
- Expense Ledger report
- Expenses by Category breakdown

### Extra Costs
- Track additional costs not covered by bazar/expenses
- Per-person extra cost calculation
- Extra cost summary (total, per person, largest)

### Members
- Add/edit members (name, phone, email) — SUPER_ADMIN only
- Member list with active/inactive status
- Individual member dashboard showing:
  - Monthly statements (opening, meals, costs, deposits, balance)
  - Bazar entries by member
  - Fund transactions history
  - Extra costs summary
- Role-gated actions: MANAGER cannot see edit buttons, SUPER_ADMIN-only actions column

### Reports
- **Member Statement** — individual member balances and cost breakdown
- **Fund Ledger** — detailed fund transaction history
- **Expense Ledger** — detailed expense history by category
- **Guest Report** — guest meal summary and details
- **Carry Forward Report** — opening balances carried between months
- **Yearly Summary** — yearly aggregation and statistics
- Export options: PDF, Excel, CSV, Print

### Settings
- **Users tab** — manage system users (SUPER_ADMIN only can add; MANAGER cannot change roles or passwords of others)
- **Months tab** — create/manage monthly sheets
- **System tab** — system configuration (currency, meal rate settings, etc.)
- Expense category management

### Announcements
- SUPER_ADMIN and MANAGER can create announcements
- Active announcements shown as popup on the public dashboard
- Dismiss with "Don't show again" option

### Notifications
- In-app notification system
- Notifications for bazar request approvals/rejections

### Audit Logs
- Track all user actions (who did what, when)
- Entity-level tracking with old/new value snapshots
- SUPER_ADMIN only

### Daily Notes
- Per-day notes attached to monthly sheets
- Quick reference for daily events

## Project Structure

```
src/
├── actions/         # Server actions (business logic)
│   ├── admin.ts     # Announcements, notifications
│   ├── auth.ts      # Login, password, session
│   ├── bazar-requests.ts
│   ├── calculations.ts  # Dashboard stats
│   ├── expenses.ts
│   ├── extra-costs.ts
│   ├── funds.ts
│   ├── meals.ts     # Meal grid, guest meals, defaults
│   ├── members.ts   # CRUD + member dashboard
│   ├── public.ts    # Public dashboard data
│   ├── reports.ts
│   ├── sheets.ts    # Monthly sheets, carry-forward
│   └── shopping.ts  # Bazar entries, summary
├── app/
│   ├── (auth)/      # Login, Register
│   ├── (dashboard)/ # All protected routes
│   │   ├── announcements/
│   │   ├── audit-logs/
│   │   ├── dashboard/     # Admin + Member dashboards
│   │   ├── extra-costs/
│   │   ├── funds/
│   │   ├── members/       # List + [id] dashboard
│   │   ├── reports/       # 6 report types
│   │   ├── settings/
│   │   ├── sheets/        # Meal grid
│   │   └── shopping/      # Bazar + requests
│   ├── api/         # Logout API
│   ├── layout.tsx
│   ├── page.tsx     # Redirects to PublicDashboard
│   └── PublicDashboard.tsx
├── components/      # Reusable UI + feature components
│   ├── dashboard/   # Summary cards, charts
│   ├── expenses/
│   ├── funds/
│   ├── guests/
│   ├── layout/      # Sidebar, Header
│   ├── meals/       # Meal grid section
│   ├── members/
│   ├── reports/
│   ├── settings/
│   ├── sheets/
│   └── ui/          # shadcn/ui primitives
├── lib/
│   ├── auth.ts      # Auth helpers (requireAuth, requireAdmin, requireSuperAdmin)
│   ├── db.ts        # Prisma client (PrismaPg adapter)
│   └── utils.ts     # formatCurrency, formatDate, etc.
├── schemas/         # Zod validation schemas
├── services/        # Service layer
├── types/           # TypeScript types
└── utils/           # Utility functions
prisma/
├── schema.prisma    # Database schema (22 models)
├── seed.ts          # Seed data
└── config.ts        # Prisma v7 config
```

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database
- npm

### Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env` and configure:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/meal-manage"
   JWT_SECRET="your-secret-key"
   ```
4. Run database migration:
   ```bash
   npx prisma migrate dev
   ```
5. Seed the database:
   ```bash
   npm run seed
   ```
6. Start the dev server:
   ```bash
   npm run dev
   ```

### Scripts

| Command | Description |
|---------|------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production (generates Prisma client + Next.js build) |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run seed` | Seed database with sample data |
| `npx prisma studio` | Open Prisma database browser |

## Environment Variables

| Variable | Description |
|----------|------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret key for JWT token signing |

## Database Models

22 models covering: Users, Members, Monthly Sheets, Meal Entries, Meal Entry Items, Guest Meals, Default Meal Entries, Shopping, Extra Costs, Expenses, Expense Categories, Fund Transactions, Opening Balances, Carry Forward History, Daily Notes, Bazar Requests, Announcements, Notifications, Audit Logs, Settings.

## Deployment

The app is configured for deployment on [Vercel](https://vercel.com). The build command runs `prisma generate` automatically via `postinstall` hook.

```bash
npm run build
```

---

Created by [@parvezhossainme](https://github.com/parvezhossainme)
