# Register Flow: End-to-End Verification

Verified 2026-09-30 by reading the code, running `npm run typecheck` and `npm test` in `backend/`, and running small in-memory checks.

## Verdict: NOT complete

`POST /api/v1/auth/register` creates a user and a Redis session. The flow is not finished, and the tokens it issues would be rejected by the auth middleware. Nothing was exercised against a live Mongo or Redis instance.

## What works (verified by reading the code)

- Route `POST /api/v1/auth/register` is mounted. It runs `registerRateLimiter`, then `validate(registerSchema)`, then `RegisterUserController`.
- Zod validation covers names, email, username, phone (E.164), country and a strong password (max 128 characters). Unknown keys such as `role` and `emailVerified` are stripped, so mass assignment is blocked.
- The password is hashed with argon2id.
- The user model has unique indexes on email, username and phone. A duplicate returns a 409 `DUPLICATE_USER`.
- The response is a DTO, which excludes `passwordHash`. `passwordHash` is `select: false` on the model.
- Redis sessions and JWT signing exist. Access and refresh tokens are signed and a session is created.
- Other pieces exist: `Cache-Control: no-store`, an origin check, and a central error handler.

## Bugs in what exists (fix before calling it done)

1. **Tokens issued at register fail verification.**
   - `utils/session.ts` signs tokens with issuer `eccomerce-ai-api` and audience `ecommerce-ai-client`.
   - `utils/jwt.ts` verifies with issuer `ecommerce-api` and audience `ecommerce-client`.
   - I confirmed this with a check: `jwt audience invalid`.
   - Every `authenticate` call on a freshly registered user would return 401.
   - `session.ts` also duplicates `signAccessToken` and `signRefreshToken` from `jwt.ts`. Keep one copy.
2. **Register never sets the auth cookies.**
   - `auth.controller.ts` returns `{ user, tokens }` as JSON, so both JWTs appear in the response body.
   - The design is httpOnly cookies. `setAuthCookies` exists in `utils/token.ts` and nothing calls it.
   - The controller should call `setAuthCookies` and return only the user.
3. **Typecheck fails.**
   - `utils/jwt.ts:4` and `types/express.d.ts:1` import from `../modules/User/user.model.js`.
   - That folder was renamed to `module/`, and the old `modules/` files show as deleted in git.
4. **`npm test` fails.** Ran it and saw ZodError output from the env tests; I didn't dig into the cause. There are no tests for register, auth, session, verification or the user model.
5. **`verifyEmail` deletes the wrong record.**
   - `verification.service.ts:56` calls `EmailVerification.deleteOne()` with no filter. That deletes an arbitrary user's token.
   - It should be `deleteOne({ userId })`.
6. **Verification tokens are logged and returned.** `sendEmailVerification` logs the full `verificationUrl` and returns it. The URL should go only to the email provider and be removed from logs and API responses.
7. **PII is written to logs on a duplicate registration.** `auth.service.ts:34` logs `keyValue`, which holds the email or phone number.
8. **A duplicate registration returns 409.** That lets an attacker enumerate registered emails and phone numbers. Decide whether that is acceptable. The rate limit helps but doesn't remove it.
9. **Email input with surrounding whitespace is rejected.** `z.email().trim()` fails on `" a@b.com "` because validation runs before the trim. Put `.trim()` before the email check.
10. **A failure after `User.create` leaves an orphan user.** If `startSession` (Redis) fails, the user exists but the client gets a 500. Retrying gives a 409.

## What is left to finish "register"

- [ ] Fix the JWT issuer and audience mismatch, and remove the duplicate signing code (bug 1).
- [ ] Set auth cookies in the register controller and stop returning tokens in the body (bug 2).
- [ ] Fix the broken `modules/` imports so typecheck passes (bug 3).
- [ ] **Send the verification email on register.** `sendEmailVerification` is never called.
- [ ] **Add an email provider** (SMTP, SES, Resend or similar). Today it only logs the URL.
- [ ] **Add routes and controllers:**
  - `POST /auth/verify-email`. `verifyEmailSchema` exists but no route or controller uses it.
  - `POST /auth/resend-verification`, with a rate limiter.
  - Wire `requireVerifiedUser` onto the routes that need it.
- [ ] **Fix `verifyEmail`:** the unfiltered `deleteOne` (bug 5). The route should also use the authenticated user or look the token up by hash alone.
- [ ] **Phone verification is entirely stubbed.**
  - `sendPhoneNumberVerification` and `verifyPhoneNumber` are empty.
  - `requireVerifiedUser` demands `phoneNumberVerified`, so a verified user can never exist.
  - Either implement an SMS/OTP provider, or drop the phone requirement for now.
- [ ] **Decide whether unverified users get a session.** Register issues one immediately.
- [ ] **Add the rest of the auth API that register depends on:**
  - login
  - logout
  - refresh
  - `GET /auth/me`
  - `authenticate` on the routes
  - `loginSchema` and the login and refresh rate limiters exist but are unused.
- [ ] **Add tests:**
  - Register success.
  - Validation failures.
  - Duplicate email, username and phone.
  - Mass-assignment stripping (`role: "admin"`).
  - Cookie flags.
  - Token verifies via `authenticate`.
  - Rate limit.
  - Verification token expiry and reuse.
- [ ] **Harden:**
  - Back the rate limiter with Redis. It is in-memory now, so it resets on restart and isn't shared across instances.
  - Set `trust proxy` if deployed behind a proxy, otherwise all users share one IP.
  - Remove PII from logs (bug 7).
  - Handle a partial failure after `User.create` (bug 10).
  - Reject the disposable-email and phone-reuse cases you care about.
- [ ] **Frontend (`storefront/`):**
  - Register form.
  - Verify-email page at `/verify-email?token=…` (the URL that `sendEmailVerification` builds).
  - Resend button.
  - Error handling for 400, 409 and 429.
  - I did not inspect the storefront; check whether any of this exists.
- [ ] **Housekeeping:** commit the `modules/` → `module/` move. Right now dozens of model files show as deleted, and only the User module was recreated. Restore the other models (Product, Order and so on) under `module/`, or confirm you meant to drop them.
- [ ] **Docs:** update `ROADMAP.md`. It still marks Login/Register as "Missing".
