const { v4: uuidv4 } = require("uuid");
const supabase = require("./supabase");
const ml       = require("./mlClient");

const SHIPMENTS = [
  { id: "SH-001", type: "pharma",  origin: "Mumbai",    dest: "Delhi",     threshold: 8.0   },
  { id: "SH-002", type: "seafood", origin: "Chennai",   dest: "Bangalore", threshold: 4.0   },
  { id: "SH-003", type: "frozen",  origin: "Kolkata",   dest: "Hyderabad", threshold: -15.0 },
  { id: "SH-004", type: "dairy",   origin: "Pune",      dest: "Ahmedabad", threshold: 6.0   },
  { id: "SH-005", type: "pharma",  origin: "Hyderabad", dest: "Chennai",   threshold: 8.0   },
];

const RANGES = {
  pharma:  { min: 2.0,   max: 8.0,   base: 5.0   },
  seafood: { min: 0.0,   max: 4.0,   base: 2.0   },
  frozen:  { min: -18.0, max: -15.0, base: -16.5 },
  dairy:   { min: 1.0,   max: 6.0,   base: 3.5   },
};

// Per-shipment runtime state
const state = {};
SHIPMENTS.forEach((s) => {
  const r = RANGES[s.type];
  state[s.id] = {
    temp:         r.base + (Math.random() - 0.5) * (r.max - r.min) * 0.3,
    humidity:     45 + Math.random() * 15,
    anomaly:      null,   // null | "drift" | "spike" | "humidity_surge"
    anomalySteps: 0,
    recentTemps:  [],
  };
});

// In-memory ring buffers — used when Supabase isn't configured
const MEM_LIMIT = 60;
const memReadings = Object.fromEntries(SHIPMENTS.map((s) => [s.id, []]));
const memLatest   = Object.fromEntries(SHIPMENTS.map((s) => [s.id, null]));
const memAlerts   = [];

function addAlert(alert) {
  memAlerts.unshift(alert);
  if (memAlerts.length > 100) memAlerts.pop();
}

function gaussian(std = 0.15) {
  const u = Math.random(), v = Math.random();
  return std * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function tick(shipment) {
  const s = state[shipment.id];
  const r = RANGES[shipment.type];

  // 8% chance to start a new anomaly each cycle
  if (!s.anomaly && Math.random() < 0.08) {
    s.anomaly      = ["drift", "spike", "humidity_surge"][Math.floor(Math.random() * 3)];
    s.anomalySteps = 0;
  }

  let dTemp = gaussian(0.1);
  let dHum  = gaussian(0.8);

  if (s.anomaly === "drift") {
    dTemp += 0.3;
    if (++s.anomalySteps > 15) s.anomaly = null;
  } else if (s.anomaly === "spike") {
    dTemp += 4 + gaussian(0.3);
    if (++s.anomalySteps > 3) s.anomaly = null;
  } else if (s.anomaly === "humidity_surge") {
    dHum += 20 + gaussian(2);
    if (++s.anomalySteps > 8) s.anomaly = null;
  }

  // Mean-revert toward safe baseline when no anomaly is active
  if (!s.anomaly) dTemp += (r.base - s.temp) * 0.20;

  s.temp     = Math.round((s.temp + dTemp) * 100) / 100;
  s.humidity = Math.round(Math.max(10, Math.min(95, s.humidity + dHum)) * 10) / 10;

  s.recentTemps.push(s.temp);
  if (s.recentTemps.length > 20) s.recentTemps.shift();

  const isBreach  = s.temp > shipment.threshold;
  const isAnomaly = !!s.anomaly || isBreach;

  return {
    id:            uuidv4(),
    shipment_id:   shipment.id,
    shipment_type: shipment.type,
    timestamp:     new Date().toISOString(),
    temperature:   s.temp,
    humidity:      s.humidity,
    threshold:     shipment.threshold,
    is_breach:     isBreach,
    is_anomaly:    isAnomaly,
    anomaly_type:  s.anomaly || "none",
    origin:        shipment.origin,
    destination:   shipment.dest,
    status:        isBreach ? "BREACH" : isAnomaly ? "WARNING" : "NORMAL",
  };
}

let broadcast = null;

async function runCycle() {
  for (const shipment of SHIPMENTS) {
    const reading = tick(shipment);

    // In-memory store
    memReadings[shipment.id].push(reading);
    if (memReadings[shipment.id].length > MEM_LIMIT) memReadings[shipment.id].shift();
    memLatest[shipment.id] = reading;

    if (broadcast) broadcast({ type: "SENSOR_READING", payload: reading });

    supabase.from("sensor_readings").insert(reading).then(({ error }) => {
      if (error && !error.message?.includes("fetch failed"))
        console.error("[supabase]", error.message);
    });

    // ---------------------------------------------------------------------
    // Rule-based alert — fires directly from the reading, with NO dependency
    // on the ML service (which sleeps on the free tier). Guarantees the Live
    // Alerts feed reflects the current breach/anomaly state. Debounced per
    // shipment: a new alert on a status change, or every ALERT_REPEAT_MS while
    // the condition persists, so an ongoing breach stays visible without spam.
    // ML analysis below still adds richer *predictive* alerts when reachable.
    // ---------------------------------------------------------------------
    {
      const st  = state[shipment.id];
      const now = Date.now();
      const ALERT_REPEAT_MS = parseInt(process.env.ALERT_REPEAT_MS || "45000");

      if (reading.status !== "NORMAL") {
        const changed = reading.status !== st.lastAlertStatus;
        const stale   = !st.lastAlertAt || now - st.lastAlertAt > ALERT_REPEAT_MS;

        if (changed || stale) {
          st.lastAlertStatus = reading.status;
          st.lastAlertAt     = now;

          const critical = reading.status === "BREACH";
          const route    = `${shipment.origin} → ${shipment.dest}`;
          const alert = {
            id:            uuidv4(),
            shipment_id:   shipment.id,
            shipment_type: shipment.type,
            timestamp:     reading.timestamp,
            severity:      critical ? "CRITICAL" : "WARNING",
            alert_message: critical
              ? `Temperature ${reading.temperature}°C breached the ${reading.threshold}°C limit on ${route} (${shipment.type}).`
              : `${reading.anomaly_type.replace("_", " ")} anomaly on ${route} — ${reading.temperature}°C nearing the ${reading.threshold}°C limit.`,
          };

          addAlert(alert);
          if (broadcast) broadcast({ type: "ALERT", payload: alert });
          supabase.from("alerts").insert(alert).then(({ error }) => {
            if (error && !error.message?.includes("fetch failed"))
              console.error("[supabase]", error.message);
          });
        }
      } else {
        st.lastAlertStatus = "NORMAL";
      }
    }

    // Run ML analysis every 5 anomalous steps to avoid hammering the service
    if (reading.is_anomaly && state[shipment.id].anomalySteps % 5 === 1) {
      const s         = state[shipment.id];
      const readings  = s.recentTemps.map((t, i) => ({
        temperature: t,
        humidity:    s.humidity,
        timestamp:   new Date(Date.now() - (s.recentTemps.length - i) * 60_000).toISOString(),
      }));

      ml.analyze(readings, shipment.type).then((result) => {
        if (!result) return;
        const alert = {
          id:            uuidv4(),
          shipment_id:   shipment.id,
          shipment_type: shipment.type,
          timestamp:     new Date().toISOString(),
          anomaly_count: result.detection.anomaly_count,
          will_breach:   result.forecast.will_breach,
          breach_in_min: result.forecast.breach_in_minutes,
          alert_message: result.forecast.alert_message,
          forecast:      result.forecast.forecast,
          severity:      result.forecast.will_breach ? "CRITICAL" : "WARNING",
        };

        addAlert(alert);
        if (broadcast) broadcast({ type: "ALERT", payload: alert });
        supabase.from("alerts").insert(alert).then(({ error }) => {
          if (error && !error.message?.includes("fetch failed"))
            console.error("[supabase]", error.message);
        });
      });
    }
  }
}

function start(broadcastFn) {
  broadcast = broadcastFn;
  const interval = parseInt(process.env.SIMULATOR_INTERVAL_MS || "5000");
  setInterval(runCycle, interval);
  console.log(`[simulator] started — ${SHIPMENTS.length} shipments, ${interval}ms interval`);
}

module.exports = { start, SHIPMENTS, memReadings, memLatest, memAlerts, addAlert };
