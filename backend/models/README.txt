Put these files here (from Google Drive, BigFive/artifacts_v2/):
  ensemble.onnx
  artifacts_v2.json
  test_cases_v2.json     (optional, used by tests/check_parity.py)

policy.onnx is NOT needed: the app uses the fixed greedy question order (the RL agent did not beat it).

Fallback: if the three files above are missing, the app uses the older single-model export
(model.onnx + artifacts.json + test_cases.json from BigFive/artifacts/) and simply shows no intervals.
