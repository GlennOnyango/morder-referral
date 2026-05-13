# RefConnect — Project Reference

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

## Commit Convention

This project uses Conventional Commits.

Format:

```text
type(scope): description
```

Examples:

```text
feat(auth): add Auth0 callback handling
fix(playwright): wait for organization redirect
test(e2e): add Gleap widget visibility test
ci(github): cache Playwright browsers
```

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

The app recognizes these roles (`AppRole` in `src/context/authTypes.ts`):

- `SUPER_ADMIN` — platform-level access; can manage all facilities and user-role administration.
- `HOSPITAL_ADMIN` — facility manager; can manage and operate within their assigned facility.
- `HOSPITAL_MEMBER` — facility member; can create referrals but has no management access.
- `SERVICE_ADMIN` — service provider manager; operates within their assigned service organisation.

Role normalization maps:
- `ADMIN` → `HOSPITAL_ADMIN`
- `USER` → `HOSPITAL_MEMBER`

Assignable roles by organisation type:
- Facility organisations: `HOSPITAL_ADMIN`, `HOSPITAL_MEMBER`
- Service organisations: `SERVICE_ADMIN`

Role resolution order: Cognito groups → access token claims (`custom:role`, `role`, `roles`, `cognito:groups`) → ID token claims.

## Workspace System

Every authenticated user operates inside a **workspace**, identified by the `:workspaceId` URL segment (e.g. `/:workspaceId/dashboard`).

- `SUPER_ADMIN` defaults to the special workspace `"system"` which unlocks platform-wide views.
- Facility/service users default to their `facilityId` from the session token.
- Workspace state is persisted to `localStorage` under `refconnect.active.workspace` and `refconnect.active.workspace.details`.

### Impersonation

`SUPER_ADMIN` can impersonate any organisation from the Admin Console. While active:
- `activeWorkspaceId` switches to the target org's ID and the URL updates to `/:orgId/*`.
- An amber banner is shown across the top of every page with a **Stop impersonation** button.
- Impersonation state is stored in `sessionStorage` under `refconnect.impersonation` — it survives page refresh but clears on tab close.
- Only one organisation can be impersonated at a time.
- `stopImpersonation()` restores the workspace to `"system"` and navigates back to `/system/admin`.

## Route Structure

Routes are defined in `src/LocalRoutes.tsx`. The workspace layout is `/:workspaceId/*` served by `src/routes/WorkspaceLayout.tsx`.

| Path | Page | Access |
|------|------|--------|
| `/` | HomePage | Public |
| `/signin` | SignInPage | Public |
| `/signup` | SignUpPage | Public |
| `/confirm-signup` | ConfirmSignUpPage | Public |
| `/reset-password` | ResetPasswordPage | Public |
| `/invite/:inviteId` | AcceptInvitePage | Public |
| `/:workspaceId/dashboard` | DashboardPage | Any authenticated user |
| `/:workspaceId/referrals` | ReferralsPage | HOSPITAL_ADMIN, SUPER_ADMIN |
| `/:workspaceId/services` | OrganizationServicesPage | HOSPITAL_ADMIN, SERVICE_ADMIN, SUPER_ADMIN |
| `/:workspaceId/facility-services` | FacilityServicesPage | HOSPITAL_ADMIN, SUPER_ADMIN |
| `/:workspaceId/organization` | OrganizationWorkspacePage | HOSPITAL_ADMIN, SUPER_ADMIN |
| `/:workspaceId/organizations` | OrganizationsPage | HOSPITAL_ADMIN, SUPER_ADMIN |
| `/:workspaceId/admin` | AdminPage | SUPER_ADMIN |
| `/:workspaceId/notifications` | NotificationsPage | HOSPITAL_ADMIN, SUPER_ADMIN |
| `/:workspaceId/settings` | SettingsPage | HOSPITAL_ADMIN, SUPER_ADMIN |

### Sidebar nav visibility

When `workspaceId === "system"` (SUPER_ADMIN in system workspace, not impersonating), the following nav items are hidden:
- Referrals
- Services
- Facility Service
- Organization

They reappear automatically when the workspace switches to a real org ID (e.g. during impersonation).

## Source Layout

```
src/
├── App.tsx                   # Root layout (AppSidebar + ImpersonationBanner + LocalRoutes)
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
│   ├── AuthContext.tsx       # AuthProvider — session, workspace, impersonation state
│   ├── authTypes.ts          # AuthSession, AuthContextValue, AppRole
│   ├── authContextValue.ts   # Creates the React context object
│   ├── useAuthContext.ts     # Hook to consume AuthContext
│   ├── authClaims.ts         # JWT claim extraction helpers
│   ├── authRole.ts           # Role normalisation and resolution
│   ├── authSession.ts        # Builds AuthSession from tokens + API calls
│   └── authStorage.ts        # localStorage read/write for session persistence
├── routes/
│   ├── ProtectedRoute.tsx    # Role-gating wrapper; redirects unauthenticated or unauthorized users
│   └── WorkspaceLayout.tsx   # Provides WorkspaceContext from :workspaceId URL param
├── components/
│   ├── AppSidebar.tsx        # Sidebar with role/workspace-aware nav
│   ├── ImpersonationBanner.tsx # Amber top banner shown during impersonation
│   ├── Breadcrumbs.tsx
│   └── ui/                   # shadcn/ui primitives (Button, Card, Input, Dialog, etc.)
├── pages/
│   ├── public/               # HomePage, HowItWorksPage, AboutPage
│   ├── auth/                 # SignInPage, SignUpPage, ConfirmSignUpPage, ResetPasswordPage
│   ├── dashboard/            # DashboardPage
│   ├── admin/                # AdminPage (org table, create facility/service dialogs)
│   ├── facilities/           # Organization & service management pages
│   ├── referrals/            # Referral creation, pool, facility referral pages
│   ├── notifications/
│   └── settings/
├── schemas/
│   ├── auth.ts               # Zod schemas: signIn, signUp, reset, confirm
│   ├── organization.ts       # Zod schema: organization create/edit form
│   ├── referral.ts           # Zod schema: referral creation form
│   └── service.ts            # Zod schema: service create/edit form
├── types/
│   ├── api.generated.ts      # Generated from swagger-doc.json (organizations API)
│   ├── organizations.generated.ts
│   └── referrals.generated.ts # Generated from referrals API swagger
└── lib/
    └── utils.ts              # cn() — clsx + tailwind-merge helper
```

## Session & Storage

| Key | Storage | Purpose |
|-----|---------|---------|
| `refconnect.auth.session` | localStorage | Persisted auth session (tokens, roles) |
| `refconnect.active.workspace` | localStorage | Active workspace ID |
| `refconnect.active.workspace.details` | localStorage | Active workspace org object |
| `refconnect.impersonation` | sessionStorage | Impersonated org (clears on tab close) |

## Conventions

### File Naming

- Use **PascalCase** for page/route/component files in `src/pages/`, `src/components/`, and `src/routes/`.
- Use **camelCase** or lowercase for non-component files (`src/api/httpClient.ts`, `src/authEvents.ts`).
- Keep new files consistent with neighboring files in the same folder.

### Components and Exports

- **One component per file** — every React component must live in its own file, named after the component (e.g. `HistoryTimeline.tsx` for `HistoryTimeline`). Never define multiple exported components in the same file.
- Component/page modules use **default exports**.
- Shared helpers, API functions, and types use **named exports**.
- When a page grows to include sub-components, extract them into sibling files in the same directory and import them into the page.

### UI Components

- Prefer **shadcn/ui** components from `src/components/ui/` (`Button`, `Input`, `Select`, `Dialog`, etc.) over raw HTML controls.
- Prefer Tailwind utility classes for layout/spacing; avoid new plain CSS rules unless strictly necessary.

### TypeScript

- Prefer explicit types on public helpers and API boundaries.
- Avoid `any`; prefer `unknown` with narrowing.
- Do not edit generated types manually.

### Forms

- Use **react-hook-form** for any form with validation logic, multiple fields, or submission handling.
- Pair with **Zod** schemas from `src/schemas/` via `zodResolver`.

### Routing and Access Control

- Add or update routes in `src/LocalRoutes.tsx`.
- Protected pages must wrap with `src/routes/ProtectedRoute.tsx`.
- Role-gated views pass `allowedRoles` to `ProtectedRoute`.

### API Layer

- Keep network calls inside `src/api/`.
- Reuse `createApiClient` from `src/api/httpClient.ts` for all authenticated clients.
- Keep request/response typing aligned with generated types in `src/types/`.

### Auth and Session

- Use `AuthProvider` and `useAuthContext()` for authentication/session state.
- Do not duplicate auth/session state in unrelated contexts.
- Listen for `AUTH_REFRESHED_EVENT` and `AUTH_REQUIRED_EVENT` from `src/authEvents.ts`.

### Generated Files

- `src/types/*.generated.ts` are generated by `swagger-typescript-api`.
- Regenerate via pnpm scripts when the backend schema changes; do not hand-edit them.

### Config Files

- Do **not** modify `vite.config.ts`, `tsconfig*.json`, or `eslint.config.js` without explicit user approval.

## What to Avoid

- Do not use `npm` or `yarn`; use `pnpm` only.
- Do not bypass TypeScript errors with `@ts-ignore`/`@ts-expect-error` without a clear reason.
- Do not hardcode API shape assumptions when generated types already cover the contract.
- Do not edit files under `src/types/*.generated.ts`.
- Do not introduce large architectural changes without user confirmation.
- Do not add routes in `src/App.tsx`; all routes belong in `src/LocalRoutes.tsx`.

## Core Principle — Accuracy over Agreement

Do not default to agreeing with the user. Prioritize accuracy over agreement. If the user's statement is incorrect, misleading, or incomplete, challenge it and explain why. Always verify claims and correct the user when necessary.
