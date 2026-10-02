# DreamF1 frontend

Next.js 16 (App Router), React 19 and Tailwind CSS v4, deployed on Vercel at [dream-f1.vercel.app](https://dream-f1.vercel.app).

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

No backend needed. With `DEMO_MODE` unset, every `/api/*` call is answered from the JSON snapshots in `demo-data/`, and any username signs in. To use a running backend instead, put `DEMO_MODE=false` and `API_URL=http://localhost:8080` in `.env.local`. Every variable is listed in the repo's [`.env.example`](../.env.example).

## Where things are

| Path | What's there |
|---|---|
| `app/` | One folder per page: `dashboard`, `telemetry`, `compare`, `standings`, `predict`, `predictions` (My picks), `circles`, `login`, `register` |
| `app/api/[...path]/route.ts` | Every browser `/api/*` call. Forwards to the backend, or serves the snapshots in demo mode |
| `components/` | Shared UI: nav, footer, start lights, driver portraits and picker, track map, podium |
| `lib/` | Data helpers (`f1.ts`, `design.ts`, `circuits.ts`, `standings.ts`, `demo.ts`) and hooks (`auth.ts`, `useNow.ts`, `useWidth.ts`) |
| `demo-data/` | Snapshots written by `backend/scripts/snapshot_demo.py` |
| `public/` | Fonts, driver and car images, team logos, circuit diagrams |

## Design system

Tokens and component classes live in `app/globals.css`; fonts are loaded in `app/layout.tsx`.

- **Type:** Hubot Sans for headings (its width axis gives the wide display cut), Mona Sans for body text, and the Formula1 typeface (`.timing`) for times, driver codes and numbers.
- **Colour:** OKLCH tokens such as `f1-red`, `surface-0` to `surface-3` and `text-primary` to `text-dim`. Team colours are in `lib/design.ts`.
- **Layout:** ruled sections and real tables instead of cards. Wide tables scroll sideways on phones with the first column pinned. The few framed elements share one mixed corner radius (`.corner`).
- **Charts** are hand-built SVG. They measure their container (`lib/useWidth.ts`) and draw in real pixels, so text stays readable at any width.

## Checks

```bash
npm run lint
npx tsc --noEmit
npm run build
```

CI runs `npm run build` on every push.
