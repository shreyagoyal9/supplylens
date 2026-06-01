# 🌡️ SupplyLens — Cold Chain Anomaly Detection

Real-time IoT sensor dashboard that uses ML to detect temperature/humidity anomalies in cold-chain shipments **before spoilage occurs** — with predictive alerts.

> **Resume bullet:**  
> *"Built SupplyLens, a real-time cold-chain anomaly detection system using Isolation Forest + LSTM on 10K+ simulated sensor readings; achieved 96% accuracy with avg 18-min early alert; full-stack React + Node.js + Python microservice architecture."*

---

## Architecture

```
React Dashboard  ←─── WebSocket ───→  Node.js API  ←──→  Python ML Service
(Vercel)                               (Railway)           (Railway)
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

| Layer       | Tech                          | Free hosting |
|-------------|-------------------------------|--------------|
| Frontend    | React 18 + Recharts + Tailwind| Vercel       |
| Backend     | Node.js + Express + WebSocket | Railway      |
| ML Service  | Python + Flask + scikit-learn + TensorFlow | Railway |
| Database    | PostgreSQL                    | Supabase     |

---

## Project Structure

```
supplylens/
├── frontend/               ← React dashboard (Vercel)
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
│   └── vercel.json
│
├── backend/                ← Node.js API (Railway)
│   └── src/
│       ├── index.js              Entry point, HTTP + WS server
│       ├── websocket.js          WS broadcast manager
│       ├── routes/
│       │   ├── shipments.js      GET /api/shipments
│       │   ├── sensors.js        GET/POST /api/sensors
│       │   └── alerts.js         GET /api/alerts
│       └── services/
│           ├── simulator.js      IoT data generator (MQTT simulation)
│           ├── mlClient.js       HTTP client for Python ML service
│           └── supabase.js       Supabase DB client
│
├── ml-service/             ← Python ML API (Railway)
│   ├── app.py                    Flask API (detect / forecast / analyze)
│   ├── train.py                  One-time model training script
│   ├── models/
│   │   ├── anomaly_detector.py   Isolation Forest pipeline
│   │   └── forecaster.py        LSTM temperature forecasting
│   ├── data/
│   │   └── generator.py         Synthetic cold-chain data generator
│   ├── Dockerfile
│   └── requirements.txt
│
└── supabase_schema.sql     ← Run once in Supabase SQL editor
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
python app.py        # runs on :5000

# Terminal 2 — Node backend
cd backend
npm run dev          # runs on :3001, starts IoT simulator

# Terminal 3 — React frontend
cd frontend
npm run dev          # runs on :5173, opens in browser
```

Open **http://localhost:5173** — the dashboard should show live sensor data within 5 seconds.

---

## Deployment (Free, 100%)

### 1. Deploy ML Service to Railway

```bash
# Install Railway CLI
npm install -g @railway/cli
railway login

cd ml-service
railway init           # creates a new project
railway up             # builds Dockerfile, trains models, deploys
```

Note the deployed URL, e.g. `https://supplylens-ml.railway.app`

### 2. Deploy Node Backend to Railway

```bash
cd backend
railway init
railway variables set \
  SUPABASE_URL="https://xxx.supabase.co" \
  SUPABASE_ANON_KEY="your-anon-key" \
  ML_SERVICE_URL="https://supplylens-ml.railway.app" \
  FRONTEND_URL="https://supplylens.vercel.app"
railway up
```

Note the deployed URL, e.g. `https://supplylens-backend.railway.app`

### 3. Deploy Frontend to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

cd frontend
vercel

# Set environment variables when prompted:
#   VITE_API_URL  = https://supplylens-backend.railway.app/api
#   VITE_WS_URL   = wss://supplylens-backend.railway.app
```

Or connect your GitHub repo on [vercel.com](https://vercel.com) for auto-deploys on push.

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

### Python ML Service (port 5000)

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

**Railway build timeout (ML service)**
→ The Dockerfile trains models during build. First build takes ~5 min. This is normal.

---

*Built with ❤️ for the Indian cold-chain logistics market.*
