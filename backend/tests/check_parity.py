"""Run from backend/:  python tests/check_parity.py
Confirms the ONNX model(s) loaded by the API reproduce the outputs saved by the notebooks."""
import json, sys
from pathlib import Path
import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.engine import Engine

root = Path(__file__).resolve().parents[1] / "models"
e = Engine(root)
print("export version:", "v2 (ensemble.onnx)" if e.v2 else "v1 (model.onnx)")
if e.v2:
    tc = json.load(open(root / "test_cases_v2.json"))
    vals, mask = np.array(tc["values_scaled"], np.float32), np.array(tc["mask"], np.float32)
    mean, std = e._run_z(vals, mask)
    print("max abs diff, mean:", float(np.abs(mean - np.array(tc["mean_z"])).max()),
          "| std:", float(np.abs(std - np.array(tc["std_z"])).max()))
else:
    tc = json.load(open(root / "test_cases.json"))
    vals, mask = np.array(tc["values_scaled"], np.float32), np.array(tc["mask"], np.float32)
    got, _ = e._run_z(vals, mask)
    print("max abs diff vs notebook:", float(np.abs(got - np.array(tc["expected_traits_z"])).max()))
