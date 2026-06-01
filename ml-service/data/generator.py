import numpy as np
import pandas as pd
from datetime import datetime, timedelta

SHIPMENT_TYPES = {
    "pharma":  {"temp_min": 2.0,   "temp_max": 8.0,   "hum_min": 30, "hum_max": 60},
    "frozen":  {"temp_min": -18.0, "temp_max": -15.0, "hum_min": 20, "hum_max": 50},
    "seafood": {"temp_min": 0.0,   "temp_max": 4.0,   "hum_min": 40, "hum_max": 70},
    "dairy":   {"temp_min": 1.0,   "temp_max": 6.0,   "hum_min": 35, "hum_max": 65},
}

READINGS_PER_SHIPMENT = 180  # 3-hour window, 1 reading/min


def _normal_readings(shipment_type, n=READINGS_PER_SHIPMENT, start=None):
    cfg   = SHIPMENT_TYPES[shipment_type]
    start = start or datetime.utcnow()
    base_temp = (cfg["temp_min"] + cfg["temp_max"]) / 2
    base_hum  = (cfg["hum_min"]  + cfg["hum_max"])  / 2

    return pd.DataFrame({
        "timestamp":    [start + timedelta(seconds=i * 60) for i in range(n)],
        "temperature":  np.clip(np.random.normal(base_temp, 0.3, n),
                                cfg["temp_min"] - 0.5, cfg["temp_max"] + 0.5),
        "humidity":     np.clip(np.random.normal(base_hum, 1.5, n),
                                cfg["hum_min"] - 5, cfg["hum_max"] + 5),
        "shipment_type": shipment_type,
        "is_anomaly":    0,
        "anomaly_type":  "none",
    })


def inject_anomaly(df, anomaly_type="random"):
    df    = df.copy()
    n     = len(df)
    onset = np.random.randint(n // 3, 2 * n // 3)

    if anomaly_type == "random":
        anomaly_type = np.random.choice(["drift", "spike", "flatline", "humidity_surge"])

    if anomaly_type == "drift":
        magnitude = np.random.uniform(3, 8)
        for i in range(onset, n):
            df.loc[i, "temperature"] += magnitude * ((i - onset) / max(n - onset, 1))
            df.loc[i, "is_anomaly"]   = 1

    elif anomaly_type == "spike":
        length = np.random.randint(5, 15)
        end    = min(onset + length, n)
        df.loc[onset:end, "temperature"] += np.random.uniform(5, 12)
        df.loc[onset:end, "is_anomaly"]   = 1

    elif anomaly_type == "flatline":
        df.loc[onset:, "temperature"] = df.loc[onset, "temperature"]
        df.loc[onset:, "is_anomaly"]  = 1

    elif anomaly_type == "humidity_surge":
        end = min(onset + 20, n)
        df.loc[onset:end, "humidity"]  += np.random.uniform(20, 40)
        df.loc[onset:end, "is_anomaly"] = 1

    df["anomaly_type"] = np.where(df["is_anomaly"] == 1, anomaly_type, "none")
    return df


def generate_training_dataset(n_normal=200, n_anomaly=100):
    types = list(SHIPMENT_TYPES.keys())
    rows  = (
        [_normal_readings(types[i % len(types)]) for i in range(n_normal)] +
        [inject_anomaly(_normal_readings(types[i % len(types)])) for i in range(n_anomaly)]
    )
    return pd.concat(rows, ignore_index=True)


def generate_live_stream(shipment_type="pharma", n=60, inject=False):
    df = _normal_readings(shipment_type, n=n)
    if inject:
        df = inject_anomaly(df)
    return df.to_dict(orient="records")
