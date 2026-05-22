# Vercel Proof Retired

The Vercel BISMA crawler proof is no longer the recommended deployment path.

Reason:

- BISMA can limit or reject cloud-hosted traffic.
- Vercel function cache is not durable enough for the latest timeline snapshot.
- BISMA credentials should remain local-only for this workflow.

Use the current flow instead:

```text
npm run publish:timeline
```

That command runs the BISMA sync locally and publishes a sanitized `timeline/latest.json` snapshot
to Supabase Storage. GitHub Pages reads that public JSON file at runtime through
`VITE_TIMELINE_DATA_URL`.
