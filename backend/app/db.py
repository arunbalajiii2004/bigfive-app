"""SQLite storage. Only sessions whose owner gave consent are ever written here."""
import json, sqlite3, threading, time, datetime as dt
from contextlib import contextmanager
from pathlib import Path

_lock = threading.Lock()
_conn = None


def init(path):
    global _conn
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    _conn = sqlite3.connect(path, check_same_thread=False)
    _conn.row_factory = sqlite3.Row
    with _tx() as c:
        c.executescript("""
        CREATE TABLE IF NOT EXISTS sessions(
            id TEXT PRIMARY KEY, created_at REAL, finished_at REAL, n_answers INTEGER DEFAULT 0,
            completed INTEGER DEFAULT 0, segment INTEGER, traits TEXT, demo INTEGER DEFAULT 0,
            half_width REAL, confident INTEGER);
        CREATE TABLE IF NOT EXISTS answers(
            session_id TEXT, pos INTEGER, item TEXT, value INTEGER, ts REAL);
        CREATE INDEX IF NOT EXISTS ix_answers_s ON answers(session_id);
        """)
        cols = {r["name"] for r in c.execute("PRAGMA table_info(sessions)")}
        for col, typ in (("half_width", "REAL"), ("confident", "INTEGER")):     # older databases
            if col not in cols:
                c.execute(f"ALTER TABLE sessions ADD COLUMN {col} {typ}")


@contextmanager
def _tx():
    with _lock:
        try:
            yield _conn
            _conn.commit()
        except Exception:
            _conn.rollback()
            raise


def create_session(sid, demo=False, ts=None):
    with _tx() as c:
        c.execute("INSERT INTO sessions(id, created_at, demo) VALUES (?,?,?)", (sid, ts or time.time(), int(demo)))


def add_answer(sid, pos, item, value, ts=None):
    with _tx() as c:
        c.execute("INSERT INTO answers VALUES (?,?,?,?,?)", (sid, pos, item, value, ts or time.time()))
        c.execute("UPDATE sessions SET n_answers=? WHERE id=?", (pos, sid))


def finish_session(sid, n, segment, traits, ts=None, half_width=None, confident=None):
    with _tx() as c:
        c.execute("UPDATE sessions SET completed=1, finished_at=?, n_answers=?, segment=?, traits=?, half_width=?, confident=? WHERE id=?",
                  (ts or time.time(), n, segment, json.dumps(traits), half_width,
                   None if confident is None else int(confident), sid))


def clear_demo():
    with _tx() as c:
        c.execute("DELETE FROM answers WHERE session_id IN (SELECT id FROM sessions WHERE demo=1)")
        c.execute("DELETE FROM sessions WHERE demo=1")


def stats(include_demo=True, n_segments=5, trait_codes=("EXT", "EST", "AGR", "CSN", "OPN"), max_q=25):
    where = "" if include_demo else "WHERE demo=0"
    with _lock:
        sess = [dict(r) for r in _conn.execute(f"SELECT * FROM sessions {where}")]
        ids = {s["id"] for s in sess}
        funnel_rows = _conn.execute(
            "SELECT pos, COUNT(DISTINCT session_id) n FROM answers GROUP BY pos ORDER BY pos").fetchall()
        # restrict funnel to the sessions we are counting
        if not include_demo:
            funnel_rows = _conn.execute(
                "SELECT a.pos, COUNT(DISTINCT a.session_id) n FROM answers a JOIN sessions s ON s.id=a.session_id "
                "WHERE s.demo=0 GROUP BY a.pos ORDER BY a.pos").fetchall()
    total = len(sess)
    done = [s for s in sess if s["completed"]]
    started = sum(1 for s in sess if s["n_answers"] > 0)
    # funnel: sessions that reached at least question `pos`
    reached = {r["pos"]: r["n"] for r in funnel_rows}
    funnel = [{"question": p, "sessions": reached.get(p, 0)} for p in range(1, max_q + 1)]

    seg_counts = [0] * n_segments
    seg_traits = [[[] for _ in trait_codes] for _ in range(n_segments)]
    hist = {t: [0] * 8 for t in trait_codes}     # bins of width 0.5 from 1.0 to 5.0
    by_day = {}
    for s in done:
        tr = json.loads(s["traits"])
        seg = s["segment"]
        seg_counts[seg] += 1
        for i, t in enumerate(trait_codes):
            seg_traits[seg][i].append(tr[t])
            b = min(7, int((tr[t] - 1.0) / 0.5))
            hist[t][b] += 1
    for s in sess:
        day = dt.datetime.fromtimestamp(s["created_at"], dt.timezone.utc).strftime("%Y-%m-%d")
        d = by_day.setdefault(day, {"date": day, "started": 0, "completed": 0})
        d["started"] += 1
        d["completed"] += int(bool(s["completed"]))
    avg = lambda xs: round(sum(xs) / len(xs), 3) if xs else None
    with_hw = [s for s in done if s["half_width"] is not None]
    hw_by_n = {}
    for s in with_hw:
        hw_by_n.setdefault(s["n_answers"], []).append(s["half_width"])
    conf = [s for s in done if s["confident"] is not None]
    return {
        "avg_half_width": avg([s["half_width"] for s in with_hw]),
        "confident_share": round(sum(s["confident"] for s in conf) / len(conf), 3) if conf else None,
        "hw_by_n": [{"n": n_, "avg_half_width": avg(v), "sessions": len(v)} for n_, v in sorted(hw_by_n.items())],
        "total_sessions": total,
        "started": started,
        "completed": len(done),
        "completion_rate": round(len(done) / total, 3) if total else 0,
        "avg_questions": avg([s["n_answers"] for s in done]),
        "segment_counts": seg_counts,
        "segment_avg_traits": [[avg(xs) for xs in seg] for seg in seg_traits],
        "trait_hist": [{"bin": f"{1 + 0.5 * i:.1f}", **{t: hist[t][i] for t in trait_codes}} for i in range(8)],
        "funnel": funnel,
        "daily": [by_day[k] for k in sorted(by_day)],
        "demo_sessions": sum(1 for s in sess if s["demo"]),
    }
