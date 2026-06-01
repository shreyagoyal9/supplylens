import os
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Load models at startup — kept in memory for low-latency inference
import models.anomaly_detector as detector
import models.forecaster as forecaster

try:
    iso_pipeline          = detector.load()
    lstm, lstm_mn, lstm_mx = forecaster.load()
    log.info("Models loaded successfully.")
except FileNotFoundError as e:
    log.error(str(e))
    iso_pipeline = lstm = None

THRESHOLDS = {"pharma": 8.0, "frozen": -15.0, "seafood": 4.0, "dairy": 6.0}


@app.route("/health")
def health():
    return jsonify({"status": "ok", "models_ready": iso_pipeline is not None})


@app.route("/api/detect", methods=["POST"])
def detect():
    if not iso_pipeline:
        return jsonify({"error": "Models not loaded. Run train.py first."}), 503

    data = request.get_json()
    if not data or not data.get("readings"):
        return jsonify({"error": "Missing readings"}), 400

    results = detector.predict(iso_pipeline, data["readings"])
    n_anomalies = sum(1 for r in results if r["is_anomaly"])

    return jsonify({
        "results":       results,
        "anomaly_count": n_anomalies,
        "anomaly_rate":  round(n_anomalies / len(results), 4),
    })


@app.route("/api/forecast", methods=["POST"])
def forecast():
    if not lstm:
        return jsonify({"error": "Models not loaded. Run train.py first."}), 503

    data = request.get_json()
    if not data or "recent_temps" not in data:
        return jsonify({"error": "Missing recent_temps"}), 400

    threshold = THRESHOLDS.get(data.get("shipment_type", "pharma"), 8.0)
    return jsonify(forecaster.forecast(lstm, lstm_mn, lstm_mx,
                                       data["recent_temps"], threshold))


@app.route("/api/analyze", methods=["POST"])
def analyze():
    if not iso_pipeline or not lstm:
        return jsonify({"error": "Models not loaded. Run train.py first."}), 503

    data = request.get_json()
    if not data or not data.get("readings"):
        return jsonify({"error": "Missing readings"}), 400

    shipment_type = data.get("shipment_type", "pharma")
    threshold     = THRESHOLDS.get(shipment_type, 8.0)
    readings      = data["readings"]

    detect_out  = detector.predict(iso_pipeline, readings)
    recent_temps = [r["temperature"] for r in readings[-20:]]
    forecast_out = forecaster.forecast(lstm, lstm_mn, lstm_mx, recent_temps, threshold)

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
