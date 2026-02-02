import { WebSocketServer } from "ws";
import type { WSMessage } from "shared";

const wss = new WebSocketServer({ port: 8080 });

wss.on("connection", (ws) => {
  ws.on("message", (data) => {
    const msg = JSON.parse(data.toString()) as WSMessage;
    if (msg.type === "PING")
      ws.send(JSON.stringify({ type: "PONG" } satisfies WSMessage));
  });

  ws.send(JSON.stringify({ type: "PONG" } satisfies WSMessage));
});

console.log("WS server on ws://localhost:8080");
