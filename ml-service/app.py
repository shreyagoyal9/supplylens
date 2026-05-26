from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import MinMaxScaler
import joblib, os, json
from datetime import datetime, timedelta
import random

app = Flask(__name__)
CORS(app)

def simulate_sensor_data(shipment_id, n=200):
    timestamps = [datetime.now() - timedelta(minutes=i*3) for i in range(n, 0, -1)]
    base_temp = 4.0
    base_hum  = 60.0

    temps, hums = [], []
    for i in range(n):
        drift = 0.02 * i
        noise = random.gauss(0, 0.3)
        temp  = base_temp + drift + noise
        hum   = base_hum  + random.gauss(0, 2)

        if random.random() < 0.08:
            temp += random.uniform(3, 7)

        temps.append(round(temp, 2))
        hums.append(round(hum, 1))

    return [
        {
            "shipment_id": shipment_id,
            "timestamp":   t.isoformat(),
            "temperature": temp,
            "humidity":    hum,
        }
        for t, temp, hum in zip(timestamps, temps, hums)
    ]


def detect_anomalies(readings):
    df = pd.DataFrame(readings)
    X  = df[["temperature", "humidity"]].values

    model = IsolationForest(contamination=0.08, random_state=42)
    scores = model.fit_predict(X)
    raw    = model.decision_function(X)

    df["anomaly"]       = (scores == -1)
    df["anomaly_score"] = np.round(1 - (raw - raw.min()) / (raw.max() - raw.min() + 1e-9), 3)
    return df.to_dict(orient="records")


def forecast_temperature(readings, steps=6):
    temps = [r["temperature"] for r in readings[-30:]]
    alpha = 0.3
    smoothed = temps[0]
    for t in temps[1:]:
        smoothed = alpha * t + (1 - alpha) * smoothed

    recent = temps[-10:]
    trend  = (recent[-1] - recent[0]) / len(recent)

    forecast = []
    for i in range(1, steps + 1):
        forecast.append(round(smoothed + trend * i, 2))
    return forecast


THRESHOLDS = {"min_temp": 2.0, "max_temp": 8.0, "max_hum": 75.0}

def generate_alert(shipment_id, readings, forecast):
    latest = readings[-1]
    alerts = []

    if latest["temperature"] > THRESHOLDS["max_temp"]:
        alerts.append({
            "level":   "CRITICAL",
            "message": f"Shipment {shipment_id}: temperature {latest['temperature']}°C exceeds 8°C threshold. Immediate action required.",
            "eta_breach_min": 0,
        })

    breach_step = next(
        (i for i, t in enumerate(forecast) if t > THRESHOLDS["max_temp"]), None
    )
    if breach_step is not None:
        eta = breach_step * 3
        alerts.append({
            "level":   "WARNING",
            "message": f"Shipment {shipment_id} likely to breach 8°C threshold in ~{eta} minutes — reroute recommended.",
            "eta_breach_min": eta,
        })

    if latest["humidity"] > THRESHOLDS["max_hum"]:
        alerts.append({
            "level":   "WARNING",
            "message": f"Shipment {shipment_id}: humidity {latest['humidity']}% above safe limit.",
            "eta_breach_min": None,
        })

    return alerts


@app.route("/health")
def health():
    return jsonify({"status": "ok"})


@app.route("/simulate/<shipment_id>")
def simulate(shipment_id):
    readings = simulate_sensor_data(shipment_id)
    return jsonify(readings)


@app.route("/analyze", methods=["POST"])
def analyze():
    body     = request.json
    readings = body.get("readings", [])
    shipment = body.get("shipment_id", "SH-000")

    if not readings:
        return jsonify({"error": "no readings"}), 400

    with_anomalies = detect_anomalies(readings)
    forecast       = forecast_temperature(readings)
    alerts         = generate_alert(shipment, readings, forecast)

    anomaly_count = sum(1 for r in with_anomalies if r["anomaly"])
    accuracy      = round(1 - anomaly_count / max(len(readings), 1), 3)

    return jsonify({
        "shipment_id":    shipment,
        "readings":       with_anomalies,
        "forecast":       forecast,
        "alerts":         alerts,
        "anomaly_count":  anomaly_count,
        "total_readings": len(readings),
        "accuracy":       accuracy,
    })


@app.route("/shipments")
def shipments():
    return jsonify([
        {"id": "SH-441", "product": "Vaccine batch B21",  "origin": "Mumbai",    "dest": "Delhi",     "status": "in-transit"},
        {"id": "SH-442", "product": "Frozen seafood",      "origin": "Chennai",   "dest": "Bangalore", "status": "in-transit"},
        {"id": "SH-443", "product": "Insulin pens",        "origin": "Hyderabad", "dest": "Kolkata",   "status": "at-risk"},
        {"id": "SH-444", "product": "Dairy products",      "origin": "Pune",      "dest": "Ahmedabad", "status": "delivered"},
    ])


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    app.run(host="0.0.0.0", port=port, debug=True)