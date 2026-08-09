# Bruit

Map app for reporting loud noise and viewing a noise-pollution heatmap.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- MapLibre GL + OpenFreeMap (OpenStreetMap) tiles
- Supabase Postgres (`noise_reports` + `create_noise_report` RPC)

## Features

- Full-bleed map with heatmap of recent reports (last 7 days)
- Apple Maps–style light basemap (Carto Positron) and frosted chrome
- Report drawer for **type** + **how loud** before submitting
- One report every **30 minutes** per device (`localStorage` device ID)
- Server-side cooldown in Postgres (direct inserts are revoked)

## Setup

### 1. Install

```bash
npm install
```

### 2. Create a dedicated Supabase project

Create a **new** project named e.g. `bruit` in the [Supabase dashboard](https://supabase.com/dashboard).  
Do **not** reuse an existing project that already has other app tables.

Copy the project URL and **publishable** key into `.env.local`:

```bash
cp .env.example .env.local
```

Use `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (Supabase’s current client key name).

### 3. Apply the migrations

In the Supabase SQL editor for the Bruit project, run in order:

1. [`supabase/migrations/0001_noise_reports.sql`](supabase/migrations/0001_noise_reports.sql)
2. [`supabase/migrations/0002_report_details.sql`](supabase/migrations/0002_report_details.sql)

Or with the CLI linked to the Bruit project:

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Allow location when prompted, tap **Report a Noise**, pick a type and loudness, then submit.

## Rate limit note

Cooldown identity is a UUID in `localStorage` (`bruit_device_id`). Clearing site data or using another browser bypasses it. That is acceptable for this scaffold; the RPC still enforces 30 minutes per `device_id` value.

## Map tiles

Default style: Carto Positron (`basemaps.cartocdn.com`) — light, Apple Maps–adjacent OSM basemap, no API key. Swap `MAP_STYLE_URL` in `lib/constants.ts` if needed.

## Scripts

| Command        | Description        |
|----------------|--------------------|
| `npm run dev`  | Local development  |
| `npm run build`| Production build   |
| `npm run start`| Serve production   |
| `npm run lint` | ESLint             |
