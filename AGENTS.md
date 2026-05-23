# BISMA Timeline Generator Starter Notes

This app should be built from the `field-trip-simulator` timeline module, but the source data comes from BISMA costsheet pages instead of the simulator's local assignment seed/database.

## Goal

Create a standalone timeline app that:

- logs in to BISMA through a backend-only adapter,
- fetches costsheet list data,
- fetches and parses costsheet detail pages,
- normalizes the result into clean JSON,
- feeds that JSON into the timeline UI adapted from `field-trip-simulator`.

The frontend must not talk directly to BISMA and must never receive BISMA credentials or cookies.

## Source Reference

Use the existing timeline implementation from:

```text
C:\Users\bpkp\.gemini\antigravity\scratch\field-trip-simulator
```

Important files:

```text
src/features/timeline-penugasan/TimelinePenugasanPage.tsx
src/features/timeline-penugasan/timelineEngine.ts
src/engine/validators.ts
src/styles.css
```

The existing timeline engine expects assignment/member date ranges. Keep that mental model and build a BISMA adapter that emits equivalent data.

## BISMA Login

BISMA base URL:

```text
https://bisma.bpkp.go.id
```

Login endpoint:

```text
POST https://bisma.bpkp.go.id/Auth/Auth/act_auth
```

Backend login flow:

1. `GET https://bisma.bpkp.go.id/`
2. Extract hidden `enckey` from the login page.
3. Encrypt username, password, and year using BISMA's encryption method.
4. `POST` encrypted form fields to `/Auth/Auth/act_auth`.
5. On success, follow `redirect_url` to establish the session.
6. Store cookies in backend memory.

Credentials must come from `.env`, never from frontend code.

Recommended `.env` fields:

```text
BISMA_BASE_URL=https://bisma.bpkp.go.id
BISMA_USERNAME=
BISMA_PASSWORD=
BISMA_YEAR=2026
BISMA_CACHE_TTL_SECONDS=900
BISMA_DETAIL_CONCURRENCY=4
BISMA_DEBUG_HTML=false
```

Do not commit `.env`.

## Encryption

The login form fields use:

- AES-256-CBC
- PBKDF2-HMAC-SHA512
- 999 iterations
- random 16-byte IV
- random 256-byte salt
- output format: `base64(JSON({ ciphertext, iv, salt, iterations }))`

Existing working references are available in sibling projects:

```text
C:\Users\bpkp\.gemini\antigravity\scratch\bisma-login\bisma_login.py
C:\Users\bpkp\.gemini\antigravity\scratch\bisma-crawler\server.js
```

## Costsheet List Endpoint

The costsheet list endpoint is:

```text
POST https://bisma.bpkp.go.id/Transaksi/Apisima/Getcostsheet_ajax
```

Important discovery: this endpoint returns empty data unless the request includes:

```text
trigger=All
```

The key is lowercase and the value is case-sensitive. These returned empty data:

```text
{}
Trigger=All
trigger=all
```

The correct call returned 94 rows in testing:

```text
trigger=All
```

The visible filters on the BISMA page are DataTables SearchPanes. They are built client-side after all rows are loaded. They are not required API request filters.

## Costsheet List Data Shape

The raw `Getcostsheet_ajax` response is:

```json
{
  "data": [
    [
      "1",
      1,
      "<span class='...'>1</span>",
      "<div></div>209611-1<br>melaksanakan Quality Assurance ...",
      "DIPA: D3",
      "Rp 28.969.743",
      "Created By<br>",
      "<br>",
      "<div>...Getcostsheetdetail/209611-1/Detail/PKPT/240848/cs...</div>"
    ]
  ]
}
```

Raw row mapping:

```text
0 raw index
1 display number
2 status HTML
3 costsheet number + description HTML
4 beban
5 biaya
6 created/updated by
7 approval fields
8 action/detail HTML
```

Normalize each row to:

```json
{
  "no": 1,
  "statusCode": "1",
  "costsheetId": "209611-1",
  "description": "melaksanakan Quality Assurance ...",
  "beban": "DIPA: D3",
  "biaya": 28969743,
  "createdBy": "Andreas Pandapotan Exaudy Hutabarat",
  "detailUrl": "https://bisma.bpkp.go.id/Transaksi/Apisima/Getcostsheetdetail/209611-1/Detail/PKPT/240848/cs",
  "sourceType": "PKPT",
  "pkptId": "240848"
}
```

Parsing rules:

- Use an HTML parser such as Cheerio.
- Strip HTML from status and created fields.
- Split column 3 around `<br>`:
  - first text is costsheet ID,
  - remaining text is the assignment description.
- Parse rupiah text to number.
- Extract detail URL from column 8.
- Extract `sourceType` and `pkptId` from the detail URL.

## Costsheet Detail Pages

Detail page URL pattern:

```text
https://bisma.bpkp.go.id/Transaksi/Apisima/Getcostsheetdetail/{costsheetId}/Detail/{sourceType}/{pkptId}/cs
```

Example:

```text
https://bisma.bpkp.go.id/Transaksi/Apisima/Getcostsheetdetail/206906-1/Detail/PKPT/240834/cs
```

The detail page is a read-only HTML form. Data is embedded in `input`, `textarea`, `select option selected`, and script variables.

Useful selectors:

```text
#nost
#tglst
#uraianst
#tglst_mulai
#tglst_selesai
#idxskmpnenlabel
#kdakun
#alokasi
#bebananggaranlabel
#val_sumber_dana
#ttd_
#menyetujui
#mengajukan
#realisasi
#id_st
#id_cs
#thang
```

Useful script variables:

```text
satker_session
user_session
role_session
unit_session
id_status
id_status_cs
sumber_data
countJSON
```

## Detail Member Rows

Team/member rows are under:

```text
#tbUser tr.tb-tim
```

Each row uses numeric suffixes:

```text
#tb-tim1
#nama1
#nip1
#perjab1
#gol1
#tglberangkat1
#tglkembali1
#jmlharidum1
```

For each row `X`, parse:

```text
#nospdX
#namaX
#nipX
#perjabX
#golX
#tglberangkatX
#tglkembaliX
#jmlharidumX
#kotaasalX option[selected]
#kotatujuanX option[selected]
#totalX
input[name="is_aktifX"]
```

Member output shape:

```json
{
  "rowNo": 3,
  "isActive": true,
  "noSpd": "SPD - 01259/D3/2026",
  "employeeName": "Willy Hutabarat",
  "nip": "198610102014021001",
  "role": "Auditor Ahli Muda",
  "grade": "III/c",
  "startDate": "2026-05-21",
  "endDate": "2026-05-26",
  "hp": 3,
  "originCity": "KOTA JAKARTA",
  "destinationCity": "KOTA ADM. JAKARTA SELATAN",
  "totalCost": 1140000
}
```

### HP Rule

Do not rely on visible `#jmlhariX`; it can be empty in the HTML and filled later by JavaScript.

Use hidden `#jmlharidumX`:

```text
jmlharidumX = "a;b"
hp = Number(a) + Number(b)
```

Examples:

```text
"0;3" -> 3
"0;1" -> 1
"0;0" -> 0
```

If `jmlharidumX` is missing and dates are available, fallback to inclusive calendar day difference.

### Active Row Rule

BISMA detail HTML can contain duplicate `is_aktifX` inputs with different values inside the same row.

Recommended rule:

- Parse within the row, not globally by duplicated id.
- Treat row as active if any `input[name="is_aktifX"]` inside the row has value `"1"`.
- For timeline data, include rows that have `employeeName`, `startDate`, and `endDate`, and preserve `isActive` as metadata.

This avoids losing valid timeline rows because of duplicated HTML ids.

## Backend Modules

Recommended backend structure:

```text
api/
  index.js
  bisma/
    config.js
    encryption.js
    cookieJar.js
    bismaClient.js
    costsheetListParser.js
    costsheetDetailParser.js
    timelineAdapter.js
    cache.js
```

### `config.js`

Reads and validates `.env` values.

### `encryption.js`

Implements BISMA encryption for login form fields.

### `cookieJar.js`

Handles `set-cookie` headers, cookie merging, and request `Cookie` headers.

### `bismaClient.js`

Owns session lifecycle:

```text
ensureSession()
bismaGet(pathOrUrl, options)
bismaPost(pathOrUrl, formData, options)
logout()
```

The client should retry once after session expiry by clearing cookies and logging in again.

### `costsheetListParser.js`

Converts `Getcostsheet_ajax` raw JSON into normalized list items.

### `costsheetDetailParser.js`

Converts one detail HTML page into normalized assignment/member data.

### `timelineAdapter.js`

Converts normalized BISMA detail objects into the clean timeline data shape used by the frontend.

### `cache.js`

Provides in-memory cache with TTL for:

```text
costsheet:list:All
costsheet:detail:{costsheetId}
timeline:All
```

## Backend Endpoints

Start with these endpoints:

```text
GET /api/bisma/status
GET /api/bisma/costsheets
GET /api/bisma/costsheets/:costsheetId
GET /api/bisma/timeline
POST /api/bisma/sync
```

### `GET /api/bisma/status`

Returns backend login/cache state:

```json
{
  "authenticated": true,
  "year": "2026",
  "lastLoginAt": "2026-05-21T10:15:00.000Z",
  "cache": {
    "hasTimeline": true,
    "syncedAt": "2026-05-21T10:15:00.000Z"
  }
}
```

### `GET /api/bisma/costsheets`

Returns parsed list data only:

```json
{
  "count": 94,
  "items": []
}
```

### `GET /api/bisma/costsheets/:costsheetId`

Returns one parsed detail page:

```json
{
  "costsheetId": "206906-1",
  "members": []
}
```

### `GET /api/bisma/timeline`

Returns full timeline-ready backend JSON:

```json
{
  "source": "bisma",
  "year": "2026",
  "syncedAt": "2026-05-21T10:15:00.000Z",
  "count": 94,
  "assignments": [],
  "warnings": []
}
```

### `POST /api/bisma/sync`

Forces refresh of list and detail data:

```json
{
  "ok": true,
  "listCount": 94,
  "detailParsed": 92,
  "detailFailed": 2,
  "syncedAt": "2026-05-21T10:15:00.000Z",
  "warnings": []
}
```

## Clean Backend Timeline Shape

The backend should expose assignments like:

```json
{
  "no": 1,
  "source": "bisma",
  "costsheetId": "206906-1",
  "stId": "206906",
  "nomorSt": "PE.09.02/ST-78/D302/1/2026",
  "pkptId": "240834",
  "sourceType": "PKPT",
  "statusCode": "2",
  "statusLabel": "Persetujuan PPK",
  "description": "melaksanakan Evaluasi ...",
  "startDate": "2026-05-12",
  "endDate": "2026-05-29",
  "members": [
    {
      "employeeName": "Willy Hutabarat",
      "nip": "198610102014021001",
      "role": "Auditor Ahli Muda",
      "startDate": "2026-05-21",
      "endDate": "2026-05-26",
      "hp": 3
    }
  ]
}
```

## Caching

Use in-memory cache first.

Default TTL:

```text
15 minutes
```

Rules:

- `GET /api/bisma/timeline` uses fresh cache when available.
- `POST /api/bisma/sync` bypasses cache.
- Cache detail pages individually by costsheet ID.
- Limit detail page concurrency; use `BISMA_DETAIL_CONCURRENCY`.
- Return partial results when some detail pages fail.

## Error Handling

Prefer partial success over all-or-nothing failure.

Warning shape:

```json
{
  "costsheetId": "209611-1",
  "stage": "detail-parse",
  "message": "No #tbUser rows found"
}
```

Known error categories:

```text
login-failed
session-expired
list-fetch-failed
list-parse-failed
detail-fetch-failed
detail-parse-failed
missing-date
missing-member-name
invalid-hp
```

## Logging And Safety

Log useful operational facts:

```text
BISMA login success for year 2026
Fetched 94 costsheets
Parsed 92 detail pages, 2 failed
```

Do not log:

```text
password
encrypted payload
full cookie headers
raw HTML by default
```

If `BISMA_DEBUG_HTML=true`, debug HTML may be saved locally, but it must not be committed.

## Implementation Milestones

1. Scaffold app from `field-trip-simulator` timeline UI.
2. Build backend config, encryption, cookie jar, and BISMA client.
3. Verify `GET /api/bisma/status` logs in successfully.
4. Fetch costsheet list with `trigger=All`.
5. Implement and verify `GET /api/bisma/costsheets`.
6. Implement detail parser using the known detail HTML structure.
7. Verify `GET /api/bisma/costsheets/206906-1` returns clean member data.
8. Add concurrency-limited detail crawling and caching.
9. Implement `GET /api/bisma/timeline`.
10. Only after backend JSON is stable, plan and build the frontend timeline integration.

## Current Milestone Status

Status as of 2026-05-23: the backend, frontend timeline integration, Supabase snapshot publishing flow, public GitHub Pages deployment, favicon, data cutoff metadata, and member cost breakdown display are implemented and verified.

### Completed Backend

Implemented backend modules:

```text
api/index.js
api/bisma/config.js
api/bisma/encryption.js
api/bisma/cookieJar.js
api/bisma/bismaClient.js
api/bisma/costsheetListParser.js
api/bisma/costsheetDetailParser.js
api/bisma/costsheetService.js
api/bisma/timelineAdapter.js
api/bisma/publicTimeline.js
api/bisma/supabasePublisher.js
api/bisma/cache.js
api/bisma/utils.js
scripts/publishTimeline.js
```

Implemented endpoints:

```text
GET /api/health
GET /api/bisma/status
POST /api/bisma/login
GET /api/bisma/costsheets
GET /api/bisma/costsheets/:costsheetId
GET /api/bisma/timeline
POST /api/bisma/sync
```

Live verification with local `.env` credentials succeeded:

```json
{
  "count": 94,
  "listCount": 94,
  "detailParsed": 94,
  "detailFailed": 0,
  "warningCount": 0
}
```

Backend safety notes:

- `.env.example` must keep credential values blank.
- `.env` is ignored and must remain local.
- Local development may call local `/api/bisma/*` endpoints when `VITE_TIMELINE_DATA_URL` is unset.
- Public GitHub Pages must read only the Supabase Storage JSON snapshot through `VITE_TIMELINE_DATA_URL`.
- Do not expose BISMA credentials, encrypted payloads, raw cookie headers, or raw HTML to the browser.
- Do not expose Supabase service role/secret keys to the browser or GitHub frontend variables.
- Backend logs should remain operational only, such as login success, list count, and detail parse counts.

### Current Public Deployment

The production/public workaround is:

```text
Local machine: BISMA login, crawl, parse, sanitize, publish
Supabase Storage: public latest timeline JSON snapshot
GitHub Pages: static React frontend reading the snapshot
```

The public frontend must not call BISMA or Vercel. It reads:

```text
https://eazsimhmrdsihwlpmjaf.supabase.co/storage/v1/object/public/bisma-timeline/timeline/latest.json
```

GitHub repository variable:

```text
VITE_TIMELINE_DATA_URL=https://eazsimhmrdsihwlpmjaf.supabase.co/storage/v1/object/public/bisma-timeline/timeline/latest.json
```

The old `VITE_API_BASE_URL` Vercel variable was removed from GitHub variables. Keep it unused unless deliberately restoring a separate backend deployment.

Public site:

```text
https://diperma.github.io/timeline-generator/
```

To refresh public data:

```text
npm run publish:timeline
```

This runs BISMA sync locally and overwrites:

```text
bisma-timeline/timeline/latest.json
```

After code changes, push to GitHub and run/re-run:

```text
.github/workflows/pages.yml
```

Current Supabase MCP setup:

```text
codex mcp add supabase --url https://mcp.supabase.com/mcp?project_ref=eazsimhmrdsihwlpmjaf
codex mcp login supabase
```

Supabase agent skills were installed locally:

```text
.agents/skills/supabase
.agents/skills/supabase-postgres-best-practices
```

Important security note: a Supabase secret was pasted into chat during setup. Rotate it in Supabase before relying on this app for production-sensitive data, then update local `.env` only.

### Completed Backend Tests

Current tests cover:

- public config does not expose secrets,
- credential validation before login,
- rupiah parsing,
- HP parsing from `jmlharidum`,
- BISMA member cost breakdown parsing,
- costsheet detail URL parsing,
- costsheet list row normalization,
- sample detail page member parsing,
- timeline payload adaptation,
- public snapshot sanitization and metadata,
- Supabase publish config validation,
- `trigger=All` list request,
- list caching,
- partial detail failure handling.

Run verification with:

```text
npm test
```

Expected current result:

```text
17 passing tests
```

### Completed Frontend

Frontend stack:

```text
Vite
React
TypeScript
Tailwind CSS v4
shadcn/ui radix-nova
lucide-react
cmdk via shadcn command component
```

Important frontend files:

```text
src/App.tsx
src/main.tsx
src/styles.css
src/types/bisma.ts
src/lib/bismaApi.ts
src/features/timeline/timelineEngine.ts
src/features/timeline/TimelineGrid.tsx
src/features/timeline/AssignmentDetail.tsx
src/components/ui/*
components.json
vite.config.ts
```

Current frontend behavior:

- If `VITE_TIMELINE_DATA_URL` is set, fetches timeline JSON from the public Supabase Storage snapshot.
- If `VITE_TIMELINE_DATA_URL` is unset, fetches timeline JSON from local `/api/bisma/timeline`.
- In Supabase snapshot mode, the header action is `Reload` and only reloads the JSON snapshot.
- In local backend mode, the header action is `Sync` and calls `/api/bisma/sync`.
- Displays metrics for assignment count, employee count, total HP, and total cost.
- Header badges include year, data cutoff (`Data diperoleh ...` from `obtainedAt`/`syncedAt`), and warning count.
- Shows three top tabs:
  - `Penugasan`
  - `Pegawai`
  - `Warnings`
- The tab control is above the table, not in a left-side panel.
- Filters are embedded in the active timeline table card header.
- Current filter row:

```text
Search | Status | Penugasan | Pegawai | Bulan
```

Filter details:

- `Status` and `Bulan` use normal shadcn selects.
- `Penugasan` is searchable with labels such as:

```text
No. 15 - 206316-1
```

- `Pegawai` is searchable by employee name.
- Filters combine with AND logic.
- If both `Pegawai` and `Bulan` are selected, filtering uses that selected employee's own member date range, not only the assignment/ST date range.
- Member rows with non-positive HP do not create timeline markers.
- Rows with zero/non-positive HP remain visible in the assignment detail sheet.

Timeline behavior:

- Default month is the current month from the runtime date.
- Month filtering uses overlap logic, not only start/end inside the month.
- Only the active tab builds its grid to avoid a heavy initial render.
- Timeline markers in the `Pegawai` tab are clickable and open the matching penugasan detail sheet.
- The current data has no expected multiple-assignment marker conflicts, so marker click opens the matching assignment directly.
- Empty cells are disabled and do not behave as buttons.

Detail sheet:

- Opens from a penugasan row or from a pegawai timeline marker.
- Uses a wider right-side sheet (`sm:max-w-[min(1200px,100vw)]`) so long roles and cost columns fit better.
- Shows ST/costsheet/status/source metadata.
- Shows member table with:

```text
Nama
Peran
Tanggal
HP
Kota
UANG HARIAN
PENGINAPAN
Taxi Bandara
Angkutan Laut
Transportasi Udara
Transportasi Darat
DLL
REPRESENTASI
JUMLAH
```

The detail table uses `member.costBreakdown.total` first and falls back to `member.totalCost`.

### Public Snapshot Shape

The public Supabase snapshot includes metadata:

```json
{
  "source": "bisma",
  "year": "2026",
  "syncedAt": "2026-05-22T07:42:04.145Z",
  "obtainedAt": "2026-05-22T07:42:04.145Z",
  "publishedAt": "2026-05-22T07:42:04.146Z",
  "dataStartDate": "2026-01-05",
  "dataEndDate": "2026-06-30",
  "publicSnapshot": true
}
```

The public sanitizer keeps:

- assignment metadata and total cost,
- member names, role, grade, dates, HP, active flag, cities,
- member `totalCost`,
- member `costBreakdown`.

The public sanitizer strips:

- `nip`,
- `noSpd`,
- BISMA cookies,
- credentials,
- encrypted login payloads,
- raw HTML,
- backend-only detail URLs.

Member cost breakdown shape:

```json
{
  "costBreakdown": {
    "dailyAllowance": 2150000,
    "lodging": 2980000,
    "airportTaxi": 862000,
    "seaTransport": 0,
    "airTransport": 5200000,
    "groundTransport": 0,
    "other": 0,
    "representation": 0,
    "total": 11192000
  },
  "totalCost": 11192000
}
```

BISMA field mapping:

```text
uangharianX      -> dailyAllowance / UANG HARIAN
uangpenginapanX  -> lodging / PENGINAPAN
uangtaxiX        -> airportTaxi / Taxi Bandara
uanglautX        -> seaTransport / Angkutan Laut
uangudaraX       -> airTransport / Transportasi Udara
uangdaratX       -> groundTransport / Transportasi Darat
uangdllX         -> other / DLL
uangrepX         -> representation / REPRESENTASI
totalX           -> total / JUMLAH
```

Known verified example after republish:

```text
costsheetId: 209485-1
assignment total: Rp 33.576.000
Yanti Manggarani: Rp 11.192.000
Rayhan Yuda Putra: Rp 11.192.000
Fauzan Rafif: Rp 11.192.000
Stefanus Hananto Radityo: Rp 0 in BISMA detail data
Luky Nurvita Santi: Rp 0 in BISMA detail data
```

### Favicon

The app has a simple `B` favicon:

```text
public/favicon.svg
```

`index.html` links it as:

```html
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
```

### Performance Notes

The live data spans approximately January through June and contains 94 assignments. Rendering all months, all assignment rows, and all employee rows at once made the browser heavy.

Current performance strategy:

- default to one month,
- render only the active tab,
- build assignment rows only for `Penugasan`,
- build employee rows only for `Pegawai`,
- skip timeline markers for member rows with `hp <= 0`,
- keep long filters searchable instead of requiring scroll through large select lists.

Do not revert these constraints without replacing them with virtualization or another explicit performance strategy.

### Local Development

Run backend:

```text
npm run dev:api
```

Run frontend:

```text
npm run dev:web
```

Current local URLs:

```text
Backend:  http://localhost:3000
Frontend: http://127.0.0.1:5173
```

The Vite dev server proxies `/api` to `http://127.0.0.1:3000`.

Build verification:

```text
npm test
npm run build
```

Current expected result:

```text
Node tests pass
TypeScript build passes
Vite production build passes
```

### Installed Project Skill

The shadcn/ui skill was installed locally into:

```text
.agents/skills/shadcn
```

Restart Codex/Antigravity if the skill is not picked up in a new session.

Use the shadcn CLI for future UI components. Current shadcn config is in:

```text
components.json
```

Current shadcn components include:

```text
alert
badge
button
card
command
dialog
input
input-group
popover
scroll-area
select
separator
sheet
skeleton
table
tabs
textarea
tooltip
```
