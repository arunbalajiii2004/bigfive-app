"""Inference engine.

Works with the v2 export (ensemble.onnx + artifacts_v2.json: calibrated 90% intervals, soft GMM
memberships, "confident enough" rule) and falls back to the v1 export (model.onnx + artifacts.json:
point estimates only) if the v2 files are not present.
"""
import json, math, os
from pathlib import Path
import numpy as np
import onnxruntime as ort

Z90 = 1.6448536269514722


def _phi(z: float) -> float:
    return 0.5 * (1 + math.erf(z / math.sqrt(2)))


class Engine:
    def __init__(self, model_dir):
        d = Path(model_dir)
        self.v2 = (d / "artifacts_v2.json").exists() and (d / "ensemble.onnx").exists()
        self.art = a = json.loads((d / ("artifacts_v2.json" if self.v2 else "artifacts.json")).read_text())
        self.sess = ort.InferenceSession(str(d / ("ensemble.onnx" if self.v2 else "model.onnx")),
                                         providers=["CPUExecutionProvider"])
        self.items, self.traits = a["items"], a["traits"]
        self.idx = {it: i for i, it in enumerate(self.items)}
        self.rev = set(a["reverse_scored_items"])
        self.mu = np.array(a["target_mean"], dtype=np.float32)
        self.sd = np.array(a["target_std"], dtype=np.float32)
        self.order = a["greedy_question_order"]
        self.text = a.get("question_text", {})
        self.segments = a["segments"]
        self.centers = np.array([s["center_raw"] for s in self.segments], dtype=np.float32)

        # accuracy curve for the quality indicator
        curve, self.accuracy_basis = (a["greedy_r2_by_k"], "greedy") if a.get("greedy_r2_by_k") \
            else (a.get("test_r2_by_k", {}), "random")
        pts = sorted((int(k), float(v)) for k, v in curve.items())
        self._acc_k, self._acc_r2 = [p[0] for p in pts], [p[1] for p in pts]

        # calibration of the interval widths
        cal = a.get("calibration") or {}
        self._cal_k, self._cal_s = cal.get("k", []), cal.get("scale", [])

        # "confident enough" threshold (score points). The artifact stores the value tuned for the RL policy;
        # the static question order used by the app was tuned to 0.625 in the notebook, so that is the default.
        self.tau = float(os.getenv("STOP_TAU", 0.625)) if self.v2 else None
        self.min_q = int((a.get("stopping") or {}).get("min_questions", 5))

        # Gaussian mixture for soft segment memberships
        g = a.get("segments_gmm")
        self.gmm = None
        if g:
            self.gmm = {"w": np.array(g["weights"]), "mu": np.array(g["means_raw"]), "S": np.array(g["covariances_raw"])}

    # ---------------------------------------------------------------- encoding / model
    def question_text(self, item):
        return self.text.get(item, item)

    def _encode(self, answers):
        vals = np.zeros(len(self.items), dtype=np.float32)
        mask = np.zeros(len(self.items), dtype=np.float32)
        for item, v in answers:
            i = self.idx[item]
            v = float(v)
            if item in self.rev:
                v = 6 - v
            vals[i] = (v - 3.0) / 2.0
            mask[i] = 1.0
        return vals, mask

    def _run_z(self, vals, mask):
        x = np.concatenate([vals * mask, mask], axis=1).astype(np.float32)
        out = self.sess.run(None, {"x": x})
        return out[0], (out[1] if len(out) > 1 else None)

    def _scale(self, k):
        return float(np.interp(k, self._cal_k, self._cal_s)) if self._cal_k else 1.0

    # ---------------------------------------------------------------- public API
    def estimate_full(self, answers):
        """Trait estimates for a list of (item, value). Intervals are None for a v1 export."""
        n = len(answers)
        v, m = self._encode(answers)
        mean_z, std_z = self._run_z(v[None], m[None])
        raw = np.clip(mean_z[0] * self.sd + self.mu, 1.0, 5.0)
        out = {"n": n, "raw": raw, "sd": None, "lo": None, "hi": None, "hw": None,
               "mean_hw": None, "max_hw": None, "confident": False}
        if std_z is not None:
            sd_raw = std_z[0] * self._scale(n) * self.sd          # calibrated 1-sigma, in score points
            hw = Z90 * sd_raw
            out.update(sd=sd_raw, hw=hw, lo=np.clip(raw - hw, 1, 5), hi=np.clip(raw + hw, 1, 5),
                       mean_hw=float(hw.mean()), max_hw=float(hw.max()),
                       confident=bool(n >= self.min_q and hw.max() <= self.tau))
        return out

    def estimate(self, answers):
        return self.estimate_full(answers)["raw"]

    def percentiles(self, raw):
        z = (np.asarray(raw) - self.mu) / self.sd
        return [round(100 * _phi(float(x)), 1) for x in z]

    def memberships(self, raw, sd_raw=None):
        """Posterior probability of each segment. When the estimate is uncertain its error is added to each
        component's covariance, so memberships flatten out early in the quiz instead of looking falsely sure."""
        if self.gmm is None:
            d = ((self.centers - np.asarray(raw)[None]) ** 2).sum(1)
            p = np.zeros(len(d)); p[int(d.argmin())] = 1.0
            return p
        x = np.asarray(raw, dtype=float)
        extra = np.diag(np.asarray(sd_raw, dtype=float) ** 2) if sd_raw is not None else 0.0
        logp = []
        for w, mu, S in zip(self.gmm["w"], self.gmm["mu"], self.gmm["S"]):
            C = S + extra
            diff = x - mu
            _, logdet = np.linalg.slogdet(C)
            logp.append(math.log(w) - 0.5 * (logdet + diff @ np.linalg.solve(C, diff) + len(x) * math.log(2 * math.pi)))
        logp = np.array(logp)
        p = np.exp(logp - logp.max())
        return p / p.sum()

    def segment_from_memberships(self, p):
        order = np.argsort(-p)
        return int(order[0]), int(order[1])

    def next_item(self, n_answered):
        return self.order[n_answered] if n_answered < len(self.order) else None

    def accuracy(self, k):
        return float(np.interp(k, self._acc_k, self._acc_r2)) if self._acc_k else None

    def trajectory(self, answers):
        """Estimates (and widest interval) after 1, 2, ... n answers, to show the estimate settling."""
        n = len(answers)
        V = np.zeros((n, len(self.items)), np.float32)
        M = np.zeros_like(V)
        for j in range(n):
            V[j], M[j] = self._encode(answers[: j + 1])
        mean_z, std_z = self._run_z(V, M)
        raw = np.clip(mean_z * self.sd + self.mu, 1.0, 5.0)
        hw = None
        if std_z is not None:
            sc = np.array([self._scale(k) for k in range(1, n + 1)])[:, None]
            hw = (Z90 * std_z * sc * self.sd).max(1)
        return raw, hw

    def explain(self, answers):
        """Leave-one-out: how far each trait estimate moves when one answer is removed."""
        n = len(answers)
        if n < 3:
            return {t: [] for t in self.traits}
        V, M = [], []
        v, m = self._encode(answers); V.append(v); M.append(m)
        for j in range(n):
            v, m = self._encode(answers[:j] + answers[j + 1:]); V.append(v); M.append(m)
        mean_z, _ = self._run_z(np.array(V), np.array(M))
        P = np.clip(mean_z * self.sd + self.mu, 1.0, 5.0)
        contrib = P[0][None] - P[1:]
        out = {}
        for ti, t in enumerate(self.traits):
            rows = [{"item": it, "text": self.question_text(it), "answer": int(val),
                     "contribution": round(float(contrib[j, ti]), 4)} for j, (it, val) in enumerate(answers)]
            rows.sort(key=lambda r: -abs(r["contribution"]))
            out[t] = rows
        return out
