import os
import numpy as np
import pandas as pd
import joblib
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline

MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "saved_models", "isolation_forest.pkl")


def build_features(data):
    df = pd.DataFrame(data) if isinstance(data, list) else data.copy()
    df["temp_delta"]        = df["temperature"].diff().fillna(0)
    df["hum_delta"]         = df["humidity"].diff().fillna(0)
    df["temp_rolling_mean"] = df["temperature"].rolling(10, min_periods=1).mean()
    df["temp_rolling_std"]  = df["temperature"].rolling(10, min_periods=1).std().fillna(0)
    return df[["temperature", "humidity", "temp_delta", "hum_delta",
               "temp_rolling_mean", "temp_rolling_std"]].values


def train(X):
    pipeline = Pipeline([
        ("scaler",     StandardScaler()),
        ("iso_forest", IsolationForest(n_estimators=200, contamination=0.1,
                                       random_state=42, n_jobs=-1)),
    ])
    pipeline.fit(X)
    return pipeline


def save(pipeline):
    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    joblib.dump(pipeline, MODEL_PATH)


def load():
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(f"No trained model at {MODEL_PATH}. Run train.py first.")
    return joblib.load(MODEL_PATH)


def predict(pipeline, readings):
    X          = build_features(readings)
    labels     = pipeline.predict(X)          # -1 = anomaly, 1 = normal
    scores     = pipeline.decision_function(X)

    mn, mx = scores.min(), scores.max()
    span   = mx - mn if mx != mn else 1.0
    norm   = 1.0 - (scores - mn) / span      # 1.0 = most anomalous

    return [{
        **r,
        "is_anomaly":    bool(labels[i] == -1),
        "anomaly_score": round(float(norm[i]), 4),
    } for i, r in enumerate(readings)]
