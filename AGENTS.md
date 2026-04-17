# Agents

General instructions for AI coding agents working in this repository.

## Project Overview

React + Vite single-page application written in TypeScript. The app is named **RefConnect** and focuses on healthcare referral workflows across Kenyan public and private facilities. It supports AWS Cognito authentication and integrates with three backend APIs: organizations, referrals, and auth administration.

## Stack

| Concern         | Tool / Library |
| --------------- | -------------- |
| Framework       | React 19 + Vite 8 |
| Routing         | React Router DOM v7 |
| Language        | TypeScript + TSX |
| Data Fetching   | TanStack React Query v5 |
| HTTP Client     | Axios |
| Authentication  | AWS Amplify (Cognito) + custom auth helpers |
| Styling         | Tailwind CSS v4 + shadcn/ui |
| Form Handling   | react-hook-form |
| Validation      | Zod |
| Icons           | lucide-react, @untitledui/icons-react |
| Linting         | ESLint 9 (flat config via `eslint.config.js`) |
| Package Manager | pnpm |

## Commands

```bash
pnpm dev                    # start dev server
pnpm build                  # type-check + production build
pnpm lint                   # run ESLint
pnpm preview                # preview production build
pnpm start                  # serve built app from dist
pnpm generate:types         # generate src/types/api.generated.ts from local swagger-doc.json
pnpm generate:referral:types # generate src/types/referrals.generated.ts from remote referrals swagger
```

> Always run `pnpm build` after non-trivial changes to confirm the project still compiles.

## Environment Variables

The app reads several `VITE_` variables from environment files/runtime:

**Cognito / Auth**
- `VITE_COGNITO_USER_POOL_ID`
- `VITE_COGNITO_CLIENT_ID`
- `VITE_COGNITO_AUTH_URL`
- `VITE_COGNITO_AuthFlow`
- `VITE_COGNITO_SESSION`

**API Base URLs**
- `VITE_ORGANIZATIONS_API_BASE_URL`
- `VITE_REFERRALS_API_BASE_URL`
- `VITE_AUTHENTICATION_API_BASE_URL`

**Auth Admin Paths** (appended to `VITE_AUTHENTICATION_API_BASE_URL`)
- `VITE_AUTH_ATTACH_ROLE_PATH`
- `VITE_AUTH_FACILITY_USERS_PATH`
- `VITE_AUTH_ENABLE_USER_PATH`
- `VITE_AUTH_DISABLE_USER_PATH`
- `VITE_AUTH_DELETE_USER_PATH`

All API base URLs and auth paths have production fallback defaults in the API modules; the env vars override them.

## App Roles

The app recognizes these roles (`AppRole` in `src/context/AuthContext.tsx`):

- `SUPER_ADMIN` — platform-level access; can manage all facilities and user-role administration.
- `HOSPITAL_ADMIN` — facility manager; can manage and operate within their assigned facility.
- `DOCTOR` — clinical role; limited direct management access in protected routes.
- `NURSE` — clinical role; limited direct management access in protected routes.

Role normalization maps:
- `ADMIN` → `HOSPITAL_ADMIN`
- `USER` → `NURSE`

Role resolution order: Cognito groups → access token claims (`custom:role`, `role`, `roles`, `cognito:groups`) → ID token claims.

## Route Structure

Routes are defined in `src/LocalRoutes.tsx`. `src/App.tsx` only renders the `<Header>` and `<LocalRoutes>`.

| Path | Page | Access |
|------|------|--------|
| `/` | HomePage | Public |
| `/how-it-works` | HowItWorksPage | Public |
| `/about` | AboutPage | Public |
| `/signin` | SignInPage | Public |
| `/signup` | SignUpPage | Public |
| `/confirm-signup` | ConfirmSignUpPage | Public |
| `/reset-password` | ResetPasswordPage | Public |
| `/dashboard` | DashboardPage | Any authenticated user |
| `/settings` | SettingsPage | HOSPITAL_ADMIN, SUPER_ADMIN |
| `/facilities` | OrganizationsPage | HOSPITAL_ADMIN, SUPER_ADMIN |
| `/facilities/new` | OrganizationFormPage | SUPER_ADMIN |
| `/facilities/:id/edit` | OrganizationFormPage | SUPER_ADMIN |
| `/facilities/:id` | OrganizationWorkspacePage | HOSPITAL_ADMIN, SUPER_ADMIN |
| `/facilities/:id/services` | OrganizationServicesPage | HOSPITAL_ADMIN, SUPER_ADMIN |
| `/facilities/:id/services/create` | OrganizationServiceFormPage | HOSPITAL_ADMIN, SUPER_ADMIN |
| `/facilities/:id/services/:serviceId/edit` | OrganizationServiceFormPage | HOSPITAL_ADMIN, SUPER_ADMIN |
| `/facilities/:id/users` | OrganizationUsersPage | HOSPITAL_ADMIN, SUPER_ADMIN |
| `/facilities/:id/referrals` | OrganizationReferralsPage | HOSPITAL_ADMIN, SUPER_ADMIN |
| `/facilities/:id/referrals/create` | OrganizationCreateReferralPage | HOSPITAL_ADMIN, SUPER_ADMIN |
| `/facilities/:id/referrals/pool/:referralCode` | OrganizationPoolReferralDetailPage | HOSPITAL_ADMIN, SUPER_ADMIN |
| `/facilities/:id/referrals/facility` | OrganizationFacilityReferralsPage | HOSPITAL_ADMIN, SUPER_ADMIN |
| `/users` | redirects to `/facilities` | HOSPITAL_ADMIN, SUPER_ADMIN |
| `*` | redirects to `/` | — |

## Source Layout

```
src/
├── App.tsx                   # Root layout (Header + LocalRoutes)
├── LocalRoutes.tsx           # All route definitions
├── auth.ts                   # AWS Amplify wrappers (signIn, signUp, tokens, etc.)
├── authEvents.ts             # Custom DOM events: refconnect:auth-refreshed / refconnect:auth-required
├── api/
│   ├── httpClient.ts         # createApiClient() — Axios instance with token refresh interceptor
│   ├── organizations.ts      # CRUD for organizations/facilities
│   ├── services.ts           # CRUD for facility services
│   ├── referrals.ts          # Referral lifecycle: create, accept, pool, history, notifications, AI stream
│   ├── metrics.ts            # Dashboard metrics aggregated from organizations + services
│   └── authAdmin.ts          # Cognito user management: list, attach role, enable/disable, delete
├── context/
│   └── AuthContext.tsx       # AuthProvider, useAuthContext(), AppRole, AuthSession
├── routes/
│   └── ProtectedRoute.tsx    # Role-gating wrapper; redirects unauthenticated or unauthorized users
├── components/
│   ├── Header.tsx
│   ├── Breadcrumbs.tsx
│   ├── NotificationsMenu.tsx
│   ├── UserMenu.tsx
│   ├── DialogPortal.tsx
│   └── ui/                   # shadcn/ui primitives (Button, Card, Input, Dialog, etc.)
├── pages/
│   ├── public/               # HomePage, HowItWorksPage, AboutPage
│   ├── auth/                 # SignInPage, SignUpPage, ConfirmSignUpPage, ResetPasswordPage
│   ├── dashboard/            # DashboardPage, UserRolesPage
│   ├── facilities/           # Organization & service management pages
│   ├── referrals/            # Referral creation, pool, facility referral pages
│   └── settings/
│       ├── SettingsPage.tsx
│       ├── types.ts          # SettingsState, PermissionKey, panel types
│       ├── utils.ts          # readStoredSettings, defaultSettings, inferDefaultGroup
│       └── components/       # ProfilePanel, PermissionsPanel, WorkflowPanel, StaffPanel
├── schemas/
│   ├── auth.ts               # Zod schemas: signIn, signUp, reset, confirm
│   ├── organization.ts       # Zod schema: organization create/edit form
│   ├── referral.ts           # Zod schema: referral creation form
│   └── service.ts            # Zod schema: service create/edit form
├── content/
│   └── marketingContent.ts   # Static copy for public-facing pages
├── types/
│   ├── api.generated.ts      # Generated from swagger-doc.json (organizations API)
│   └── referrals.generated.ts # Generated from referrals API swagger
├── utils/
│   └── facilityAccess.ts     # isFacilityManager, canManageFacilityCatalog, canAccessOrganization
└── lib/
    └── utils.ts              # cn() — clsx + tailwind-merge helper
```

## Session & Storage

- Session tokens are persisted to `localStorage` under the key `refconnect.auth.session`.
- Settings (permissions matrix, workflow toggles, AI flags) are persisted under `refconnect.settings.v1`.
- Both are read on mount; writes happen on every state change.

## Settings Page Panels

`/settings` (HOSPITAL_ADMIN, SUPER_ADMIN only) is divided into four panels:

| Panel | Purpose |
|-------|---------|
| **Profile** | User details from session |
| **Permissions** | Per-role permission matrix (`createReferrals`, `approveReferrals`, `directReferrals`, `manageStaff`, `manageSettings`, `aiSearch`, `aiReview`) |
| **Workflow & AI** | `requireApprovalAfterCreation`, `allowDirectReferrals`, AI feature toggles |
| **Staff** | List, enable/disable, assign roles, and delete facility users via the auth admin API |

## Conventions

### File Naming

- Use **PascalCase** for page/route/component files in `src/pages/`, `src/components/`, and `src/routes/`.
- Use **camelCase** or lowercase for non-component files (`src/api/httpClient.ts`, `src/authEvents.ts`, `src/utils/facilityAccess.ts`).
- Keep new files consistent with neighboring files in the same folder.

### Components and Exports

- Keep one component/page per file.
- Component/page modules generally use **default exports**.
- Shared helpers, API functions, and types use **named exports**.

### UI Components

- Prefer using **shadcn/ui** components from `src/components/ui/` (e.g. `Button`, `Input`, `Select`, `Dialog`, `DropdownMenu`, `Tabs`, `Card`) instead of building raw HTML controls from scratch.
- When adding new actions/CTAs, default to shadcn `Button` variants before introducing custom button markup.
- Prefer Tailwind utility classes in JSX for layout/spacing/visual styling; avoid adding new plain CSS rules unless strictly necessary.

### TypeScript

- Prefer explicit types on public helpers and API boundaries.
- Avoid `any` unless unavoidable; prefer `unknown` with narrowing.
- Do not edit generated types manually.

### Functions

- Use **arrow functions** for all components, hooks, handlers, and utilities.
- Component files use the `.tsx` extension; non-JSX TypeScript files use `.ts`.

### Forms

- Use **react-hook-form** for any form with validation logic, multiple fields, or submission handling.
- Pair with **Zod** schemas from `src/schemas/` for validation via `zodResolver`.
- Keep form state inside react-hook-form — do not mirror it into component state or a context.

### Routing and Access Control

- Add or update routes in `src/LocalRoutes.tsx`.
- Protected pages must use `src/routes/ProtectedRoute.tsx`.
- Role-gated views pass `allowedRoles` to `ProtectedRoute`; do not scatter ad hoc role checks across multiple files.
- Unauthenticated users hitting a protected route are redirected to `/signin`; wrong-role users are redirected to `fallbackPath` (defaults to `/dashboard`).

### API Layer

- Keep network calls inside `src/api/`.
- Reuse `createApiClient` from `src/api/httpClient.ts` for all authenticated API clients; it handles token refresh and `AUTH_REQUIRED` dispatch automatically.
- Keep request/response typing aligned with generated types in `src/types/`.

### Auth and Session

- Use `AuthProvider` and `useAuthContext()` for authentication/session state.
- Do not duplicate auth/session state in unrelated contexts.
- Listen for `AUTH_REFRESHED_EVENT` and `AUTH_REQUIRED_EVENT` from `src/authEvents.ts` rather than polling tokens directly.

### Generated Files

- `src/types/api.generated.ts` and `src/types/referrals.generated.ts` are generated by `swagger-typescript-api`.
- Regenerate via pnpm scripts when the backend schema changes; do not hand-edit generated files.

### Config Files

- Do **not** modify `vite.config.ts`, `tsconfig*.json`, or `eslint.config.js` without explicit user approval.
- If a task appears to require config edits, pause and ask first.

## Core Principle — Accuracy over Agreement

Do not default to agreeing with the user. Prioritize accuracy over agreement.
If the user's statement is incorrect, misleading, or incomplete, challenge it and explain why using data, research, and logical reasoning.
Always verify claims, provide evidence-based responses, and correct the user when necessary.
The goal is to arrive at the most accurate conclusion, not to validate opinions.

## What to Avoid

- Do not use `npm` or `yarn`; use `pnpm` only.
- Do not bypass TypeScript errors with `@ts-ignore`/`@ts-expect-error` without a clear reason.
- Do not hardcode API shape assumptions when generated types already cover the contract.
- Do not edit generated files under `src/types/*.generated.ts`.
- Do not introduce large architectural changes (state management, routing style, auth flow) without user confirmation.
- Do not add routes in `src/App.tsx`; all routes belong in `src/LocalRoutes.tsx`.
