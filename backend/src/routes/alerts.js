const express  = require("express");
const supabase = require("../services/supabase");
const { memAlerts } = require("../services/simulator");
const router   = express.Router();

const dbReady = () =>
  !!(process.env.SUPABASE_URL && !process.env.SUPABASE_URL.includes("your-project"));

router.get("/", async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || "20"), 100);
  try {
    if (dbReady()) {
      const { data } = await supabase
        .from("alerts").select("*")
        .order("timestamp", { ascending: false }).limit(limit);
      if (data) return res.json({ alerts: data });
    }
    res.json({ alerts: memAlerts.slice(0, limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/stats", (req, res) => {
  const stats = {
    total:       memAlerts.length,
    critical:    memAlerts.filter((a) => a.severity === "CRITICAL").length,
    warning:     memAlerts.filter((a) => a.severity === "WARNING").length,
    by_shipment: memAlerts.reduce((acc, a) => {
      acc[a.shipment_id] = (acc[a.shipment_id] || 0) + 1;
      return acc;
    }, {}),
  };
  res.json({ stats });
});

router.get("/:shipmentId", async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || "10"), 50);
  try {
    if (dbReady()) {
      const { data } = await supabase
        .from("alerts").select("*")
        .eq("shipment_id", req.params.shipmentId)
        .order("timestamp", { ascending: false }).limit(limit);
      if (data) return res.json({ alerts: data });
    }
    const filtered = memAlerts.filter((a) => a.shipment_id === req.params.shipmentId).slice(0, limit);
    res.json({ alerts: filtered });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
