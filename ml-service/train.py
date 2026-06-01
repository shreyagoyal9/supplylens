"""
Train and save ML models. Run before starting the server:

    python train.py
"""

import numpy as np
from data.generator import generate_training_dataset, _normal_readings
import models.anomaly_detector as detector

print("Training Isolation Forest...")
df = generate_training_dataset(n_normal=200, n_anomaly=100)
X  = detector.build_features(df)
detector.save(detector.train(X))
print(f"  Done — {len(df):,} samples, {int(df['is_anomaly'].sum()):,} anomalous")

# LSTM requires TensorFlow (~500MB) — skipped on free-tier deployments
try:
    import models.forecaster as forecaster
    print("Training LSTM forecaster...")
    pharma_temps = np.concatenate([
        _normal_readings("pharma", n=180)["temperature"].values
        for _ in range(100)
    ])
    _, mn, mx = forecaster.train(pharma_temps)
    print(f"  Done — {len(pharma_temps):,} readings, range [{mn:.2f}, {mx:.2f}]°C")
except ImportError:
    print("  Skipped LSTM (TensorFlow not installed) — rule-based forecast active.")

print("\nModels saved. Start with: python app.py")
