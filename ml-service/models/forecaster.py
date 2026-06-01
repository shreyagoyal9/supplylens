import os
import json
import numpy as np

os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
import tensorflow as tf
from tensorflow.keras.models import Sequential, load_model as _keras_load
from tensorflow.keras.layers import LSTM, Dense, Dropout
from tensorflow.keras.callbacks import EarlyStopping

MODEL_PATH  = os.path.join(os.path.dirname(__file__), "..", "saved_models", "lstm_forecaster.keras")
PARAMS_PATH = MODEL_PATH.replace(".keras", "_params.json")

SEQ_LEN    = 20   # minutes of history fed into the model
PRED_STEPS = 20   # minutes ahead predicted


def _create_sequences(temps):
    X, y = [], []
    for i in range(len(temps) - SEQ_LEN - PRED_STEPS + 1):
        X.append(temps[i:i + SEQ_LEN])
        y.append(temps[i + SEQ_LEN:i + SEQ_LEN + PRED_STEPS])
    return np.array(X)[..., np.newaxis], np.array(y)


def _normalise(arr):
    mn, mx = arr.min(), arr.max()
    span   = mx - mn if mx != mn else 1.0
    return (arr - mn) / span, mn, mx


def _denormalise(arr, mn, mx):
    return arr * (mx - mn) + mn


def _build_model():
    model = Sequential([
        LSTM(64, input_shape=(SEQ_LEN, 1), return_sequences=True),
        Dropout(0.2),
        LSTM(32),
        Dropout(0.2),
        Dense(PRED_STEPS),
    ])
    model.compile(optimizer="adam", loss="mse", metrics=["mae"])
    return model


def train(temperatures):
    norm, mn, mx = _normalise(temperatures)
    X, y = _create_sequences(norm)

    model = _build_model()
    model.fit(X, y, epochs=50, batch_size=32, validation_split=0.15,
              callbacks=[EarlyStopping(patience=5, restore_best_weights=True)],
              verbose=0)

    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    model.save(MODEL_PATH)
    with open(PARAMS_PATH, "w") as f:
        json.dump({"min": float(mn), "max": float(mx)}, f)

    return model, mn, mx


def load():
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(f"No LSTM model at {MODEL_PATH}. Run train.py first.")
    with open(PARAMS_PATH) as f:
        p = json.load(f)
    return _keras_load(MODEL_PATH), p["min"], p["max"]


def forecast(model, mn, mx, recent_temps, threshold):
    # Pad if we don't have a full window of history yet
    if len(recent_temps) < SEQ_LEN:
        recent_temps = [recent_temps[0]] * (SEQ_LEN - len(recent_temps)) + list(recent_temps)

    arr   = np.array(recent_temps[-SEQ_LEN:], dtype=np.float32)
    norm  = (arr - mn) / (mx - mn + 1e-8)
    preds = model.predict(norm.reshape(1, SEQ_LEN, 1), verbose=0)[0]
    temps = _denormalise(preds, mn, mx).tolist()

    breach_at = next((i + 1 for i, t in enumerate(temps) if t > threshold), None)

    if breach_at:
        msg = (f"Temperature projected to breach {threshold}°C in ~{breach_at} min. "
               f"Predicted: {temps[breach_at-1]:.1f}°C. Immediate action recommended.")
    else:
        msg = (f"Temperature stable. Projected max over next {PRED_STEPS} min: "
               f"{max(temps):.1f}°C (limit: {threshold}°C).")

    return {
        "forecast":          [round(t, 2) for t in temps],
        "will_breach":       breach_at is not None,
        "breach_in_minutes": breach_at,
        "alert_message":     msg,
    }
