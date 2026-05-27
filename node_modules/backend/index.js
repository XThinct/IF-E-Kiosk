const express        = require("express");
const cors           = require("cors");
const http           = require("http");
const { WebSocketServer } = require("ws");
const { networkInterfaces } = require("os");
const { randomUUID } = require("crypto");
const db             = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

// ── REST routes ──────────────────────────────────────────────────────

app.get("/api/rooms/:roomName/schedules", async (req, res) => {
  try {
    const { roomName } = req.params;
    const result = await db.query(
      `SELECT s.id, s.day, s.start_time, s.end_time, s.subject, s.lecturer, s.class_code
       FROM schedules s
       JOIN rooms r ON s.room_id = r.id
       WHERE r.name = $1
       ORDER BY
         CASE s.day
           WHEN 'Senin'   THEN 1 WHEN 'Selasa' THEN 2 WHEN 'Rabu'   THEN 3
           WHEN 'Kamis'   THEN 4 WHEN 'Jumat'  THEN 5
           ELSE 6
         END, s.start_time`,
      [roomName]
    );
    res.json({ room: roomName, schedules: result.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/search", async (req, res) => {
  try {
    const q   = (req.query.q   || "").trim();
    const day = (req.query.day || "").trim();
    if (q.length < 2) return res.json([]);

    // Schedule results (filtered by day when provided)
    const schedParams = [`%${q}%`];
    const dayClause = day ? `AND s.day = $2` : "";
    if (day) schedParams.push(day);
    const schedResult = await db.query(
      `SELECT r.name AS room_name, 'schedule' AS result_type,
              s.day, s.start_time, s.end_time, s.class_code, s.subject, s.lecturer,
              NULL::text[] AS occupants, NULL::text AS label
       FROM schedules s
       JOIN rooms r ON s.room_id = r.id
       WHERE (r.name ILIKE $1 OR s.subject ILIKE $1 OR s.lecturer ILIKE $1)
       ${dayClause}
       ORDER BY r.name, s.start_time
       LIMIT 50`,
      schedParams
    );

    // Dosen room results (no day filter — these are always relevant)
    const dosenResult = await db.query(
      `SELECT dr.room_name, 'dosen' AS result_type,
              dr.type,
              NULL AS day, NULL AS start_time, NULL AS end_time,
              NULL AS class_code, NULL AS subject, NULL AS lecturer,
              COALESCE(
                ARRAY(SELECT name FROM dosen_occupants
                      WHERE room_id = dr.id ORDER BY sort_order),
                ARRAY[]::text[]
              ) AS occupants,
              dr.label
       FROM dosen_rooms dr
       WHERE dr.room_name ILIKE $1
          OR dr.label     ILIKE $1
          OR EXISTS (
               SELECT 1 FROM dosen_occupants
               WHERE room_id = dr.id AND name ILIKE $1
             )
       ORDER BY dr.room_name
       LIMIT 20`,
      [`%${q}%`]
    );

    res.json([...schedResult.rows, ...dosenResult.rows]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/rooms", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM rooms ORDER BY name");
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/rooms/:roomName/schedules", async (req, res) => {
  try {
    const { roomName } = req.params;
    const { day, start_time, end_time, subject, lecturer, class_code } = req.body;
    let roomResult = await db.query("SELECT id FROM rooms WHERE name = $1", [roomName]);
    if (roomResult.rows.length === 0) {
      roomResult = await db.query("INSERT INTO rooms (name) VALUES ($1) RETURNING id", [roomName]);
    }
    const roomId = roomResult.rows[0].id;
    const result = await db.query(
      `INSERT INTO schedules (room_id, day, start_time, end_time, subject, lecturer, class_code)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [roomId, day, start_time, end_time, subject, lecturer, class_code]
    );
    res.json({ id: result.rows[0].id, message: "Schedule added" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put("/api/schedules/:id", async (req, res) => {
  try {
    const { day, start_time, end_time, subject, lecturer, class_code } = req.body;
    await db.query(
      `UPDATE schedules SET day=$1,start_time=$2,end_time=$3,subject=$4,lecturer=$5,class_code=$6 WHERE id=$7`,
      [day, start_time, end_time, subject, lecturer, class_code, req.params.id]
    );
    res.json({ message: "Updated" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/schedules/:id", async (req, res) => {
  try {
    await db.query("DELETE FROM schedules WHERE id = $1", [req.params.id]);
    res.json({ message: "Deleted" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/dosen-rooms/:roomName", async (req, res) => {
  try {
    const { roomName } = req.params;
    const roomResult = await db.query(
      "SELECT id, room_name, type, label FROM dosen_rooms WHERE room_name = $1",
      [roomName]
    );
    if (roomResult.rows.length === 0) return res.status(404).json({ error: "Not found" });

    const room = roomResult.rows[0];
    const occupantsResult = await db.query(
      "SELECT name FROM dosen_occupants WHERE room_id = $1 ORDER BY sort_order",
      [room.id]
    );
    res.json({
      room_name: room.room_name,
      type:      room.type,
      label:     room.label,
      occupants: occupantsResult.rows.map((r) => r.name),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── WebSocket server ─────────────────────────────────────────────────

function getLocalIP() {
  const nets = networkInterfaces();
  const isPrivate = (addr) =>
    /^192\.168\./.test(addr) ||
    /^10\./.test(addr) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(addr);

  // Skip virtual gateway addresses (e.g. VMware, Hyper-V, Hotspot adapters)
  const isVirtualGateway = (addr) => addr.endsWith(".1") || addr.endsWith(".254");

  // Prefer real WiFi/Ethernet LAN IPs — skip virtual adapter gateways
  for (const name of Object.keys(nets)) {
    for (const net of (nets[name] || [])) {
      if (net.family === "IPv4" && !net.internal && isPrivate(net.address) && !isVirtualGateway(net.address))
        return net.address;
    }
  }
  // Second pass: allow .1/.254 in case that's the only private IP
  for (const name of Object.keys(nets)) {
    for (const net of (nets[name] || [])) {
      if (net.family === "IPv4" && !net.internal && isPrivate(net.address))
        return net.address;
    }
  }
  // Fallback: any non-internal IPv4
  for (const name of Object.keys(nets)) {
    for (const net of (nets[name] || [])) {
      if (net.family === "IPv4" && !net.internal) return net.address;
    }
  }
  return "localhost";
}

const server = http.createServer(app);
const wss    = new WebSocketServer({ server });

// sid → { tv: WebSocket | null, phone: WebSocket | null }
const sessions = new Map();

wss.on("connection", (ws, req) => {
  const params = new URL(req.url, "http://localhost").searchParams;
  const role   = params.get("role");
  const sid    = params.get("sid");

  // ── TV connects ──────────────────────────────────────────────────
  if (role === "tv") {
    const newSid = randomUUID();
    sessions.set(newSid, { tv: ws, phone: null });

    const localIP      = getLocalIP();
    const frontendPort = process.env.FRONTEND_PORT || 5173;
    ws.send(JSON.stringify({
      type:      "session",
      sid:       newSid,
      mobileUrl: `http://${localIP}:${frontendPort}/mobile?sid=${newSid}&host=${localIP}&port=${PORT}`,
    }));

    // relay TV → phone (state updates)
    ws.on("message", (data) => {
      const session = sessions.get(newSid);
      if (session?.phone?.readyState === 1) session.phone.send(data.toString());
    });

    ws.on("close", () => sessions.delete(newSid));

  // ── Phone connects ───────────────────────────────────────────────
  } else if (role === "phone" && sid && sessions.has(sid)) {
    const session  = sessions.get(sid);
    session.phone  = ws;

    if (session.tv?.readyState === 1) {
      session.tv.send(JSON.stringify({ type: "phoneConnected" }));
    }

    // relay phone → TV (commands)
    ws.on("message", (data) => {
      const s = sessions.get(sid);
      if (s?.tv?.readyState === 1) s.tv.send(data.toString());
    });

    ws.on("close", () => {
      const s = sessions.get(sid);
      if (s) {
        s.phone = null;
        if (s.tv?.readyState === 1) s.tv.send(JSON.stringify({ type: "phoneDisconnected" }));
      }
    });

  } else {
    ws.close(1008, "Invalid params");
  }
});

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
