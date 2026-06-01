import { useEffect, useRef, useState } from "react";

const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:3001";

export function useWebSocket(onMessage) {
  const [connected, setConnected] = useState(false);
  const ws      = useRef(null);
  const retry   = useRef(1000);
  const mounted = useRef(true);
  const ping    = useRef(null);
  const timer   = useRef(null);

  function connect() {
    if (!mounted.current) return;
    const socket = new WebSocket(WS_URL);
    ws.current = socket;

    socket.onopen = () => {
      if (!mounted.current) return socket.close();
      setConnected(true);
      retry.current = 1000;
      ping.current = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN)
          socket.send(JSON.stringify({ type: "PING" }));
      }, 25_000);
    };

    socket.onmessage = ({ data }) => {
      try {
        const msg = JSON.parse(data);
        if (msg.type !== "PONG") onMessage?.(msg);
      } catch {}
    };

    socket.onclose = () => {
      setConnected(false);
      clearInterval(ping.current);
      if (!mounted.current) return;
      timer.current = setTimeout(() => {
        retry.current = Math.min(retry.current * 2, 30_000);
        connect();
      }, retry.current);
    };

    socket.onerror = () => socket.close();
  }

  useEffect(() => {
    mounted.current = true;
    connect();
    return () => {
      mounted.current = false;
      clearInterval(ping.current);
      clearTimeout(timer.current);
      ws.current?.close();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { connected };
}
