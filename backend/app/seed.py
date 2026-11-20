"""Generate clearly-labelled DEMO sessions so the admin dashboard has something to show."""
import time, uuid
import numpy as np
from . import db


def seed_demo(engine, n=500, seed=0):
    rng = np.random.default_rng(seed)
    now = time.time()
    weights = np.array([s["share"] for s in engine.segments], dtype=float)
    weights /= weights.sum()
    n_done = 0
    for _ in range(n):
        seg = int(rng.choice(len(weights), p=weights))
        profile = np.clip(engine.centers[seg] + rng.normal(0, 0.45, 5), 1, 5)
        t0 = now - rng.random() * 30 * 86400
        sid = "demo-" + uuid.uuid4().hex[:12]
        db.create_session(sid, demo=True, ts=t0)

        # how far this person gets
        r = rng.random()
        if r < 0.22:
            stop = int(rng.integers(1, 5))            # drops off very early
        elif r < 0.30:
            stop = int(rng.integers(5, 15))           # finishes early
        else:
            stop = int(rng.choice([15, 20, 25], p=[0.6, 0.25, 0.15]))
        answers = []
        for pos in range(1, stop + 1):
            item = engine.order[pos - 1]
            ti = engine.traits.index(item[:3])
            oriented = int(np.clip(round(profile[ti] + rng.normal(0, 0.8)), 1, 5))
            raw = 6 - oriented if item in engine.rev else oriented
            answers.append((item, raw))
            db.add_answer(sid, pos, item, raw, ts=t0 + pos * 6)
        if stop >= 5:
            est = engine.estimate_full(answers)
            seg_id, _ = engine.segment_from_memberships(engine.memberships(est["raw"], est["sd"]))
            db.finish_session(sid, stop, seg_id, {t: float(est["raw"][i]) for i, t in enumerate(engine.traits)},
                              ts=t0 + stop * 6 + 5, half_width=est["mean_hw"], confident=est["confident"])
            n_done += 1
    return {"created": n, "completed": n_done}
