# SECURITY AUDIT — Viewora

**Generated:** 2026-02-28
**Severity Scale:** CRITICAL / HIGH / MEDIUM / LOW / INFO

---

## EXECUTIVE SUMMARY

The current codebase is a marketing site with minimal attack surface. However, several security issues require immediate attention before the product is built or the codebase is made public. The most critical issue is a **committed Supabase credential file** that is currently in version control.

---

## CRITICAL SEVERITY

### SEC-001 — Supabase Credentials Committed to Git Repository
**File:** `.env.backup`
**Severity:** CRITICAL
**Status:** ACTIVE — Must be rotated immediately

The file `.env.backup` contains real, active Supabase credentials:
```
SUPABASE_URL="https://tpfxwybnywojwqjxtvcr.supabase.co"
SUPABASE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

While the `.gitignore` correctly lists `*.backup` to prevent backup files from being committed, **this file has already been committed** (the `.gitignore` rule does not retroactively remove files from the git history). Anyone with access to this repository's git history can extract these credentials.

**The `SUPABASE_KEY` here is the public anon key**, which is normally safe to expose in client-side code. However:
1. Its exposure combined with the explicit project URL allows direct API calls to Supabase bypassing the application layer
2. If Supabase RLS (Row Level Security) is not properly configured, this is a data exposure risk
3. If this is the service role key (not just anon), this is an extremely critical breach

**Immediate Actions Required:**
1. Rotate the Supabase anon key in the Supabase dashboard (Project Settings → API → Regenerate)
2. Remove `.env.backup` from git history: `git filter-branch` or `git filter-repo`
3. If the key was a service role key, rotate ALL keys and audit access logs immediately
4. Verify `.gitignore` now properly covers all variants

---

## HIGH SEVERITY

### SEC-002 — No Row Level Security (RLS) Verification
**Severity:** HIGH
**Status:** Unknown — policies not visible in codebase

The TypeScript database schema defines 4 tables (profiles, properties, virtual_tours, subscriptions) but no RLS policies are defined in this codebase. If RLS is disabled on these tables in the Supabase dashboard:
- Any authenticated user can read ALL other users' profiles, properties, and tours
- Any authenticated user can read ALL subscription data (billing information)
- The anon key (committed in .env.backup) allows unauthenticated access to all data

**Required:** Audit Supabase dashboard to confirm RLS is enabled on all tables with proper policies:
```sql
-- Example required policies
CREATE POLICY "Users can only see own profile" ON profiles
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users can only see own properties" ON properties
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only see own tours" ON virtual_tours
  FOR ALL USING (
    property_id IN (SELECT id FROM properties WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can only see own subscriptions" ON subscriptions
  FOR ALL USING (auth.uid() = user_id);
```

### SEC-003 — No Subscription Enforcement at Data Level
**Severity:** HIGH
**Status:** Not implemented

There is no enforcement of subscription plan limits anywhere in the codebase. If the product were built today:
- A user on the Basic plan (2 tours) could create unlimited tours
- A user with an expired/cancelled subscription retains all features
- Tour limits, storage limits, and feature flags are only shown in the UI (pricing page) and not enforced by any backend logic

**Risk at scale:** Free tier abuse, plan downgrade attacks, storage exhaustion.

### SEC-004 — Contact Form Has No Backend — Prone to Data Loss
**Severity:** HIGH (Business Risk)
**File:** `pages/contact.vue:105`

The contact form submit handler:
```js
const submitForm = () => {
  alert('Thank you for contacting us. We will get back to you shortly.');
};
```

The form data is **never sent anywhere**. Users who fill out the contact form and receive the confirmation message believe their message was sent. It was not. This creates both a trust/UX problem and a legal risk (privacy policy states how contact data is handled).

### SEC-005 — Google Analytics Tracking ID is Placeholder in Production Code
**Severity:** HIGH (Legal/Privacy)
**File:** `app.vue:39-49`

```js
src: 'https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX'
```

The Google Analytics GTM script with a placeholder ID (`G-XXXXXXXXXX`) is loaded on every page. This:
1. Makes an unnecessary external HTTP request to Google's servers on every page load
2. May violate GDPR/PECR if no cookie consent mechanism is present
3. Sends page view events to... nowhere (invalid ID), wasting bandwidth

**Fix:** Either replace with a real tracking ID and add cookie consent, or remove the script entirely until ready.

---

## MEDIUM SEVERITY

### SEC-006 — Password Reset Not Implemented
**Severity:** MEDIUM
**File:** `pages/login.vue:21`

The "Forgot Password?" link points to `#`:
```html
<NuxtLink to="#" class="auth-link text-sm text-primary">(Forgot Password?)</NuxtLink>
```

Users who forget their password have no recovery path. This forces account abandonment.

### SEC-007 — No CSRF Protection on Auth Forms
**Severity:** MEDIUM

While Supabase's SDK provides some inherent protection, there are no explicit CSRF tokens on the login/register forms. For a static site deployed to GitHub Pages, this is lower risk since there are no server endpoints to protect, but should be addressed before moving to SSR.

### SEC-008 — No Rate Limiting on Auth Attempts
**Severity:** MEDIUM

The login form has no client-side rate limiting. While Supabase itself has some rate limiting on auth endpoints, the UI provides no indication of this and no lockout UX. Brute force attempts will silently fail without feedback to the legitimate user.

### SEC-009 — Inline Script in app.vue Without CSP Header
**Severity:** MEDIUM
**File:** `app.vue:43-49`

`innerHTML` is used to inject GA initialization script:
```js
{ innerHTML: `window.dataLayer = ...` }
```

This is an inline script that requires `unsafe-inline` in Content Security Policy. Since this is deployed to GitHub Pages, CSP headers cannot be set anyway, but this pattern should be avoided in the SSR version.

### SEC-010 — "Remember Me" Checkbox is Non-Functional
**Severity:** MEDIUM (UX/Trust)
**File:** `pages/login.vue:26-29`

The "Remember me for 30 days" checkbox has no bound value and no handler. It does nothing. Users who expect their session to persist for 30 days will be confused when they are logged out.

---

## LOW SEVERITY

### SEC-011 — URL Inconsistency Across Codebase
**Severity:** LOW
**Files:** `nuxt.config.ts`, `app.vue`

- `nuxt.config.ts` site.url: `https://viewora.software`
- `app.vue` ogUrl: `https://viewora.com`
- Blog post links to: `https://viewora.com`

Inconsistent canonical URL causes SEO fragmentation and potential open redirect confusion.

### SEC-012 — Terms of Service Last Updated October 2023
**Severity:** LOW (Legal)
**Files:** `pages/legal/terms.vue`, `pages/legal/privacy.vue`

Legal documents are dated "Last Updated: October 2023" — over 2 years old. Privacy and data handling practices likely changed. These must be reviewed by legal counsel before the product launches.

### SEC-013 — Blog Cover Image from Unsplash with External CDN Link
**Severity:** LOW (Privacy)
**File:** `content/blog/how-virtual-tours-increase-airbnb-bookings.md:7`

```
image: https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80
```

When this image loads, Unsplash's CDN sees user IP addresses. This may violate GDPR if users are not informed about third-party image processing. Images should be self-hosted or privacy policy updated.

### SEC-014 — Developer Personal Email Exposed in Contact Page
**Severity:** LOW (Privacy)
**File:** `pages/contact.vue:36`

```html
<a href="mailto:peterbjorogeirungu76@gmail.com">
```

A personal Gmail address is exposed as the company support email. This is a privacy risk for the developer and unprofessional. Should be replaced with a `support@viewora.com` or similar business email.

### SEC-015 — Phone Number Exposed in Public Contact Page
**Severity:** LOW (Privacy)
**File:** `pages/contact.vue:23`

```html
<a href="tel:+254117537025">+254 117 537 025</a>
```

A real phone number is hardcoded in public source code. While intended, this should be managed via environment variable or CMS to allow updates without code deploys.

---

## INFO / OBSERVATIONS

### SEC-016 — `failOnError: false` in Nitro Prerender
**File:** `nuxt.config.ts:49`

```ts
nitro: {
  prerender: {
    failOnError: false
  }
}
```

This silently swallows prerender errors. A broken page would still deploy successfully to production. Remove this after the initial site is stable.

### SEC-017 — Google Search Console Verification Placeholder
**File:** `app.vue:32`

```js
{ name: 'google-site-verification', content: 'YOUR_GOOGLE_SEARCH_CONSOLE_CODE_HERE' }
```

A literal placeholder string is being served in the HTML meta tags to every visitor. Replace with the actual verification code or remove entirely.

### SEC-018 — OG Image Placeholder
**File:** `app.vue:19`

```js
ogImage: '/og-image.jpg' // Placeholder
```

The file `/og-image.jpg` does not exist in the `public/` directory. Every social share will show a broken image.

### SEC-019 — Viewora Logo Placeholder in Schema.org
**File:** `app.vue:90`

```js
logo: '/images/viewora-logo.png' // Placeholder
```

This image does not exist. Schema.org structured data for the Organization is pointing to a 404.

---

## SECURITY CHECKLIST BEFORE PRODUCT LAUNCH

- [ ] **CRITICAL**: Rotate Supabase credentials (SEC-001)
- [ ] **CRITICAL**: Remove .env.backup from git history
- [ ] **HIGH**: Enable and verify RLS on all Supabase tables (SEC-002)
- [ ] **HIGH**: Implement subscription enforcement logic (SEC-003)
- [ ] **HIGH**: Connect contact form to a real email backend (SEC-004)
- [ ] **HIGH**: Replace or remove placeholder Google Analytics (SEC-005)
- [ ] **MEDIUM**: Implement password reset flow (SEC-006)
- [ ] **MEDIUM**: Implement "Remember me" functionality (SEC-010)
- [ ] Fix URL inconsistency across codebase (SEC-011)
- [ ] Update legal documents (SEC-012)
- [ ] Replace personal email with business email (SEC-014)
- [ ] Create and add real OG image (SEC-018)
- [ ] Create and add Viewora logo image (SEC-019)
