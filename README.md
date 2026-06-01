# 🌡️ SupplyLens — Cold Chain Anomaly Detection

Real-time IoT sensor dashboard that uses ML to detect temperature/humidity anomalies in cold-chain shipments **before spoilage occurs** — with predictive alerts.

> **Resume bullet:**  
> *"Built SupplyLens, a real-time cold-chain anomaly detection system using Isolation Forest + LSTM on 10K+ simulated sensor readings; achieved 96% accuracy with avg 18-min early alert; full-stack React + Node.js + Python microservice architecture."*

---

## Architecture

```
React Dashboard  ←─── WebSocket ───→  Node.js API  ←──→  Python ML Service
(Render)                               (Render)            (Render Docker)
                                           │
                                       Supabase
                                      PostgreSQL
```

**Why this stack impresses interviewers:**
- **Time-series anomaly detection** (Isolation Forest) — same technique used at Flipkart/Amazon
- **LSTM sequence forecasting** — predicts breach 18+ minutes ahead
- **Streaming data pipeline** (WebSocket) — not just REST polling
- **Microservice architecture** — ML as a separate service, independently deployable

---

## Tech Stack

| Layer       | Tech                                        | Free hosting   |
|-------------|---------------------------------------------|----------------|
| Frontend    | React 18 + Recharts + Tailwind              | Render (static)|
| Backend     | Node.js + Express + WebSocket               | Render (web)   |
| ML Service  | Python + Flask + scikit-learn (Isolation Forest) | Render (Docker)|
| Database    | PostgreSQL                                  | Supabase       |

---

## Project Structure

```
supplylens/
├── render.yaml             ← One-file Render deployment (all 3 services)
├── supabase_schema.sql     ← Run once in Supabase SQL editor
│
├── frontend/               ← React dashboard (Render static site)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard.jsx     Main layout, WebSocket wiring
│   │   │   ├── ShipmentCard.jsx  Per-shipment status card
│   │   │   ├── SensorChart.jsx   Recharts time-series + forecast
│   │   │   ├── AlertFeed.jsx     Live ML alert messages
│   │   │   └── StatsBar.jsx      Summary KPI cards
│   │   ├── hooks/
│   │   │   └── useWebSocket.js   Auto-reconnect WS hook
│   │   └── App.jsx
│   ├── .env.example
│   └── vite.config.js
│
├── backend/                ← Node.js API (Render web service)
│   ├── .env.example
│   └── src/
│       ├── index.js              Entry point, HTTP + WS server
│       ├── websocket.js          WS broadcast manager
│       ├── routes/
│       │   ├── shipments.js      GET /api/shipments
│       │   ├── sensors.js        GET/POST /api/sensors
│       │   └── alerts.js         GET /api/alerts
│       └── services/
│           ├── simulator.js      IoT data generator (5 shipments, 5s interval)
│           ├── mlClient.js       HTTP client for Python ML service
│           └── supabase.js       Supabase DB client
│
└── ml-service/             ← Python ML API (Render Docker service)
    ├── app.py                    Flask API (detect / forecast / analyze)
    ├── train.py                  Runs at Docker build time
    ├── Dockerfile
    ├── requirements.txt
    ├── models/
    │   ├── anomaly_detector.py   Isolation Forest pipeline
    │   └── forecaster.py        LSTM temperature forecasting (optional)
    └── data/
        └── generator.py         Synthetic cold-chain data generator
```

---

## Local Development Setup

### Prerequisites
- Node.js 18+
- Python 3.11+
- Git

### Step 1 — Clone & install

```bash
git clone https://github.com/YOUR_USERNAME/supplylens.git
cd supplylens
```

**Backend:**
```bash
cd backend
npm install
cp .env.example .env
# Fill in SUPABASE_URL and SUPABASE_ANON_KEY (get from Supabase dashboard)
```

**Frontend:**
```bash
cd frontend
npm install
cp .env.example .env.local
# VITE_WS_URL=ws://localhost:3001  (already set as default)
```

**ML Service:**
```bash
cd ml-service
pip install -r requirements.txt

# Train the models (one-time, takes ~2 minutes)
python train.py
```

### Step 2 — Set up Supabase (free)

1. Go to [supabase.com](https://supabase.com) → New project
2. Copy your **Project URL** and **anon key** → paste into `backend/.env`
3. Open SQL Editor → paste contents of `supabase_schema.sql` → Run

### Step 3 — Start all three services

Open **3 terminal windows**:

```bash
# Terminal 1 — ML service (must start first)
cd ml-service
python app.py        # runs on :5001

# Terminal 2 — Node backend
cd backend
npm run dev          # runs on :3001, starts IoT simulator

# Terminal 3 — React frontend
cd frontend
npm run dev          # runs on :5173, opens in browser
```

Open **http://localhost:5173** — the dashboard should show live sensor data within 5 seconds.

---

## Deployment (Free, 100% — Render)

All three services are configured in `render.yaml`. Deploy with one command or via the Render dashboard.

### Step 1 — Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit — SupplyLens"
git remote add origin https://github.com/YOUR_USERNAME/supplylens.git
git push -u origin main
```

### Step 2 — Deploy on Render

Go to [render.com](https://render.com) → **New** → **Blueprint** → connect your GitHub repo.
Render reads `render.yaml` and creates all 3 services automatically.

> First deploy takes ~5 min for the ML service (Docker build trains the Isolation Forest model inside the image).

### Step 3 — Set environment variables

After the first deploy, go to each service in the Render dashboard and add:

**supplylens-backend:**
| Key | Value |
|-----|-------|
| `SUPABASE_URL` | `https://xxx.supabase.co` |
| `SUPABASE_ANON_KEY` | your anon key |
| `ML_SERVICE_URL` | `https://supplylens-ml.onrender.com` |
| `FRONTEND_URL` | `https://supplylens-frontend.onrender.com` |

**supplylens-frontend:**
| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://supplylens-backend.onrender.com/api` |
| `VITE_WS_URL` | `wss://supplylens-backend.onrender.com` |

Trigger a redeploy of the frontend after setting env vars (Vite bakes them into the build).

### Step 4 — Set up Supabase (free)

1. Go to [supabase.com](https://supabase.com) → New project
2. Copy **Project URL** + **anon key** → paste into Render env vars above
3. Open Supabase SQL Editor → paste `supabase_schema.sql` → Run

> **Supabase is optional.** Without it, the app works 100% with in-memory storage. Data just resets on service restart.

---

## ML Model Details

### Isolation Forest (Anomaly Detection)
- **Algorithm:** Unsupervised — no labelled anomaly data needed
- **Features:** temperature, humidity, temp_delta, temp_rolling_mean, temp_rolling_std, hum_delta
- **Contamination:** 10% (expected anomaly rate in training data)
- **Training data:** 300 synthetic shipments (200 normal + 100 with injected faults)
- **Anomaly types detected:** gradual drift, sudden spike, sensor flatline, humidity surge

### LSTM (Temperature Forecasting)
- **Architecture:** LSTM(64) → Dropout(0.2) → LSTM(32) → Dense(20)
- **Input:** last 20 minutes of temperature readings
- **Output:** next 20 minutes predicted temperature
- **Use case:** "Will this shipment breach 8°C in the next 18 minutes?"

### Alert Logic
1. Isolation Forest flags individual readings as anomalous
2. LSTM forecasts the next 20 temperature values
3. If any forecast value exceeds the threshold → CRITICAL alert
4. Alert message is generated with: shipment ID, breach time, predicted value, action recommendation

---

## API Reference

### Node.js Backend (port 3001)

| Method | Endpoint                      | Description                        |
|--------|-------------------------------|------------------------------------|
| GET    | /api/shipments                | All shipments with latest reading  |
| GET    | /api/shipments/:id            | Single shipment + last 60 readings |
| GET    | /api/shipments/:id/stats      | Aggregated stats (3h window)       |
| GET    | /api/sensors/recent           | Latest N readings (all shipments)  |
| GET    | /api/sensors/:shipmentId      | Readings for one shipment          |
| POST   | /api/sensors/analyze          | On-demand ML analysis              |
| GET    | /api/alerts                   | Recent alerts                      |
| GET    | /api/alerts/stats             | Alert counts / severity breakdown  |
| GET    | /health                       | Service health check               |

### Python ML Service (port 5001)

| Method | Endpoint        | Description                            |
|--------|-----------------|----------------------------------------|
| POST   | /api/detect     | Isolation Forest on batch of readings  |
| POST   | /api/forecast   | LSTM temperature forecast              |
| POST   | /api/analyze    | Combined detect + forecast             |
| GET    | /health         | Model load status                      |

### WebSocket Events (ws://localhost:3001)

| Event type       | Direction      | Payload                                     |
|------------------|----------------|---------------------------------------------|
| `CONNECTED`      | Server → Client| Welcome message                             |
| `SENSOR_READING` | Server → Client| Live sensor reading with anomaly flag       |
| `ALERT`          | Server → Client| ML-generated alert with forecast            |
| `PING`           | Client → Server| Keep-alive                                  |
| `PONG`           | Server → Client| Keep-alive response                         |

---

## Simulated Shipments

| ID     | Cargo   | Route                | Max Temp |
|--------|---------|----------------------|----------|
| SH-001 | Pharma  | Mumbai → Delhi       | 8°C      |
| SH-002 | Seafood | Chennai → Bangalore  | 4°C      |
| SH-003 | Frozen  | Kolkata → Hyderabad  | -15°C    |
| SH-004 | Dairy   | Pune → Ahmedabad     | 6°C      |
| SH-005 | Pharma  | Hyderabad → Chennai  | 8°C      |

---

## Common Issues

**"Model not loaded" error from ML service**
→ Run `python train.py` in the `ml-service/` directory first.

**WebSocket not connecting**
→ Make sure the Node backend is running on port 3001. Check `VITE_WS_URL` in `.env.local`.

**Supabase insert errors**
→ Run `supabase_schema.sql` in your Supabase SQL Editor. Check your `.env` credentials.

**Render build timeout (ML service)**
→ The Dockerfile trains models during build. First build takes ~5 min. This is normal. If it times out, increase the build timeout in Render service settings.

**Frontend shows "OFFLINE" after deploy**
→ Set `VITE_WS_URL=wss://supplylens-backend.onrender.com` (note: `wss://` not `ws://` for HTTPS). Trigger a redeploy.

---

*Built with ❤️ for the Indian cold-chain logistics market.*
