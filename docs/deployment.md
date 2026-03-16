# Deployment

Winnow uses two separate frontends:

| Domain         | Purpose              | Source                | Hosting  |
|----------------|----------------------|-----------------------|----------|
| **www.winnow.com**  | Marketing landing page | `packages/landing`    | Netlify  |
| **app.winnow.com**  | Dashboard (React app)  | `packages/web`        | Netlify  |

Both can be deployed on Netlify from the same repo using two Netlify sites.

---

## 1. www.winnow.com (landing page)

Static HTML/CSS only — no build step.

1. In [Netlify](https://app.netlify.com): **Add new site** → **Import an existing project** → connect this repo.
2. Configure:
   - **Branch to deploy:** `main` (or your default)
   - **Base directory:** `packages/landing`
   - **Build command:** leave empty (or `echo 'No build'`)
   - **Publish directory:** `.` (or leave default; `netlify.toml` in the package sets `publish = "."`)
3. Under **Domain management**, set the custom domain to **www.winnow.com** (or your chosen domain).
4. Deploy. The site will serve `index.html` and `styles.css` from `packages/landing`.

The `packages/landing/netlify.toml` is used when Netlify’s base directory is `packages/landing`, so you don’t need to set build command or publish directory in the UI if the base directory is correct.

---

## 2. app.winnow.com (dashboard)

React app built with Vite; needs install + build.

1. In Netlify: **Add new site** again → **Import an existing project** → same repo.
2. Configure:
   - **Branch to deploy:** `main` (or your default)
   - **Base directory:** leave **empty** (build from repo root)
   - **Build command:** `npm ci && npx turbo build --filter=@winnow/web`
   - **Publish directory:** `packages/web/dist`
3. Under **Domain management**, set the custom domain to **app.winnow.com**.
4. Deploy.

The root `netlify.toml` in the repo defines this build and publish configuration, so Netlify will use it if no overrides are set in the UI.

### Environment variables (dashboard)

If the dashboard calls an API (e.g. `api.winnow.com`), set in Netlify → **Site settings** → **Environment variables**:

- `VITE_API_URL` — full API base URL (e.g. `https://api.winnow.com`). The app uses this for API requests in production.

Then ensure `packages/web` reads `import.meta.env.VITE_API_URL` in its API client and uses it when present.

---

## Summary

- **Two Netlify sites**, one per domain.
- **www:** base directory = `packages/landing`, no build, publish = `.`
- **app:** base directory = repo root, build = `npm ci && npx turbo build --filter=@winnow/web`, publish = `packages/web/dist`

Backend (NestJS) is deployed separately (e.g. Railway, Fly.io, or another provider) and is not covered in this doc.
