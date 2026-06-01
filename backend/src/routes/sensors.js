const express  = require("express");
const supabase = require("../services/supabase");
const ml       = require("../services/mlClient");
const { memReadings } = require("../services/simulator");
const router   = express.Router();

const dbReady = () =>
  !!(process.env.SUPABASE_URL && !process.env.SUPABASE_URL.includes("your-project"));

router.get("/recent", async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || "50"), 200);
  try {
    if (dbReady()) {
      const { data } = await supabase
        .from("sensor_readings").select("*")
        .order("timestamp", { ascending: false }).limit(limit);
      if (data) return res.json({ readings: data });
    }
    const all = Object.values(memReadings).flat()
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
    res.json({ readings: all });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:shipmentId", async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || "60"), 500);
  try {
    if (dbReady()) {
      const { data, count } = await supabase
        .from("sensor_readings").select("*", { count: "exact" })
        .eq("shipment_id", req.params.shipmentId)
        .order("timestamp", { ascending: false }).range(0, limit - 1);
      if (data) return res.json({ readings: data.reverse(), total: count });
    }
    const readings = [...(memReadings[req.params.shipmentId] || [])].slice(-limit);
    res.json({ readings, total: readings.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/analyze", async (req, res) => {
  const { readings, shipment_type = "pharma" } = req.body;
  if (!Array.isArray(readings) || readings.length < 5)
    return res.status(400).json({ error: "Need at least 5 readings" });

  const result = await ml.analyze(readings, shipment_type);
  if (!result) return res.status(503).json({ error: "ML service unavailable" });
  res.json(result);
});

module.exports = router;
