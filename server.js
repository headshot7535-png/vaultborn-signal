import { WebSocketServer } from "ws";
const wss = new WebSocketServer({ port: process.env.PORT || 8080 });
const rooms = new Map(); // code -> {host, guest, offer}
const send = (ws, m) => { try { ws.send(JSON.stringify(m)); } catch {} };

wss.on("connection", ws => {
  ws.on("message", data => {
    let m; try { m = JSON.parse(data) } catch { return }
    const code = (m.code||"").toUpperCase();
    if (!code || code.length !== 6) return;

    if (m.t === "host") {
      const r = rooms.get(code) || {};
      r.host = ws; rooms.set(code, r);
    } else if (m.t === "join") {
      const r = rooms.get(code);
      if (r?.host) { r.guest = ws; if (r.offer) send(ws, { t:"offer", code, sdp:r.offer }); }
      else send(ws, { t:"err", msg:"Room not found" });
    } else if (m.t === "offer") {
      const r = rooms.get(code) || (rooms.set(code, {}), rooms.get(code));
      r.offer = m.sdp; if (r.guest) send(r.guest, { t:"offer", code, sdp:m.sdp });
    } else if (m.t === "answer") {
      const r = rooms.get(code); if (r?.host) send(r.host, { t:"answer", code, sdp:m.sdp });
    }
  });

  ws.on("close", () => {
    for (const [code, r] of rooms) {
      if (r.host === ws) rooms.delete(code);
      else if (r.guest === ws) r.guest = null;
    }
  });
});
console.log("Signal server up");

