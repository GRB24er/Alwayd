# Web App Backend Routes — Password Reset & Change

These route files complete the mobile app's password flows. **Copy them into
your deployed Alwayd web project** (the Next.js app), matching the paths below,
then deploy the web app.

| File in this folder                       | Destination in web project                         | Purpose                                        |
| ----------------------------------------- | -------------------------------------------------- | ---------------------------------------------- |
| `forgot-password.route.ts`                | `src/app/api/auth/forgot-password/route.ts`        | Step 1: email a 6-digit reset code (public)    |
| `reset-password.route.ts`                 | `src/app/api/auth/reset-password/route.ts`         | Step 2: verify code + set new password (public)|
| `change-password.route.ts`                | `src/app/api/user/change-password/route.ts`        | Replaces existing: now also accepts the mobile JWT (Bearer) in addition to the NextAuth session |

They only use libraries that already exist in the web project:
`@/lib/mongodb`, `@/models/User`, `@/lib/otpService`, `@/lib/rateLimit`,
`@/lib/audit`, `@/lib/authSecret`, `bcryptjs`, `jsonwebtoken`.

## Mobile app endpoints consumed

- `POST /api/auth/forgot-password` — body `{ email }` → `{ success, message }`
  (always succeeds; no account enumeration)
- `POST /api/auth/reset-password` — body `{ email, code, newPassword, confirmPassword }`
- `POST /api/user/change-password` — Bearer token; body
  `{ currentPassword, newPassword, confirmPassword }`

Until the two new routes are deployed, the mobile "Forgot Password" screen
shows a friendly "contact support" message instead of failing.
