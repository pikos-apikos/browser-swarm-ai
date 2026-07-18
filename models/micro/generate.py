"""Generate the license-free deterministic LiteRT integration model."""

from pathlib import Path
import json
import numpy as np
import torch
import litert_torch


class MicroModel(torch.nn.Module):
    def forward(self, value: torch.Tensor) -> torch.Tensor:
        return value * 2.0 + 1.0


root = Path(__file__).resolve().parents[1] / "generated"
root.mkdir(parents=True, exist_ok=True)
model_path = root / "micro.tflite"
profile_path = root / "micro.profile.json"

model = MicroModel().eval()
sample_inputs = (torch.tensor([3.0], dtype=torch.float32),)
with torch.no_grad():
    expected = model(*sample_inputs).numpy()
    edge_model = litert_torch.convert(model, sample_inputs)
    actual = edge_model(*sample_inputs)

if not np.allclose(expected, actual, atol=1e-5):
    raise RuntimeError(f"Converted output mismatch: expected {expected}, received {actual}")

edge_model.export(str(model_path))
profile_path.write_text(json.dumps({
    "backend": "litert",
    "input": {"dtype": "float32", "shape": [1], "values": [3]},
    "expectedOutput": {"values": [7], "tolerance": 1e-5},
}, indent=2) + "\n", encoding="utf-8")
print(f"Generated {model_path}")
print(f"Generated {profile_path}")
