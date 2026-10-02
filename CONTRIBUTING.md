# Contributing to DreamF1

Thanks for considering a contribution — no PR is too small, and bug reports are just as valuable as code.

## Quick start

1. Fork the repo and clone it
2. Follow the [Quick Start](README.md#quick-start) in the README to get the app running locally (Docker one-liner, or backend/frontend separately). For frontend-only work you don't need the backend: with `DEMO_MODE` unset, `npm run dev` serves the real-data snapshots in `frontend/demo-data/`.
3. Create a branch off `main`: `git checkout -b feature/your-feature`
4. Make your changes
5. Open a PR — describe what changed and why

For bugs, open an [issue](https://github.com/AabhasK/DreamF1/issues) first if you're not fixing it yourself. For bigger ideas, open an issue or start a discussion before sinking a lot of time in — especially anything touching prediction scoring, since the rules have some subtlety (see Golden Rules below).

## Where to start

- Issues labeled [`good first issue`](https://github.com/AabhasK/DreamF1/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) are scoped to be self-contained and don't require deep familiarity with the codebase.
- The README's [project structure](README.md#project-structure) shows where things live. Backend routes are one module per area in `backend/app/routers/`; each frontend page is a folder in `frontend/app/`, and [`frontend/README.md`](frontend/README.md) covers the frontend layout and design system.

## Stack

- **Frontend** (`frontend/`) — Next.js 16 (App Router), Tailwind CSS v4
- **Backend** (`backend/`) — FastAPI, SQLModel/SQLAlchemy, PostgreSQL
- **Data** — [FastF1](https://docs.fastf1.dev/) for real session/telemetry data — all real 2026 results, no mocks
- **Prototype** (`frontend-prototype/`) — Streamlit reference build, kept for comparison, not the primary frontend

## The 4 golden rules of prediction logic

These are load-bearing — breaking them breaks the game for everyone using it:

1. **Strictly next race** — `POST /api/predict` never accepts an `event_id`; it always locks to the next unscored race. No race picker in the UI.
2. **Only 3-letter driver codes** — all driver inputs come from the hardcoded 22-driver dropdown list (`frontend/lib/design.ts`). No free text, ever.
3. **`is_completed` is not a UI signal** — it only flips after an admin manually triggers scoring (`POST /api/score/{event_id}`). Frontend "is this race done" logic must compare `event_date`, not read `is_completed`.
4. **Optional fields stay optional** — `dnf_driver`, `fourth_place`, `fifth_place`, `safety_car` are never required to submit a prediction.

On the backend, rule 1 is enforced in `submit_prediction` (`backend/app/routers/predictions.py`), and the optional fields of rule 4 are defined in `backend/app/models.py`.

## Code style

- Match the existing patterns in the file you're editing before introducing a new one. On the frontend that means the tokens and classes in `frontend/app/globals.css` (Hubot Sans, Mona Sans and the F1 timing face; ruled layouts and tables rather than cards). On the backend, FastAPI + SQLModel conventions.
- Check UI changes on a phone-width screen (375px) as well as desktop.
- Don't add abstractions, config flags, or "just in case" error handling for scenarios that can't happen — keep changes scoped to what the issue actually asks for.
- Run the existing test suite (`cd backend && uv run pytest tests/ -v`) and the frontend checks (`cd frontend && npm run lint && npm run build`) before opening a PR.

## Questions

Open an issue with the `question` label, or comment on the relevant existing issue. Happy to talk through design decisions before you start.
