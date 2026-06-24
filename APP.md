# I.Core Projects — App Gallery

A Play Store–style gallery for installation-free apps, with an admin dashboard
for publishing new ones. Built as plain static files so it can be hosted
directly on GitHub Pages — no server, no build step.

```
index.html        Public gallery
admin.html        Admin dashboard (upload / edit / delete apps)
apps.json         The data — one JSON array, every app is an entry
assets/style.css  Shared design tokens + components
assets/main.js    Gallery logic (fetch apps.json, search, detail modal)
assets/admin.js   Dashboard logic (GitHub API publishing, form, validation)
```

## How publishing works

GitHub Pages only serves static files — there's no database and no backend
to upload to. So this gallery uses the repo itself as the database:
`apps.json` holds the app list, and the admin dashboard writes to it by
committing directly to the repo through the **GitHub Contents API**, using a
personal access token you paste in once per session.

That means:
- Anyone can *view* the gallery — `index.html` just reads `apps.json`.
- Only someone with a valid token that has write access to your repo can
  *publish*. The token never leaves your browser except to talk to GitHub
  directly — it isn't sent anywhere else and isn't stored in the site's code.

## 1. Deploy it

1. Create (or reuse) a repo named exactly `icore-projects.github.io` under
   the `icore-projects` GitHub account — that exact name is what makes
   GitHub Pages serve it at `https://icore-projects.github.io`.
2. Push all the files in this folder to the root of that repo, on whichever
   branch you'll use as the Pages source (usually `main`).
3. In the repo's **Settings → Pages**, set the source to that branch / root.
4. Visit `https://icore-projects.github.io` once it builds.

If you're hosting this under a *different* owner or repo name, open
`assets/admin.js` and update the two lines near the top:

```js
const CONFIG = {
  owner: "icore-projects",          // ← change to your GitHub username/org
  repo: "icore-projects.github.io", // ← change to your repo name
  ...
};
```

## 2. Create a token for the admin dashboard

1. Go to **github.com/settings/personal-access-tokens/new** (fine-grained
   tokens).
2. Limit it to **this one repository**.
3. Under **Repository permissions**, set **Contents** to **Read and write**.
   Nothing else is needed.
4. Generate it, copy it, and paste it into the admin dashboard at
   `/admin.html` when prompted.

Treat this token like a password — anyone who has it can publish to your
site. If it ever leaks, revoke it from the same settings page.

## 3. Using the dashboard

- Open `admin.html`, paste the token, and click **Connect to GitHub**.
  Check **"Remember this token on this device"** only on a computer you
  trust — it's saved in `localStorage` rather than just for the session.
- **Upload new app**: name and version are required; add at least two
  screenshot image URLs (any direct image link works — GitHub raw URLs,
  imgur, etc.); description, the release URL, and the open/live URL are
  optional.
  - **Source** button on the public page uses the GitHub release URL.
  - **Open** button uses the live/open URL, or falls back to the release
    URL if you leave that field blank.
- **Manage apps** lists everything published, with edit and delete.
- Every publish, edit, or delete is a real commit to `apps.json` — check
  your repo's commit history any time to see the log.
- No token handy, or just want to try the dashboard layout? Use
  **Continue in local preview mode** on the lock screen — it saves to your
  browser only and is clearly marked as not published.

## Notes

- Remove the placeholder `CoreNotes` entry in `apps.json` (or just delete it
  from the dashboard) once you've published a real app.
- The gallery re-fetches `apps.json` on every page load with cache-busting,
  so changes typically show up within a few seconds of a commit. GitHub
  Pages' own CDN can occasionally cache for a short window — a hard refresh
  clears it.

---

**I.Core Projects** — built and maintained by Tharvesh Muhaideen.
Want this running on your own local network instead? Email
**tharvesh2026@gmail.com** for a personalized setup.
