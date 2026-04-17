# RefConnect

A healthcare referral management platform for Kenyan facilities. RefConnect enables hospitals and clinics to raise, route, and track patient referrals across facility levels — from community health centres up to county referral hospitals.

## Features

- **Referral workflows** — create, broadcast to a pool, accept, and track referrals with full history
- **Facility management** — register and manage organizations, their services, and staff
- **Role-based access** — four roles (SUPER_ADMIN, HOSPITAL_ADMIN, DOCTOR, NURSE) with per-facility scoping
- **Settings & permissions** — configurable permissions matrix, workflow rules, and AI feature toggles
- **AI assistance** — AI-generated referral summaries streamed from the referrals API
- **Notifications** — in-app notification feed for referral activity

## Tech Stack

| Concern | Tool |
|---------|------|
| Framework | React 19 + Vite 8 |
| Language | TypeScript |
| Routing | React Router DOM v7 |
| Data fetching | TanStack React Query v5 |
| HTTP client | Axios |
| Auth | AWS Amplify (Cognito) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Forms | react-hook-form + Zod |
| Package manager | pnpm |

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm

### Install dependencies

```bash
pnpm install
```

### Configure environment

Create a `.env.local` file in the project root with your environment values:

```env
VITE_COGNITO_USER_POOL_ID=
VITE_COGNITO_CLIENT_ID=
VITE_COGNITO_AUTH_URL=
VITE_COGNITO_AuthFlow=
VITE_COGNITO_SESSION=

VITE_ORGANIZATIONS_API_BASE_URL=
VITE_REFERRALS_API_BASE_URL=
VITE_AUTHENTICATION_API_BASE_URL=

VITE_AUTH_ATTACH_ROLE_PATH=
VITE_AUTH_FACILITY_USERS_PATH=
VITE_AUTH_ENABLE_USER_PATH=
VITE_AUTH_DISABLE_USER_PATH=
VITE_AUTH_DELETE_USER_PATH=
```

All API base URLs and auth paths fall back to production defaults if omitted.

### Run the dev server

```bash
pnpm dev
```

### Build for production

```bash
pnpm build
```

### Preview production build

```bash
pnpm preview
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start local dev server |
| `pnpm build` | Type-check and produce a production build |
| `pnpm lint` | Run ESLint |
| `pnpm preview` | Serve the production build locally |
| `pnpm start` | Serve the built `dist/` folder (for hosting) |
| `pnpm generate:types` | Regenerate `src/types/api.generated.ts` from `swagger-doc.json` |
| `pnpm generate:referral:types` | Regenerate `src/types/referrals.generated.ts` from the referrals API |

## Project Structure

```
src/
├── App.tsx              # Root layout
├── LocalRoutes.tsx      # All route definitions
├── auth.ts              # AWS Amplify auth wrappers
├── authEvents.ts        # Custom DOM events for auth state changes
├── api/                 # API clients (organizations, referrals, services, metrics, auth admin)
├── context/             # AuthContext + AuthProvider
├── routes/              # ProtectedRoute component
├── components/          # Shared UI components + shadcn/ui primitives
├── pages/               # Route-level page components
│   ├── public/          # Marketing pages (home, how it works, about)
│   ├── auth/            # Sign in, sign up, confirm, reset password
│   ├── dashboard/       # Dashboard and user roles management
│   ├── facilities/      # Organization and service management
│   ├── referrals/       # Referral creation, pool, and facility views
│   └── settings/        # Permissions, workflow, staff, and profile settings
├── schemas/             # Zod form validation schemas
├── content/             # Static copy for public pages
├── types/               # Generated API types (do not edit manually)
└── utils/               # Shared helpers (facility access control)
```

## App Roles

| Role | Access |
|------|--------|
| `SUPER_ADMIN` | Full platform access; can create/edit all facilities |
| `HOSPITAL_ADMIN` | Manages their own facility, staff, services, and referrals |
| `DOCTOR` | Clinical access; participates in referral workflows |
| `NURSE` | Clinical access; participates in referral workflows |
