import os
import logging
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

import models.anomaly_detector as detector

# LSTM is optional — skipped on free-tier deployments where TensorFlow won't fit in RAM
try:
    import models.forecaster as forecaster
    lstm, lstm_mn, lstm_mx = forecaster.load()
    LSTM_READY = True
    log.info("LSTM forecaster loaded.")
except Exception:
    LSTM_READY = False
    log.warning("LSTM not available — forecast endpoint will use rule-based fallback.")

try:
    iso_pipeline = detector.load()
    log.info("Isolation Forest loaded.")
except FileNotFoundError as e:
    log.error(str(e))
    iso_pipeline = None

THRESHOLDS = {"pharma": 8.0, "frozen": -15.0, "seafood": 4.0, "dairy": 6.0}


def rule_based_forecast(recent_temps, threshold, steps=20):
    """Simple linear extrapolation when LSTM is unavailable."""
    if len(recent_temps) < 2:
        return recent_temps * steps

    # Linear trend from last 5 readings
    window = recent_temps[-5:]
    trend  = (window[-1] - window[0]) / max(len(window) - 1, 1)
    last   = recent_temps[-1]
    preds  = [round(last + trend * (i + 1), 2) for i in range(steps)]

    breach_at = next((i + 1 for i, t in enumerate(preds) if t > threshold), None)
    if breach_at:
        msg = (f"Temperature trending toward {threshold}°C breach in ~{breach_at} min. "
               f"Projected: {preds[breach_at-1]:.1f}°C. Action recommended.")
    else:
        msg = (f"Temperature stable. Projected max: {max(preds):.1f}°C "
               f"(limit: {threshold}°C).")

    return {
        "forecast":          preds,
        "will_breach":       breach_at is not None,
        "breach_in_minutes": breach_at,
        "alert_message":     msg,
    }


@app.route("/health")
def health():
    return jsonify({
        "status":       "ok",
        "iso_ready":    iso_pipeline is not None,
        "lstm_ready":   LSTM_READY,
    })


@app.route("/api/detect", methods=["POST"])
def detect():
    if not iso_pipeline:
        return jsonify({"error": "Model not loaded. Run train.py first."}), 503

    data = request.get_json()
    if not data or not data.get("readings"):
        return jsonify({"error": "Missing readings"}), 400

    results     = detector.predict(iso_pipeline, data["readings"])
    n_anomalies = sum(1 for r in results if r["is_anomaly"])
    return jsonify({
        "results":       results,
        "anomaly_count": n_anomalies,
        "anomaly_rate":  round(n_anomalies / len(results), 4),
    })


@app.route("/api/forecast", methods=["POST"])
def forecast_route():
    data = request.get_json()
    if not data or "recent_temps" not in data:
        return jsonify({"error": "Missing recent_temps"}), 400

    threshold    = THRESHOLDS.get(data.get("shipment_type", "pharma"), 8.0)
    recent_temps = data["recent_temps"]

    if LSTM_READY:
        return jsonify(forecaster.forecast(lstm, lstm_mn, lstm_mx, recent_temps, threshold))
    return jsonify(rule_based_forecast(recent_temps, threshold))


@app.route("/api/analyze", methods=["POST"])
def analyze():
    if not iso_pipeline:
        return jsonify({"error": "Model not loaded. Run train.py first."}), 503

    data = request.get_json()
    if not data or not data.get("readings"):
        return jsonify({"error": "Missing readings"}), 400

    shipment_type = data.get("shipment_type", "pharma")
    threshold     = THRESHOLDS.get(shipment_type, 8.0)
    readings      = data["readings"]
    recent_temps  = [r["temperature"] for r in readings[-20:]]

    detect_out = detector.predict(iso_pipeline, readings)

    if LSTM_READY:
        forecast_out = forecaster.forecast(lstm, lstm_mn, lstm_mx, recent_temps, threshold)
    else:
        forecast_out = rule_based_forecast(recent_temps, threshold)

    n_anomalies = sum(1 for r in detect_out if r["is_anomaly"])
    return jsonify({
        "detection": {
            "results":       detect_out,
            "anomaly_count": n_anomalies,
            "anomaly_rate":  round(n_anomalies / len(detect_out), 4),
        },
        "forecast":      forecast_out,
        "shipment_type": shipment_type,
        "threshold":     threshold,
    })


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5001)))
