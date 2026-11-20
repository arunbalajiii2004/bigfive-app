# Short Big-Five test v2: FastAPI + React

Version 2. Short personality questionnaire powered by the models trained in `bigfive_training.ipynb` and `bigfive_advanced.ipynb`
(ensemble with calibrated intervals, soft segment memberships), with a faster, smoother frontend.

```
backend/   FastAPI + ONNX Runtime + SQLite (sessions, results, explanations, admin stats)
frontend/  React + Vite + Tailwind + Recharts (quiz, results with "why" chart, admin dashboard)
```

## 1. Put the model artifacts in place
Copy these files from Google Drive (`BigFive/artifacts_v2`) into `backend/models/`:
`ensemble.onnx`, `artifacts_v2.json`, `test_cases_v2.json`.
(`policy.onnx` is not used: the RL agent did not beat the fixed greedy order.)

If those files are absent the app falls back to the older single-model export
(`model.onnx`, `artifacts.json`) and simply shows no intervals.

## 2. Run the backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python tests/check_parity.py                            # should print 'export version: v2' and tiny diffs
ADMIN_PASSWORD=choose-something uvicorn app.main:app --reload --port 8000
```
API docs: http://localhost:8000/docs

## 3. Run the frontend
Development (hot reload, proxies /api to port 8000):
```bash
cd frontend && npm install && npm run dev     # http://localhost:5173
```
Production build (FastAPI then serves the React app itself on port 8000):
```bash
cd frontend && npm run build
```

## 4. Admin
Open `/admin`, log in with `ADMIN_PASSWORD` (default `admin123`: change it). Use
"Seed 500 demo sessions" to fill the dashboard with clearly-labelled simulated sessions; untick
"Include demo data" to see only real ones.

## Environment variables
| Variable | Default | Purpose |
|---|---|---|
| `ADMIN_PASSWORD` | `admin123` | admin login |
| `STOP_TAU` | `0.625` | "precise enough" threshold: widest 90% range, in score points |
| `MODEL_DIR` | `backend/models` | where model.onnx / artifacts.json live |
| `DB_PATH` | `backend/data/app.db` | SQLite file |
| `FRONTEND_DIST` | `frontend/dist` | built React app to serve |
| `VITE_API_URL` | empty | API base URL if the frontend is hosted separately |

## What the app shows
- Quiz: the next question appears instantly (the order is loaded once; answers are sent in the background), keyboard shortcuts 1-5,
  live estimate with a 90% range around every score, and a "precise enough" banner when every range is under `STOP_TAU`.
- Results: scores with ranges, percentile radar with dashed range lines, soft segment memberships, the "why" chart (animated, per trait),
  how the estimate and the uncertainty settled, and a button to answer more questions.
- Admin: sessions, completion, drop-off, segment sizes and playbook, average uncertainty, share of sessions that ended precise,
  uncertainty vs questions answered.
- Look and feel (2.1): Apple-style glass. A floating pill nav bar (a tab bar at the bottom on phones), frosted glass cards over a soft
  animated colour field, large titles that shrink into a small chip in the nav bar, a "Dynamic Island" style notice in the quiz,
  Fitness-style rings on the results page (with a Bars toggle) and a bento layout. Dark mode follows the system setting; animations
  respect "reduce motion" and panels turn solid for "reduce transparency".
- To tune the look, edit the tokens at the top of `frontend/src/index.css` (`--glass-blur`, `--glass-bg`, `--radius-card`, the colour blobs).

## How it works
- The quiz asks questions in the fixed greedy order from the notebook (most informative first).
- After every answer the API re-runs the ONNX model on the answers so far; unanswered items are masked.
- Reverse-scoring and scaling happen in `backend/app/engine.py` and must stay identical to the notebook.
- Intervals: the 5-network ensemble returns a mean and a standard deviation; the std is multiplied by the calibration factor for the
  current number of answers (from `artifacts_v2.json`) and turned into a 90% range.
- Soft segments: Gaussian-mixture posteriors computed from the estimated scores, with the estimate's own uncertainty added to each
  component's covariance, so memberships are flat early in the quiz and sharpen as answers come in.
- The "why" chart is leave-one-out: re-predict with one answer removed and measure how far each trait estimate moves.
- Segments: nearest KMeans centre (raw 1-5 scale) to the estimated trait scores.
- Only sessions with consent are written to SQLite. Non-consenting sessions live in memory for up to 6 hours.

## Deploying
Any host that runs a Python web process works (Render, Railway, Fly.io, Hugging Face Spaces with Docker).
Build: `cd frontend && npm install && npm run build && cd ../backend && pip install -r requirements.txt`.
Start: `cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
Free tiers usually have an ephemeral disk, so the SQLite file resets on redeploy; use the demo seeding for presentations
or point `DB_PATH` at a persistent volume.

## Known limits
- Live sessions are held in memory: a server restart loses in-progress quizzes (a page reload mid-quiz is fine).
- Percentiles use a normal approximation from the training mean and standard deviation.
- Leave-one-out explanations describe the model, not the person, and are not additive.
