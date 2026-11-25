# Byllora Waitlist

Pre-launch waitlist site built with [Astro](https://astro.build) (static output). Signups are sent to the Byllora API and appear in the admin portal under **Waitlist**.

## Run locally

```sh
npm install
npm run dev      # http://localhost:3003
```

On localhost the form posts to `http://localhost:8000/api/v1`; anywhere else it uses `https://api.byllora.com/api/v1`. To point it somewhere else, set `PUBLIC_API_URL` (see `.env.example` and `src/scripts/config.ts`).

Other commands: `npm run build` (outputs to `dist/`), `npm run preview`, `npx astro check` (type check).

## Project layout

| Path | What it is |
| --- | --- |
| `src/pages/index.astro` | The page |
| `src/layouts/Layout.astro` | `<head>`, fonts, global styles |
| `src/components/Hero.astro` | Headline, rotating word, "Join waitlist" button |
| `src/components/PhoneDemo.astro` | Illustrative phone with the animated purchase feed |
| `src/components/WaitlistForm.astro` | 3-step form and success state |
| `src/components/Choice.astro` | Radio-pill question with optional "Other" box |
| `src/scripts/waitlist-form.ts` | Form validation and submission |
| `src/styles/global.css` | All styles |
| `public/` | Logo and favicon |

## API

| Method | Endpoint | Auth |
| --- | --- | --- |
| POST | `/api/v1/waitlist` | public, 5/min per IP |
| GET | `/api/v1/waitlist/stats` | public |
| GET | `/api/v1/admin/waitlist` (+ `/export`, `/{id}`) | admin |
| PATCH | `/api/v1/admin/waitlist/{id}` | admin |
| DELETE | `/api/v1/admin/waitlist/{id}` | super admin |

Every new signup gets a welcome email (`App\Notifications\WaitlistWelcome`) with their place in line.

## Deploy

Any static host works (Vercel, Netlify, Cloudflare Pages): build command `npm run build`, output directory `dist`. `https://waitlist.byllora.com` and any `*.byllora.com` / `*.vercel.app` origin are already allowed by CORS. If you use a different domain, add it to `backend_byllora/config/cors.php`.
