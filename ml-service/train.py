"""
Train and save the Isolation Forest + LSTM models.
Run once before starting the Flask server:

    python train.py
"""

import numpy as np
from data.generator import generate_training_dataset, SHIPMENT_TYPES
from data.generator import _normal_readings
import models.anomaly_detector as detector
import models.forecaster as forecaster

print("Training Isolation Forest...")
df = generate_training_dataset(n_normal=200, n_anomaly=100)
X  = detector.build_features(df)
detector.save(detector.train(X))
print(f"  Done — {len(df):,} samples, {int(df['is_anomaly'].sum()):,} anomalous")

print("Training LSTM forecaster...")
pharma_temps = np.concatenate([
    _normal_readings("pharma", n=180)["temperature"].values
    for _ in range(100)
])
_, mn, mx = forecaster.train(pharma_temps)
print(f"  Done — {len(pharma_temps):,} readings, range [{mn:.2f}, {mx:.2f}]°C")

print("\nAll models saved. Start the server with:")
print("  python app.py   (dev)  or  gunicorn -w 2 -b 0.0.0.0:5000 app:app  (prod)")
