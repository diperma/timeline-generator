# Split Deployment

This project can run with:

```text
GitHub Pages: static React frontend
Vercel: backend API and BISMA crawler
```

## Vercel Backend

Set these Vercel environment variables:

```text
BISMA_BASE_URL=https://bisma.bpkp.go.id
BISMA_USERNAME=
BISMA_PASSWORD=
BISMA_YEAR=2026
BISMA_CACHE_TTL_SECONDS=900
BISMA_DETAIL_CONCURRENCY=2
BISMA_DEBUG_HTML=false
CORS_ORIGIN=https://diperma.github.io
```

The proof endpoints are:

```text
GET  /api/health
GET  /api/bisma/status
POST /api/bisma/login
GET  /api/bisma/costsheets
POST /api/bisma/sync
GET  /api/bisma/timeline
```

## GitHub Pages Frontend

In the GitHub repository, create a repository variable:

```text
VITE_API_BASE_URL=https://YOUR_VERCEL_APP.vercel.app
```

Then enable GitHub Pages with **GitHub Actions** as the source. The workflow in `.github/workflows/pages.yml` builds the frontend with:

```text
VITE_BASE_PATH=/timeline-generator/
```

The Pages URL should be:

```text
https://diperma.github.io/timeline-generator/
```

## Notes

- The frontend never talks directly to BISMA.
- BISMA credentials must stay in Vercel environment variables.
- `CORS_ORIGIN` should use only the origin, not the path.
- The current Vercel proof still uses in-memory cache. If sync is slow or cache is unstable, add Redis/Postgres job state next.
