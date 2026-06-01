const axios = require("axios");

const http = axios.create({
  baseURL: process.env.ML_SERVICE_URL || "http://localhost:5001",
  timeout: 10_000,
});

const call = async (path, body) => {
  try {
    const { data } = await http.post(path, body);
    return data;
  } catch (err) {
    console.error(`[ml] ${path} failed:`, err.message);
    return null;
  }
};

module.exports = {
  detect:   (readings)                       => call("/api/detect",   { readings }),
  forecast: (recentTemps, shipmentType)      => call("/api/forecast", { recent_temps: recentTemps, shipment_type: shipmentType }),
  analyze:  (readings, shipmentType)         => call("/api/analyze",  { readings, shipment_type: shipmentType }),
  isHealthy: async () => {
    try {
      const { data } = await http.get("/health", { timeout: 3000 });
      return data.status === "ok";
    } catch {
      return false;
    }
  },
};
