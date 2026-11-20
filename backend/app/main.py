import hmac, os, secrets, time, uuid
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from . import db
from .engine import Engine
from .playbook import TRAIT_NAMES, segment_card
from .seed import seed_demo

ROOT = Path(__file__).resolve().parents[1]
MODEL_DIR = Path(os.getenv("MODEL_DIR", ROOT / "models"))
DB_PATH = os.getenv("DB_PATH", str(ROOT / "data" / "app.db"))
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")
FRONTEND_DIST = Path(os.getenv("FRONTEND_DIST", ROOT.parent / "frontend" / "dist"))
MIN_Q, DEFAULT_Q = 5, 15

engine: Engine = None
LIVE = {}            # session id -> {"answers": [(item, value)], "consent": bool, "created": ts, "finalized": bool}
TOKENS = {}          # admin token -> expiry


@asynccontextmanager
async def lifespan(_app):
    global engine
    engine = Engine(MODEL_DIR)
    db.init(DB_PATH)
    if ADMIN_PASSWORD == "admin123":
        print("WARNING: using the default admin password. Set ADMIN_PASSWORD before deploying.")
    yield


app = FastAPI(title="Big-Five Short Test API", version="2.1.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
                   allow_methods=["*"], allow_headers=["*"])

# ------------------------------------------------------------------ helpers
def _question(item, index):
    return {"item": item, "text": engine.question_text(item), "index": index, "total": len(engine.order)}


def _traits_payload(est):
    """est: dict from Engine.estimate_full"""
    raw = est["raw"]
    pct = engine.percentiles(raw)
    lo_p = engine.percentiles(est["lo"]) if est["lo"] is not None else None
    hi_p = engine.percentiles(est["hi"]) if est["hi"] is not None else None
    out = []
    for i, t in enumerate(engine.traits):
        row = {"code": t, "name": TRAIT_NAMES[t], "score": round(float(raw[i]), 2), "percentile": pct[i]}
        if est["lo"] is not None:
            row.update(lo=round(float(est["lo"][i]), 2), hi=round(float(est["hi"][i]), 2),
                       half_width=round(float(est["hw"][i]), 2), pct_lo=lo_p[i], pct_hi=hi_p[i])
        out.append(row)
    return out


def _snapshot(s):
    """Live numbers for a session: estimate, accuracy, confidence flag."""
    n = len(s["answers"])
    est = engine.estimate_full(s["answers"]) if n >= 3 else None
    nxt = engine.next_item(n)
    return {
        "answered": n,
        "estimate": _traits_payload(est) if est else None,
        "uncertainty": est["mean_hw"] if est else None,
        "confident": bool(est and est["confident"]),
        "accuracy": engine.accuracy(n) if n else None,
        "next_question": _question(nxt, n + 1) if nxt else None,
        "can_finish": n >= MIN_Q,
        "reached_default": n >= DEFAULT_Q,
    }, est


def _live(sid):
    s = LIVE.get(sid)
    if not s:
        raise HTTPException(404, "Session not found (it may have expired). Please start again.")
    return s


def _cleanup():
    cutoff = time.time() - 6 * 3600
    for k in [k for k, v in LIVE.items() if v["created"] < cutoff]:
        del LIVE[k]


# ------------------------------------------------------------------ public API
class StartBody(BaseModel):
    consent: bool = False


class AnswerBody(BaseModel):
    item: str
    value: int = Field(ge=1, le=5)


@app.get("/api/health")
def health():
    return {"ok": True}


@app.get("/api/config")
def config():
    return {
        "traits": [{"code": t, "name": TRAIT_NAMES[t]} for t in engine.traits],
        "limits": {"min": MIN_Q, "default": DEFAULT_Q, "max": len(engine.order)},
        "scale": ["Disagree", "Slightly disagree", "Neutral", "Slightly agree", "Agree"],
        "accuracy_basis": engine.accuracy_basis,
        "intervals": engine.v2,
        "stopping": {"tau": engine.tau, "min": MIN_Q} if engine.v2 else None,
        "order": [{"item": it, "text": engine.question_text(it)} for it in engine.order],
        "segments": [segment_card(s, engine.traits) for s in engine.segments],
    }


@app.post("/api/session")
def start(body: StartBody):
    _cleanup()
    sid = uuid.uuid4().hex[:16]
    LIVE[sid] = {"answers": [], "consent": body.consent, "created": time.time(), "finalized": False}
    if body.consent:
        db.create_session(sid)
    return {"session_id": sid, "question": _question(engine.order[0], 1)}


@app.post("/api/session/{sid}/answer")
def answer(sid: str, body: AnswerBody):
    s = _live(sid)
    n = len(s["answers"])
    expected = engine.next_item(n)
    if expected is None:
        raise HTTPException(400, "All questions have been answered.")
    if body.item != expected:
        raise HTTPException(400, f"Expected an answer for {expected}.")
    s["answers"].append((body.item, body.value))
    n += 1
    if s["consent"]:
        db.add_answer(sid, n, body.item, body.value)
    snap, _ = _snapshot(s)
    return snap


@app.get("/api/session/{sid}")
def session_state(sid: str):
    snap, _ = _snapshot(_live(sid))
    return snap


@app.get("/api/session/{sid}/result")
def result(sid: str):
    s = _live(sid)
    answers = s["answers"]
    n = len(answers)
    if n < MIN_Q:
        raise HTTPException(400, f"Answer at least {MIN_Q} questions to see a result.")
    est = engine.estimate_full(answers)
    mem = engine.memberships(est["raw"], est["sd"])
    seg_id, runner = engine.segment_from_memberships(mem)
    cards = [segment_card(x, engine.traits) for x in engine.segments]
    if s["consent"] and not s["finalized"]:
        db.finish_session(sid, n, seg_id, {t: float(est["raw"][i]) for i, t in enumerate(engine.traits)},
                          half_width=est["mean_hw"], confident=est["confident"])
    s["finalized"] = True
    traj, hw = engine.trajectory(answers)
    return {
        "n_answers": n,
        "max_questions": len(engine.order),
        "stored": s["consent"],
        "traits": _traits_payload(est),
        "intervals": engine.v2,
        "confident": est["confident"],
        "tau": engine.tau,
        "uncertainty": est["mean_hw"],
        "segment": cards[seg_id],
        "memberships": sorted(({"id": i, "name": cards[i]["name"], "p": round(float(mem[i]), 4)}
                               for i in range(len(cards))), key=lambda r: -r["p"]),
        "runner_up": {"id": runner, "name": cards[runner]["name"]},
        "accuracy": {"r2": engine.accuracy(n), "basis": engine.accuracy_basis},
        "trajectory": [{"n": j + 1, **{t: round(float(traj[j, i]), 3) for i, t in enumerate(engine.traits)},
                        **({"hw": round(float(hw[j]), 3)} if hw is not None else {})} for j in range(n)],
        "explanation": engine.explain(answers),
    }


# ------------------------------------------------------------------ admin
class LoginBody(BaseModel):
    password: str


class SeedBody(BaseModel):
    n: int = Field(default=500, ge=1, le=5000)


def admin_required(authorization: Optional[str] = Header(default=None)):
    token = (authorization or "").removeprefix("Bearer ").strip()
    exp = TOKENS.get(token)
    if not exp or exp < time.time():
        raise HTTPException(401, "Admin login required.")
    return token


@app.post("/api/admin/login")
def admin_login(body: LoginBody):
    if not hmac.compare_digest(body.password.encode(), ADMIN_PASSWORD.encode()):
        raise HTTPException(401, "Wrong password.")
    token = secrets.token_urlsafe(32)
    TOKENS[token] = time.time() + 8 * 3600
    return {"token": token}


@app.get("/api/admin/stats")
def admin_stats(include_demo: bool = True, _=Depends(admin_required)):
    st = db.stats(include_demo, n_segments=len(engine.segments), trait_codes=tuple(engine.traits),
                  max_q=len(engine.order))
    segs = []
    done = max(1, st["completed"])
    for i, s in enumerate(engine.segments):
        card = segment_card(s, engine.traits)
        card["count"] = st["segment_counts"][i]
        card["observed_share"] = round(st["segment_counts"][i] / done, 3)
        card["avg_traits"] = st["segment_avg_traits"][i]
        segs.append(card)
    st["segments"] = segs
    st["traits"] = [{"code": t, "name": TRAIT_NAMES[t]} for t in engine.traits]
    return st


@app.post("/api/admin/seed")
def admin_seed(body: SeedBody, _=Depends(admin_required)):
    return seed_demo(engine, body.n)


@app.delete("/api/admin/demo")
def admin_clear_demo(_=Depends(admin_required)):
    db.clear_demo()
    return {"cleared": True}


# ------------------------------------------------------------------ serve the built React app
if FRONTEND_DIST.exists():
    if (FRONTEND_DIST / "assets").exists():
        app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

    @app.get("/{full_path:path}")
    def spa(full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(404)
        f = FRONTEND_DIST / full_path
        return FileResponse(f if f.is_file() else FRONTEND_DIST / "index.html")
