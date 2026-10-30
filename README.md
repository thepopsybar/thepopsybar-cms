# The Popsy Bar

Next.js 16 (App Router) · TypeScript · Tailwind 4 · Supabase (content + auth + CRM) · Cloudinary (images) · FormSubmit (inquiry email) · OneSignal (push)

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

## 5. Inquiry emails (FormSubmit)

Every public form (Contact, and the homepage / Plan Your Event inquiry; the Design-your-cart choice is attached to that inquiry) goes through one path:

`browser form -> POST /api/inquiries (same origin) -> FormSubmit AJAX -> recipient inbox`

- Recipient and endpoint: `src/lib/site-config.ts` (`FORM_SUBMIT_EMAIL`, `FORM_SUBMIT_ENDPOINT`).
- Server code: `src/lib/inquiry/*` (validation, one upstream request, error classification) and `src/app/api/inquiries/route.ts`.
- The site says "sent" **only** when FormSubmit's JSON reply confirms acceptance. Activation-needed, rejections, non-JSON replies, timeouts and network errors are reported as separate failures with different messages and are logged **without** names, emails or message text.
- A request is **never retried automatically** once it may have been delivered (this would send duplicate emails). The one exception: if the server provably never got the request out (DNS/connect/TLS failure or connect timeout), the browser may try FormSubmit directly **once**. Turn that off with `INQUIRY_BROWSER_FALLBACK=off`.

**One-time activation (required):** the first submission to a new address makes FormSubmit email an activation link to that inbox; mail is not delivered until it is clicked (check spam). Then submit a second test and confirm it arrives.

**Optional:** after activation FormSubmit can give you a random alias. Set `FORMSUBMIT_ENDPOINT=https://formsubmit.co/ajax/<alias>` (server env) to stop the real address being used anywhere.

### If submissions time out

```bash
npm run check:formsubmit          # DNS / TCP / TLS / HTTPS timings from this machine's Node.js
npm run check:formsubmit -- --send  # also submits one labelled test inquiry
npm run test:inquiry              # unit tests (mocked upstream + local test servers; sends no email)
```

The output shows which phase fails. On Windows, a firewall/VPN/proxy that treats `node.exe` differently from PowerShell is a common cause; Node does not use browser/Windows proxy settings automatically.

### Deploying the fix (GitHub + Vercel)

1. Commit and push the changes to GitHub; Vercel redeploys automatically.
2. No new variables are required. Optional: `FORMSUBMIT_ENDPOINT`, `INQUIRY_BROWSER_FALLBACK` (Vercel -> Project -> Settings -> Environment Variables, then redeploy).
3. On the live site, send one test from the Contact page, click the FormSubmit activation link if you receive it, then send a second test and confirm delivery.

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
   3. OneSignal push (once, only if step 2 inserted a NEW row)
   4. FormSubmit email (unchanged)
admin "Add Manually" -> server action -> insert with source "manual" (no push; toast only)
```

- Reads/edits/deletes run as the signed-in admin through Row Level Security (`public.is_admin()`), and every server action re-checks admin status. `/admin/*` is also gated by the proxy and the admin layout.
- Public visitors have **no** database policy on `crm_inquiries`. Website rows are written by the server with the service-role key after validation.
- `source`, `created_at` and `id` are protected by a database trigger, so editing can never change them. `created_at` is always generated by the database; `event_date` is the customer's event date.
- Each form attempt carries a random token; if a request is repeated, the server finds the existing record, does **not** insert or push again, and only retries the email.
- If the email step fails after the record is saved, the customer sees a "received and saved" message (not a "delivery guaranteed" claim) and the record is kept. If the database save fails, the email still goes out (as before) and the error is logged server-side; the customer is never told it was saved.
- Event dates may not be in the past (browser `min` + server check on the manual form, the homepage form, the plan form and the contact form). "Today" uses `America/Chicago`; change with `NEXT_PUBLIC_BUSINESS_TIME_ZONE`.
- Occasion choices come from `src/lib/occasions.ts` (single source of truth).
- Public form abuse protection: honeypot, minimum fill time, strict validation, size limits, and a best-effort per-IP rate limit (6 per 10 minutes; per server instance on serverless hosts).

### Setup steps

1. **Run the migration.** Supabase Dashboard -> SQL Editor -> paste `supabase/migrations/20261029000000_create_crm_inquiries.sql` -> Run. (Requires `supabase/schema.sql` to have been run before, because it uses `public.is_admin()`. Safe to re-run; it never drops anything.)
2. **Admin account.** Reuse the existing one (section 3). No new auth system was added.
3. **Add the server-only key.** Supabase -> Project Settings -> API Keys -> copy the `service_role` (secret) key -> set `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` and in Vercel (Production). Never use a `NEXT_PUBLIC_` prefix. Without it, the site keeps working and emailing, but website inquiries are **not** saved to the CRM (a `crm-not-configured` line appears in server logs).
4. Optional: set `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_BUSINESS_TIME_ZONE` (see `.env.example`).
5. Sign in at `/admin/login`; you land on the CRM when you came from `/admin/dashboard`, otherwise open **Customer CRM** in the sidebar.

### OneSignal push notifications (phone)

1. At onesignal.com create an app, platform **Web**. Choose "Custom Code", site name **The Popsy Bar**, site URL `https://thepopsybar.com`. Leave "Auto Resubscribe" on; the service worker path is `OneSignalSDKWorker.js` (already in `public/`).
2. Copy the **App ID** -> `NEXT_PUBLIC_ONESIGNAL_APP_ID`. Copy the app's **REST API Key** (Settings -> Keys & IDs) -> `ONESIGNAL_REST_API_KEY` (server-only). Add both in Vercel and redeploy.
3. Pushes go to the segment `Subscribed Users` (OneSignal's default). If your dashboard names it differently, set `ONESIGNAL_SEGMENT`. The SDK is loaded **only** on the admin CRM page, so only people who open the CRM can subscribe.
4. **Subscribe your phone** (must be HTTPS, which production is):
   - **Android (Chrome):** open `https://thepopsybar.com/admin/dashboard`, sign in, tap **Turn on alerts on this device**, then Allow.
   - **iPhone/iPad (iOS/iPadOS 16.4+):** web push only works from an installed web app. In Safari open the CRM URL, Share -> **Add to Home Screen**, open it **from the home-screen icon**, sign in, tap **Turn on alerts on this device**, Allow.
5. Tap a notification to open the CRM at `https://thepopsybar.com/admin/dashboard`.
6. Test: submit a real inquiry on the live site. Check OneSignal -> Delivery -> Messages if nothing arrives (most common causes: phone not subscribed, wrong segment name, wrong REST key).

Push has **not** been tested end to end by the developer (no OneSignal credentials or device available); follow step 6 to confirm it on your own setup. Manual CRM entries never send a push.

### Local testing

```bash
npm install
cp .env.example .env.local   # fill in Supabase + SUPABASE_SERVICE_ROLE_KEY (+ OneSignal if you want pushes)
npm run dev
npm run test:crm             # CRM logic, mapping, handler flows, OneSignal request shape (no network)
npm run test:inquiry         # original FormSubmit tests
npm run lint && npm run build
```

### Vercel

Add the new variables (Production + Preview as needed): `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_ONESIGNAL_APP_ID`, `ONESIGNAL_REST_API_KEY`, and optionally `ONESIGNAL_SEGMENT`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_BUSINESS_TIME_ZONE`. Existing Supabase/Cloudinary/FormSubmit variables stay as they are. Redeploy afterwards (`NEXT_PUBLIC_` values are baked in at build time).
