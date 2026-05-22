# Vercel Proof Checklist

This proof keeps the current BISMA crawler logic intact and only checks whether it can run inside Vercel Functions.

## 1. Set Vercel Environment Variables

Set these in the Vercel project settings. Keep values out of GitHub.

```text
BISMA_BASE_URL=https://bisma.bpkp.go.id
BISMA_USERNAME=
BISMA_PASSWORD=
BISMA_YEAR=2026
BISMA_CACHE_TTL_SECONDS=900
BISMA_DETAIL_CONCURRENCY=2
BISMA_DEBUG_HTML=false
```

Use lower concurrency for the proof so BISMA and Vercel both get a calmer first run.

## 2. Deploy

Push the repository to GitHub and import it into Vercel, or run:

```text
vercel
```

For production:

```text
vercel --prod
```

## 3. Smoke Test

Replace `APP_URL` with the Vercel deployment URL.

```text
curl APP_URL/api/health
curl APP_URL/api/bisma/status
curl -X POST APP_URL/api/bisma/login
curl APP_URL/api/bisma/costsheets
```

If those pass, test the full crawler:

```text
curl -X POST APP_URL/api/bisma/sync
curl APP_URL/api/bisma/timeline
```

## 4. Pass/Fail Criteria

The proof passes if:

- `/api/bisma/login` returns `ok: true`.
- `/api/bisma/costsheets` returns the expected list count.
- `/api/bisma/sync` finishes before Vercel terminates the function.
- `/api/bisma/timeline` returns assignments.

The proof fails, or needs redesign, if:

- Vercel times out during `/api/bisma/sync`.
- BISMA blocks or rejects requests from Vercel.
- Cached timeline data disappears too often because the function instance is recycled.

If it fails on timeout or cache durability, the next step is an async job plus Redis/Postgres storage.
