const express = require("express");
const cors    = require("cors");
const axios   = require("axios");

const app    = express();
const PORT   = process.env.PORT || 3001;
const ML_URL = process.env.ML_URL || "http://localhost:5001";

app.use(cors());
app.use(express.json());

app.get("/api/shipments", async (req, res) => {
  try {
    const { data } = await axios.get(`${ML_URL}/shipments`);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: "ML service unreachable" });
  }
});

app.get("/api/shipments/:id/analysis", async (req, res) => {
  const { id } = req.params;
  try {
    const { data: readings } = await axios.get(`${ML_URL}/simulate/${id}`);
    const { data: result }   = await axios.post(`${ML_URL}/analyze`, {
      readings,
      shipment_id: id,
    });
    res.json(result);
  } catch (e) {
    console.error(e.message);
    res.status(500).json({ error: "Analysis failed" });
  }
});

app.get("/api/health", (req, res) => res.json({ status: "ok", service: "backend" }));

app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));