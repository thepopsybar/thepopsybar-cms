# The Popsy Bar

Next.js 16 (App Router) · TypeScript · Tailwind 4 · Supabase (content + auth + CRM) · Cloudinary (images) · Brevo (inquiry email) · Web Push (VAPID, no third-party service)

## 1. Install and run

```bash
npm install
cp .env.example .env.local      # then fill in the blanks (section 2)
npm run dev                     # http://localhost:3000
npm run lint
npm run build && npm run start
```

The public site works with **no** environment variables: it shows its built-in content and photos. Supabase and Cloudinary are only needed for `/admin`, saved edits and uploads.

## 2. Environment variables

Put these in `.env.local` locally, and in your host's environment settings (e.g. Vercel → Project → Settings → Environment Variables), then redeploy.

| Variable | Public? | Value |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | `https://sapydmabiajxeuudkhmc.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | yes | the publishable key (already in `.env.example`; it is designed to be public) |
| `CLOUDINARY_CLOUD_NAME` | **server only** | copy from the Cloudinary dashboard (see section 4) |
| `CLOUDINARY_API_KEY` | **server only** | `113279465715572` |
| `CLOUDINARY_API_SECRET` | **server only** | your (new, rotated) secret. Never add `NEXT_PUBLIC_` to this |

The Supabase service-role key is used **only** by the server-side inquiry API to save public form submissions into the CRM (section 7). It is never exposed to the browser.
`.env.local` is git-ignored; `.env.example` is committed and contains no secrets.

## 3. Supabase setup (run in this order)

1. **Create the tables, security rules and starter photos.** Supabase Dashboard → SQL Editor → New query → paste all of `supabase/schema.sql` → Run. (Safe to re-run.)
2. **Create your admin login.** Dashboard → Authentication → Users → *Add user → Create new user*. Enter the admin's email and a strong password **you choose** (tick *Auto Confirm User*). Nothing is pre-set by the site.
3. **Make that user an admin.** Open `supabase/make-admin.sql`, replace `REPLACE_WITH_ADMIN_EMAIL` with that email, paste into the SQL Editor and Run. It should return one row.
4. Go to `/admin/login` and sign in.

How access works: only users listed in `public.admins` count as administrators. Row Level Security lets the public **read** content and visible gallery photos, and only admins **write**. Every admin page and server action re-checks this, so a hidden link is not the protection. To add a second admin, repeat steps 2–3. To remove one, `delete from public.admins where user_id = '…'`.

Tables: `admins`, `site_content` (text/link/image edits), `section_settings` (order + visibility), `gallery_images`.

Until the SQL is run the site keeps working from its built-in content, and `/admin` shows a clear "tables missing" message.

## 4. Cloudinary setup

1. In the Cloudinary dashboard find **Cloud name** (Dashboard / Settings → API Keys area). The value `uwr3jend` you supplied was *not* verified as the cloud name; I could not check your dashboard. Put the confirmed value in `CLOUDINARY_CLOUD_NAME`. Uploads stay disabled (with a clear message) until it is set.
2. **Rotate the API secret** you pasted into chat: Cloudinary → Settings → API Keys → generate a new key/secret (or regenerate the secret), then put the new secret only in `.env.local` / your host. Treat the old one as compromised. If you generate a *new key pair*, update `CLOUDINARY_API_KEY` too.
3. Uploads use a **signed** direct upload: the browser asks `/api/admin/cloudinary/sign` (admins only) for a short-lived signature; the secret never leaves the server. Files go to the `popsy-bar/` folder. Allowed: JPEG, PNG, WebP, AVIF, max 10 MB. The old image is deleted only **after** the replacement is saved.
4. `next.config.ts` allows `res.cloudinary.com` for `next/image`.

Free plan note: Cloudinary's free plan uses a shared monthly credit allowance, so storage, bandwidth and transformations all count toward it. Check your plan's current limits in the dashboard.

## 5. Inquiry emails (Brevo)

Every public form (Contact, and the homepage / Plan Your Event inquiry; the Design-your-cart choice is attached to that inquiry) goes through one path:

`browser form -> POST /api/inquiries (same origin) -> validate -> save to Supabase -> Brevo transactional email -> notification inbox`

- Server code: `src/lib/inquiry/handler.ts` (the flow), `src/lib/email/brevo.ts` (the Brevo API client, `https://api.brevo.com/v3/smtp/email`, `api-key` header), `src/lib/email/inquiry-email.ts` (the HTML + plain-text email) and `src/app/api/inquiries/route.ts`.
- The email is sent **only after the inquiry was inserted** into `crm_inquiries`, from `notifications@thepopsybar.com`, with the visitor's address as **Reply-To**. The subject is always `New Website Inquiry – The Popsy Bar`. Only fields the visitor actually filled in appear in it.
- The recipient comes **only** from the server variable `INQUIRY_NOTIFICATION_EMAIL`. Nothing the browser sends can change the recipient, sender, cc/bcc or subject. All visitor text is HTML-escaped and stripped of line breaks where it could reach a header.
- The Brevo API key lives only in the server environment (`BREVO_API_KEY`, never `NEXT_PUBLIC_`). It is used in one server-side request header and never sent to the browser, logged or returned.
- **The database and the email are independent.** If the save fails, the visitor gets an error and no email is sent. If the save succeeds but Brevo fails (bad key, blocked IP, rate limit, outage, timeout, missing settings), the inquiry is kept, the visitor sees "received and saved", and the failure is logged on the server (`email-rejected` / `email-timeout` / `email-network-error` / `email-not-configured`, with Brevo's status and error code, never the inquiry text).
- **No duplicates.** Each form attempt carries a token; a repeated request finds the stored inquiry and sends no second row, push or email. The Brevo request is made once and is never retried automatically.

### Environment variables (server-only)

| Variable | Value |
| --- | --- |
| `BREVO_API_KEY` | API key from Brevo -> SMTP & API -> API Keys (secret) |
| `BREVO_SENDER_EMAIL` | `notifications@thepopsybar.com` (verified sender; this is also the default) |
| `BREVO_SENDER_NAME` | `The Popsy Bar` (also the default) |
| `INQUIRY_NOTIFICATION_EMAIL` | the inbox that receives notifications |

If Brevo returns `401` with an "unrecognised IP address" message, turn off IP blocking in Brevo -> Security -> Authorised IPs (Vercel does not use fixed IP addresses).

### Deploying (GitHub + Vercel)

1. Vercel -> Project -> Settings -> Environment Variables: add the four variables above (Production, and Preview if you test there). Mark `BREVO_API_KEY` as **Sensitive**.
2. Commit and push; Vercel redeploys. **Variables added to an existing deployment only take effect after a redeploy.**
3. On the live site send one test from the Contact page. Check the notification inbox (and spam the first time), then check the inquiry in `/admin/dashboard`.
4. If no email arrives, Vercel -> Logs -> filter `[inquiries]` and look for an `email-*` line. Brevo -> Transactional -> Logs shows what Brevo received.

## 6. Using the admin

- **/admin** dashboard: connection status, shortcuts.
- **Page content** (Homepage, About, Events, Contact, Plan Your Event, Gallery text, Occasion cards, Footer, Experience pages): every heading, paragraph, button label/link and image is a field. Wrap words in `*asterisks*` for the italic accent style. *Reset to original* restores the built-in text.
- **Sections:** Homepage, About and each experience page have an *order and visibility* panel (arrows + Visible checkbox).
- **Gallery & categories:** occasions come from `src/lib/occasions.ts` (so names always match the site). Per occasion: upload, replace, delete, reorder, hide, edit alt text, and tick *Show on homepage* for the homepage strip. Reorder/hide whole occasions at the top. Occasion descriptions are under *Gallery page* text.
- Changes are saved to Supabase and the site is revalidated immediately (public pages also refresh at most every 5 minutes).

## 7. What changed

- **Address and map:** `src/lib/site-config.ts` is the single source (`2717 FM 2218 Rd, Rosenberg, TX 77469, USA` + the map embed). Used in the footer, Contact, Plan Your Event and JSON-LD structured data. The old "Houston & surrounding areas" text was replaced. (The About story still says "Houston-born", which is biography, not the address.)
- **Hero:** the fade came from the cream scrim `.hero-bg::after` (alpha 0.92→0.55). It is now 6% (photos ≈94%), and the text sits on a subtle cream panel (`.hero__text`) for readability.
- **New pages:** `/gallery` (per-occasion sections, working *View More*), `/plan-your-event`. Added to the header (Gallery; Plan Your Event button), mobile menu and footer.
- **Removed (confirmed unused):** root `lib/` folder (a stale duplicate `occasions.ts` and unused `experience-images.ts`), `src/components/HeroBackground.tsx`, `src/data/*`.
- **Gallery photos:** only existing images are used. Cultural Celebration and Graduation have no photo yet and show "More photos soon." Several occasions have fewer than 4 photos, so *View More* appears only where there are more than 3.

## 8. Files

Created: `supabase/schema.sql`, `supabase/make-admin.sql`, `.env.example`, `src/proxy.ts`, `src/lib/{admin,cloudinary,slug,local-images}.ts`, `src/lib/supabase/*`, `src/lib/cms/*`, `src/lib/forms/*`, `src/app/admin/**`, `src/app/api/admin/cloudinary/sign/route.ts`, `src/app/gallery/page.tsx`, `src/app/plan-your-event/page.tsx`, and components `Rich`, `SmartLink`, `FormFeedback`, `BusinessMap`, `ContactForm`, `EventInquiryForm`, `CartDesignForm`, `GalleryCategory`, `SiteChrome`, `admin/*`.
Modified: `next.config.ts`, `.gitignore`, `src/app/{layout,page,globals.css}`, About/Events/Contact pages, `src/lib/site-config.ts`, `Header`, `Footer`, `PrimaryNav`, `MobileNav`, `Hero`, `ValueStrip`, `Services`, `Occasions`, `CartDesigner`, `Gallery`, `About`, `InquiryForm`, `ExperienceCategoryPage`.

## 9. Known limits

- Photos added to `/public/images` must also be listed in `src/lib/local-images.ts`.
- Page text editing covers headings, paragraphs, labels, links and images on every page; navigation labels, the experience chip lists and the cart designer's option lists are still in code.
- The About page's second story paragraph is a placeholder note ("This page is an editable introduction…"). Replace it from `/admin` before launch.
- Homepage hero slides: `hero-bg-5.jpeg` does not exist, so the slideshow uses four.


## 7. Customer CRM (`/admin/dashboard`)

Production: `https://thepopsybar.com/admin/dashboard`. A spreadsheet-style list of every inquiry:
**rose** rows/badges are **Website** submissions, **champagne** rows/badges are **Manual** entries. Click a row for the full text, then Edit or Delete.

### How it works

```
public form -> POST /api/inquiries (server)
   1. validate (+ no past event date)
   2. save to Supabase crm_inquiries   (source forced to "website" on the server)
   3. Web Push to admin devices (once per device, only if step 2 inserted a NEW row; runs alongside the email)
   4. Brevo email notification (only when step 2 inserted a NEW row; its failure never affects the saved record)
admin "Add Manually" -> server action -> insert with source "manual" (no push; toast only)
```

- Reads/edits/deletes run as the signed-in admin through Row Level Security (`public.is_admin()`), and every server action re-checks admin status. `/admin/*` is also gated by the proxy and the admin layout.
- Public visitors have **no** database policy on `crm_inquiries`. Website rows are written by the server with the service-role key after validation.
- `source`, `created_at` and `id` are protected by a database trigger, so editing can never change them. `created_at` is always generated by the database; `event_date` is the customer's event date.
- Each form attempt carries a random token; if a request is repeated, the server finds the existing record and does **not** insert, push or email again.
- If the email step fails after the record is saved, the customer sees a "received and saved" message (not a "delivery guaranteed" claim) and the record is kept. If the database save fails, the customer gets an error, nothing is emailed, and the error is logged server-side; the customer is never told it was saved.
- Event dates may not be in the past (browser `min` + server check on the manual form, the homepage form, the plan form and the contact form). "Today" uses `America/Chicago`; change with `NEXT_PUBLIC_BUSINESS_TIME_ZONE`.
- Occasion choices come from `src/lib/occasions.ts` (single source of truth).
- Public form abuse protection: honeypot, minimum fill time, strict validation, size limits, and a best-effort per-IP rate limit (6 per 10 minutes; per server instance on serverless hosts).

### Setup steps

1. **Run the migration.** Supabase Dashboard -> SQL Editor -> paste `supabase/migrations/20261029000000_create_crm_inquiries.sql` -> Run. (Requires `supabase/schema.sql` to have been run before, because it uses `public.is_admin()`. Safe to re-run; it never drops anything.)
2. **Admin account.** Reuse the existing one (section 3). No new auth system was added.
3. **Add the server-only key.** Supabase -> Project Settings -> API Keys -> copy the `service_role` (secret) key -> set `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` and in Vercel (Production). Never use a `NEXT_PUBLIC_` prefix. Without it, the site keeps working and emailing, but website inquiries are **not** saved to the CRM (a `crm-not-configured` line appears in server logs).
4. Optional: set `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_BUSINESS_TIME_ZONE` (see `.env.example`).
5. Sign in at `/admin/login`; you land on the CRM when you came from `/admin/dashboard`, otherwise open **Customer CRM** in the sidebar.

### Web Push notifications (custom, no notification service)

#### What was removed
OneSignal is gone completely: the SDK loader, `OneSignalDeferred`/login code, `public/OneSignalSDKWorker.js`, `src/lib/crm/onesignal.ts` and its tests, and the `NEXT_PUBLIC_ONESIGNAL_APP_ID`, `ONESIGNAL_REST_API_KEY` and `ONESIGNAL_SEGMENT` variables. **Delete those three variables from `.env.local` and from Vercel**, and you may delete the app in the OneSignal dashboard. Old phone subscriptions made through OneSignal stop working; subscribe again with the steps below.

#### How it works
```
phone/browser --(click "Turn on notifications")--> service worker + PushManager (VAPID public key)
      --> server action registerPushDevice --> DB function register_admin_push_subscription()  (owner = caller's own session)
new website inquiry saved --> /api/inquiries --> outbox row per (inquiry, device)  [admin_push_outbox]
      --> web-push library (VAPID private key, server only) --> browser vendor push service --> your phone
      --> public/popsy-push-sw.js shows "New Event Inquiry — The Popsy Bar" (no customer details)
failed/temporary errors stay in the outbox --> /api/push/retry (Vercel Cron or manual) retries with backoff
open dashboard --> Supabase Realtime shows an in-page toast for new website inquiries (separate from push)
```
- **Why the Next.js server (not a Supabase Edge Function):** the inquiry is already created inside `/api/inquiries` on Vercel, the `web-push` library needs Node's crypto/https (an Edge Function runs Deno, where its compatibility isn't guaranteed), and one codebase means one deployment and no extra network hop. Supabase is still the data store and security layer.
- **Reliable, not fire-and-forget:** the outbox row is written *before* sending and the send is awaited before the response ends, so the serverless function is never frozen mid-delivery. A unique key on `(inquiry_id, device)` plus the existing per-submission token guarantee a retried request can't notify a device twice; the notification `tag` also makes the browser replace, not stack, a repeat.
- **Outcomes per device:** success -> `sent`. HTTP 404/410 (device unsubscribed/expired) -> device deactivated, never retried. 429/5xx/network -> retried after 1 min, 5 min, 30 min, 2 h (5 attempts total). Other 4xx (bad payload or VAPID key mismatch) -> marked `dead`, not retried. Only a status code or a generic label is stored; never endpoints, keys or error bodies.
- **Privacy:** the outbox and subscription tables hold no customer data. The notification text is generic so nothing sensitive shows on a lock screen.
- **Realtime:** only a convenience for an already-open dashboard. It cannot wake a closed browser; only Web Push does that, and Web Push still depends on the browser vendor's push service (Google, Mozilla, Apple, Microsoft) being reachable by your device.

#### Setup
1. **Apply the SQL.** Supabase -> SQL Editor -> paste and run `supabase/migrations/20261030000000_admin_push_notifications.sql` (after `schema.sql` and the CRM migration). It is additive and safe to re-run: it creates `admin_push_subscriptions`, `admin_push_outbox`, two functions, RLS policies, and adds `crm_inquiries` to the Realtime publication. Nothing is dropped or modified.
2. **Generate VAPID keys (once):** `npm run vapid:generate` (or `node scripts/generate-vapid-keys.mjs`). It prints a public/private pair and writes nothing to disk. Alternative: `npx web-push generate-vapid-keys`.
3. **Environment variables** (local `.env.local` **and** Vercel -> Project -> Settings -> Environment Variables, Production + Preview):

   | Variable | Value | Visible to browser? |
   |---|---|---|
   | `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | public key from step 2 | yes (by design) |
   | `VAPID_PRIVATE_KEY` | private key from step 2 | **no, secret** |
   | `VAPID_SUBJECT` | `mailto:you@yourdomain.com` (optional; defaults to the site URL) | no |
   | `CRON_SECRET` | long random string, e.g. `openssl rand -hex 32` | **no, secret** |
   | `SUPABASE_SERVICE_ROLE_KEY` | already required by the CRM | **no, secret** |

   Redeploy after adding them (`NEXT_PUBLIC_` values are baked in at build). Do not change the VAPID keys later without having every device turn notifications off and on again.
4. **Install the dependency:** run `npm install` (adds `web-push` and `@types/web-push`) and commit the updated `package-lock.json`.
5. **Retry job.** `vercel.json` schedules `/api/push/retry` once a day (the most frequent schedule the free Hobby plan allows; Pro can run it every few minutes by editing the schedule). Vercel sends `CRON_SECRET` automatically. Manual run: `curl -H "Authorization: Bearer $CRON_SECRET" https://thepopsybar.com/api/push/retry` -> JSON counts of sent/retry/expired/dead. To inspect failures: `select status, attempts, last_status_code, last_error from admin_push_outbox where status in ('failed','dead') order by created_at desc;`

#### Subscribe a device
Sign in at `/admin/login`, open `/admin/dashboard`, click **Turn on notifications on this device**, and allow the browser prompt (the prompt only ever appears after that click). The dashboard then shows "Notifications are on for this device" with **Send test** and **Turn off**. Do this on each phone/computer you want alerts on; each device is a separate subscription.
- **Android (Chrome, Edge, Samsung Internet, Firefox):** works in the browser; installing to the Home Screen is optional.
- **iPhone/iPad (iOS/iPadOS 16.4 or newer):** Safari tab pages cannot use push. Tap Share -> **Add to Home Screen**, open the CRM **from the new Home Screen icon**, then turn notifications on. Push is not available on older iOS.
- **Desktop:** Chrome, Edge and Firefox work; Safari on macOS 13+ works. The browser (or its background process) must be allowed to run; some browsers/OS focus modes suppress notifications.
- Not supported: private/incognito windows and browsers without Push API support (the control says so). If permission was blocked, re-allow it in the browser/site settings and reload.

#### Test with the browser closed
1. Subscribe a phone (above), click **Send test**: you should see "Test notification — The Popsy Bar".
2. Close the browser/app completely (on iOS swipe the Home Screen app away).
3. From another device submit a real inquiry on `https://thepopsybar.com`. Within seconds the phone should show **New Event Inquiry — The Popsy Bar**; tapping it opens `/admin/dashboard`.
4. Nothing arrived? Check, in order: Vercel function logs for `push-skipped` / `push-failed` lines (they say whether VAPID or the service-role key is missing); `select * from admin_push_subscriptions` (your device should have `is_active = true`); the outbox query above; that notifications aren't muted at the OS level.

#### Manual checks that need your own Supabase / device (not done by the developer)
- RLS: while signed out (anon key) `select * from admin_push_subscriptions` and `admin_push_outbox` must return nothing; a second admin must not see the first admin's devices.
- A real notification on a physical Android and iOS device, and a real 404/410 expiry.

### Local testing

```bash
npm install
cp .env.example .env.local   # fill in Supabase + SUPABASE_SERVICE_ROLE_KEY + VAPID keys (npm run vapid:generate)
npm run dev
npm run test:crm             # CRM logic, mapping and inquiry handler flows (no network)
npm run test:push            # Web Push: validation, outbox delivery/retry/expiry, admin authorization, service worker
npm run test:inquiry         # validation, Brevo client + email template, handler failure handling (no network)
npm run lint && npm run build
```

### Vercel

Add the new variables (Production + Preview as needed): `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `CRON_SECRET`, and optionally `VAPID_SUBJECT`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_BUSINESS_TIME_ZONE`. Existing Supabase/Cloudinary variables stay as they are. The Brevo variables are listed in section 5. Redeploy afterwards (`NEXT_PUBLIC_` values are baked in at build time).
