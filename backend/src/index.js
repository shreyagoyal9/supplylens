require("dotenv").config();
const http    = require("http");
const express = require("express");
const cors    = require("cors");
const morgan  = require("morgan");
const rateLimit = require("express-rate-limit");

const ws        = require("./websocket");
const simulator = require("./services/simulator");
const ml        = require("./services/mlClient");

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || "*" }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));
app.use(rateLimit({ windowMs: 60_000, max: 200, standardHeaders: true, legacyHeaders: false }));

app.use("/api/shipments", require("./routes/shipments"));
app.use("/api/sensors",   require("./routes/sensors"));
app.use("/api/alerts",    require("./routes/alerts"));

app.get("/health", async (req, res) => {
  res.json({
    status:     "ok",
    ml_service: (await ml.isHealthy()) ? "up" : "unreachable",
    uptime_s:   Math.floor(process.uptime()),
  });
});

app.use((req, res) => res.status(404).json({ error: "Not found" }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const server = http.createServer(app);
ws.init(server);
simulator.start(ws.broadcast);

const PORT = parseInt(process.env.PORT || "3001");
server.listen(PORT, () => {
  console.log(`\nSupplyLens API → http://localhost:${PORT}`);
  console.log(`WebSocket     → ws://localhost:${PORT}\n`);
});
