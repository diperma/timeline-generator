# Local Sync + Supabase Snapshot Deployment

This project now uses a semi-updated public deployment:

```text
Local machine: BISMA login, crawl, parse, sanitize, publish
Supabase Storage: public latest timeline JSON snapshot
GitHub Pages: static React frontend that reads the snapshot
```

GitHub Pages and Vercel should not contact `bisma.bpkp.go.id`.

## Local Environment

Keep real secrets in `.env` only:

```text
BISMA_BASE_URL=https://bisma.bpkp.go.id
BISMA_USERNAME=
BISMA_PASSWORD=
BISMA_YEAR=2026

SUPABASE_URL=https://eazsimhmrdsihwlpmjaf.supabase.co
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_BUCKET=bisma-timeline
PUBLIC_TIMELINE_PATH=timeline/latest.json
SUPABASE_CACHE_CONTROL_SECONDS=60
SUPABASE_PUBLISH_HISTORY=false
```

The Supabase service role or secret key is local/server-only. Never expose it through any
`VITE_` variable.

## Publish Data

Run this locally after your BISMA credentials and Supabase values are set:

```text
npm run publish:timeline
```

The command:

- syncs BISMA locally,
- sanitizes the timeline payload,
- uploads `timeline/latest.json` to Supabase Storage,
- prints the public snapshot URL.

The public snapshot removes member `nip`, `noSpd`, per-member costs, cookies, raw HTML, and
backend-only data. Treat anything left in the JSON as visible to every visitor.

## GitHub Pages

Set this GitHub repository variable:

```text
VITE_TIMELINE_DATA_URL=https://eazsimhmrdsihwlpmjaf.supabase.co/storage/v1/object/public/bisma-timeline/timeline/latest.json
```

Then enable GitHub Pages with **GitHub Actions** as the source. The workflow builds with:

```text
VITE_BASE_PATH=/timeline-generator/
```

The Pages URL should be:

```text
https://diperma.github.io/timeline-generator/
```

## Local Development

Local development can still use the backend directly:

```text
npm run dev
```

If `VITE_TIMELINE_DATA_URL` is not set, the frontend reads `/api/bisma/timeline` through the Vite
proxy. If it is set, the frontend reads the public Supabase snapshot and the button reloads that
snapshot instead of triggering BISMA sync.

## Security Notes

- Rotate any Supabase secret that has been pasted into chat or stored outside `.env`.
- Keep `.env` ignored.
- Do not publish raw BISMA HTML or cookies.
- Do not add BISMA credentials, Supabase service keys, or encrypted BISMA payloads to GitHub
  variables used by the frontend.
