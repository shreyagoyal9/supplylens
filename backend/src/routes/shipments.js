const express = require("express");
const supabase = require("../services/supabase");
const { SHIPMENTS, memReadings, memLatest } = require("../services/simulator");
const router = express.Router();

const dbReady = () =>
  !!(process.env.SUPABASE_URL && !process.env.SUPABASE_URL.includes("your-project"));

router.get("/", async (req, res) => {
  try {
    const shipments = await Promise.all(
      SHIPMENTS.map(async (s) => {
        let latest = memLatest[s.id];

        if (dbReady()) {
          const { data } = await supabase
            .from("sensor_readings")
            .select("*").eq("shipment_id", s.id)
            .order("timestamp", { ascending: false }).limit(1).single();
          if (data) latest = data;
        }

        return {
          id: s.id, type: s.type, origin: s.origin,
          destination: s.dest, threshold: s.threshold,
          latest, status: latest?.status || "NORMAL",
        };
      })
    );
    res.json({ shipments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  const config = SHIPMENTS.find((s) => s.id === req.params.id);
  if (!config) return res.status(404).json({ error: "Shipment not found" });

  try {
    let readings = [...(memReadings[req.params.id] || [])];

    if (dbReady()) {
      const { data } = await supabase
        .from("sensor_readings").select("*")
        .eq("shipment_id", req.params.id)
        .order("timestamp", { ascending: false }).limit(60);
      if (data?.length) readings = data.reverse();
    }

    res.json({ shipment: config, readings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id/stats", async (req, res) => {
  try {
    const data = [...(memReadings[req.params.id] || [])];
    if (!data.length) return res.json({ stats: null });

    const temps = data.map((r) => r.temperature);
    res.json({
      stats: {
        reading_count: data.length,
        temp_avg:      +(temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(2),
        temp_min:      +Math.min(...temps).toFixed(2),
        temp_max:      +Math.max(...temps).toFixed(2),
        breach_count:  data.filter((r) => r.is_breach).length,
        anomaly_count: data.filter((r) => r.is_anomaly).length,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
