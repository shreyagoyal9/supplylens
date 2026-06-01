const WebSocket = require("ws");

let wss = null;

function init(server) {
  wss = new WebSocket.Server({ server });

  wss.on("connection", (ws, req) => {
    ws.send(JSON.stringify({
      type:    "CONNECTED",
      payload: { timestamp: new Date().toISOString() },
    }));

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw);
        if (msg.type === "PING") ws.send(JSON.stringify({ type: "PONG" }));
      } catch {}
    });

    ws.on("error", (err) => console.error("[ws] client error:", err.message));
  });

  // Keep connections alive through Railway's idle timeout
  setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) ws.ping();
    });
  }, 30_000);
}

function broadcast(message) {
  if (!wss) return;
  const payload = JSON.stringify(message);
  wss.clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(payload);
  });
}

module.exports = { init, broadcast };
