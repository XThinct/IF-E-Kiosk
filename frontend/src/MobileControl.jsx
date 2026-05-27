import { useEffect, useRef, useState } from "react";

const FLOORS = ["Lantai 1", "Lantai 2", "Lantai 3", "Lantai 4"];
const EXCLUDE = /pillar|box|lantai|tangga/i;
const displayName = (name) => name.replace(/_/g, " ");

// Derive the floor name from a room name (e.g. "IF_301" → "Lantai 3").
// Returns null if the pattern isn't recognised.
function roomToFloor(name) {
  const m = name.match(/^IF_([1-4])/i);
  if (m) return `Lantai ${m[1]}`;
  return null;
}

const JS_DAY_TO_ID = ["", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", ""];
const TODAY = JS_DAY_TO_ID[new Date().getDay()] || null; // null on weekends

const C = {
  bg:        "#08090f",
  card:      "#0b0d18",
  border:    "#1a1d2e",
  cyan:      "#00d9ff",
  cyanDim:   "rgba(0,217,255,0.12)",
  cyanGlow:  "0 0 12px rgba(0,217,255,0.35)",
  green:     "#00e676",
  greenDim:  "rgba(0,230,118,0.1)",
  greenGlow: "0 0 12px rgba(0,230,118,0.3)",
  text:      "#c8d8f0",
  muted:     "#3a4460",
  sub:       "#6a7890",
};

function CameraControls({ send }) {
  const ptrs    = useRef(new Map()); // pointerId → {x, y}
  const pending = useRef(null);      // accumulated transform waiting for rAF flush
  const rafId   = useRef(null);

  const vals    = () => [...ptrs.current.values()];
  const getMid  = () => ({ x: (vals()[0].x + vals()[1].x) / 2, y: (vals()[0].y + vals()[1].y) / 2 });
  const getDist = () => { const [a, b] = vals(); return Math.hypot(b.x - a.x, b.y - a.y); };

  const scheduleTransform = (panDx, panDy, zoom) => {
    if (!pending.current) pending.current = { panDx: 0, panDy: 0, zoom: 1 };
    pending.current.panDx += panDx;
    pending.current.panDy += panDy;
    pending.current.zoom  *= zoom;
    if (!rafId.current) {
      rafId.current = requestAnimationFrame(() => {
        send("cameraTransform", pending.current);
        pending.current = null;
        rafId.current   = null;
      });
    }
  };

  const onPointerDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
  };

  const onPointerMove = (e) => {
    if (!ptrs.current.has(e.pointerId)) return;
    const count = ptrs.current.size;

    if (count === 1) {
      const prev = ptrs.current.get(e.pointerId);
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5)
        send("cameraRotate", { dx, dy });
    } else if (count === 2) {
      const oldMid  = getMid();
      const oldDist = getDist();
      ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const newMid  = getMid();
      const newDist = getDist();

      const panDx = newMid.x - oldMid.x;
      const panDy = newMid.y - oldMid.y;
      const zoom  = oldDist > 1 ? oldDist / newDist : 1;
      scheduleTransform(panDx, panDy, zoom);
    }
  };

  const onPointerUp = (e) => { ptrs.current.delete(e.pointerId); };

  return (
    <div style={{
      borderTop: `1px solid ${C.border}`,
      background: C.card,
      padding: "12px 16px 24px",
      display: "flex",
      flexDirection: "column",
      gap: "10px",
      flexShrink: 0,
    }}>
      <p style={{ fontSize: "9px", letterSpacing: "2px", color: C.cyan, margin: 0, textTransform: "uppercase", textShadow: `0 0 8px ${C.cyan}` }}>
        Kontrol Kamera
      </p>

      {/* Rotate drag pad */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          height: "110px",
          background: "rgba(0,217,255,0.04)",
          border: `1px solid rgba(0,217,255,0.15)`,
          borderRadius: "10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          touchAction: "none",
          userSelect: "none",
          cursor: "grab",
        }}
      >
        <span style={{ color: "rgba(0,217,255,0.3)", fontSize: "11px", letterSpacing: "1.5px", pointerEvents: "none", textTransform: "uppercase" }}>
          1 finger: rotate  ·  2 fingers: pan / pinch
        </span>
      </div>

      {/* Reset row */}
      <button
        onClick={() => send("cameraReset")}
        style={{
          width: "100%",
          padding: "14px 0",
          background: "transparent",
          border: `1px solid ${C.border}`,
          borderRadius: "8px",
          color: C.sub,
          fontSize: "10px",
          letterSpacing: "1.5px",
          cursor: "pointer",
          fontFamily: "'DM Mono', monospace",
          textTransform: "uppercase",
        }}
      >Reset View</button>
    </div>
  );
}

export default function MobileControl() {
  const params = new URLSearchParams(window.location.search);
  const sid  = params.get("sid");
  const host = params.get("host");
  const port = params.get("port");

  const wsRef          = useRef(null);
  const intentionalRef = useRef(false);
  const searchTimerRef = useRef(null);
  const [connected,     setConnected]     = useState(false);
  const [didDisconnect, setDidDisconnect] = useState(false);
  const [tvView,        setTvView]        = useState("floors");
  const [tvFloor,       setTvFloor]       = useState(null);
  const [tvRooms,       setTvRooms]       = useState([]);
  const [query,         setQuery]         = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const apiBase = host && port ? `http://${host}:${port}` : "http://localhost:8000";

  const disconnect = () => {
    intentionalRef.current = true;
    wsRef.current?.close();
  };

  useEffect(() => {
    if (!sid || !host || !port) return;
    const ws = new WebSocket(`ws://${host}:${port}?role=phone&sid=${sid}`);
    wsRef.current = ws;
    ws.onopen    = () => setConnected(true);
    ws.onclose   = () => { setConnected(false); if (intentionalRef.current) setDidDisconnect(true); };
    ws.onerror   = () => setConnected(false);
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === "state") {
        setTvView(msg.view);
        setTvFloor(msg.activeFloor);
        setTvRooms(msg.rooms || []);
      }
    };
    return () => ws.close();
  }, []);

  // Debounced search — fires 350 ms after the user stops typing
  useEffect(() => {
    clearTimeout(searchTimerRef.current);
    if (query.trim().length < 2) { setSearchResults([]); return; }
    setSearchLoading(true);
    searchTimerRef.current = setTimeout(() => {
      const dayParam = TODAY ? `&day=${encodeURIComponent(TODAY)}` : "";
      fetch(`${apiBase}/api/search?q=${encodeURIComponent(query.trim())}${dayParam}`)
        .then((r) => r.json())
        .then((data) => { setSearchResults(Array.isArray(data) ? data : []); setSearchLoading(false); })
        .catch(() => { setSearchResults([]); setSearchLoading(false); });
    }, 350);
    return () => clearTimeout(searchTimerRef.current);
  }, [query]);

  const send = (action, payload) => {
    if (wsRef.current?.readyState === 1) {
      wsRef.current.send(JSON.stringify({ type: "cmd", action, payload }));
    }
  };

  const btnStyle = (active, accent) => ({
    width: "100%",
    padding: "16px 20px",
    borderRadius: "10px",
    fontSize: "15px",
    cursor: "pointer",
    textAlign: "left",
    letterSpacing: "0.5px",
    fontFamily: "'DM Mono', monospace",
    transition: "all 0.15s",
    background: active ? (accent === "cyan" ? C.cyanDim : C.greenDim) : C.card,
    border: `1px solid ${active ? (accent === "cyan" ? C.cyan : C.green) : C.border}`,
    borderLeft: `4px solid ${active ? (accent === "cyan" ? C.cyan : C.green) : "transparent"}`,
    color: active ? (accent === "cyan" ? C.cyan : C.green) : C.text,
    boxShadow: active ? (accent === "cyan" ? C.cyanGlow : C.greenGlow) : "none",
  });

  if (!connected) return (
    <div style={{ height: "100dvh", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'DM Mono', monospace", padding: "20px", gap: "12px" }}>
      {didDisconnect ? (
        <>
          <p style={{ fontSize: "28px", opacity: 0.4, margin: 0 }}>✓</p>
          <p style={{ color: C.sub, fontSize: "13px", letterSpacing: "1px", margin: 0, textAlign: "center" }}>
            Sesi selesai.
          </p>
          <p style={{ color: C.muted, fontSize: "11px", letterSpacing: "1px", margin: 0, textAlign: "center" }}>
            Scan QR code di layar TV untuk sesi baru.
          </p>
        </>
      ) : (
        <>
          <p style={{ fontSize: "28px", opacity: 0.3, margin: 0 }}>⟳</p>
          <p style={{ color: C.sub, fontSize: "13px", letterSpacing: "1px", margin: 0, textAlign: "center" }}>
            {(!sid || !host || !port) ? "URL tidak valid. Scan ulang QR code." : "Menghubungkan ke TV..."}
          </p>
        </>
      )}
    </div>
  );

  const rooms = tvRooms.filter(n => !EXCLUDE.test(n));

  return (
    <div style={{ height: "100dvh", background: C.bg, fontFamily: "'DM Mono', monospace", display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* Header */}
      <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}`, borderTop: `2px solid ${C.cyan}`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontSize: "8px", letterSpacing: "3px", color: "#ffffff", textTransform: "uppercase", margin: "0 0 2px" }}>Teknik Informatika</p>
          <p style={{ fontSize: "18px", fontWeight: "700", margin: 0, letterSpacing: "2px", textShadow: `0 0 16px ${C.cyan}` }}>
            <span style={{ color: C.cyan }}>IF </span>
            <span style={{ color: C.cyan }}>E-KIOSK</span>
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: C.green, boxShadow: C.greenGlow, flexShrink: 0 }} />
            <span style={{ fontSize: "10px", color: C.sub, letterSpacing: "1px" }}>Terhubung</span>
          </div>
          <button onClick={disconnect} style={{
            background: "transparent",
            border: "1px solid rgba(255,60,80,0.35)",
            borderRadius: "6px",
            padding: "5px 10px",
            color: "rgba(255,100,120,0.8)",
            fontSize: "10px",
            letterSpacing: "1px",
            cursor: "pointer",
            fontFamily: "'DM Mono', monospace",
            textTransform: "uppercase",
          }}>
            Selesai
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div style={{ padding: "10px 16px 0", flexShrink: 0 }}>
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: C.muted, fontSize: "13px", pointerEvents: "none" }}>⌕</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari ruangan, mata kuliah, dosen..."
            style={{
              width: "100%", boxSizing: "border-box",
              background: C.card, border: `1px solid ${query ? C.cyan : C.border}`,
              borderRadius: "8px", padding: "11px 36px 11px 32px",
              color: C.text, fontSize: "13px", fontFamily: "'DM Mono', monospace",
              letterSpacing: "0.3px", outline: "none",
              boxShadow: query ? `0 0 0 1px rgba(0,217,255,0.2)` : "none",
              transition: "border-color 0.15s, box-shadow 0.15s",
            }}
          />
          {query && (
            <button onClick={() => setQuery("")} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: C.muted, fontSize: "14px", cursor: "pointer", padding: "4px" }}>✕</button>
          )}
        </div>
      </div>

      {/* Scrollable content: search results OR floor/room list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px 16px", display: "flex", flexDirection: "column", gap: "10px" }}>

        {/* ── Search results ── */}
        {query.trim().length >= 2 && (
          <>
            {searchLoading && (
              <p style={{ fontSize: "11px", color: C.cyan, letterSpacing: "1px", margin: "8px 0" }}>
                <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span> Mencari...
              </p>
            )}
            {!searchLoading && searchResults.length === 0 && (
              <p style={{ fontSize: "11px", color: C.muted, letterSpacing: "1px", textAlign: "center", marginTop: "24px" }}>
                Tidak ada hasil.
              </p>
            )}
            {!searchLoading && searchResults.map((item, i) => {
              const floor = roomToFloor(item.room_name);
              const isDosen = item.result_type === "dosen";
              return (
                <button
                  key={i}
                  onClick={() => {
                    if (floor) {
                      send("selectFloorAndRoom", { floor, room: item.room_name });
                    } else {
                      send("selectRoom", item.room_name);
                    }
                    setQuery("");
                  }}
                  style={{
                    width: "100%", textAlign: "left", cursor: "pointer",
                    background: C.card, border: `1px solid ${C.border}`,
                    borderLeft: `4px solid ${isDosen ? C.cyan : C.green}`, borderRadius: "10px",
                    padding: "12px 14px", fontFamily: "'DM Mono', monospace",
                    display: "flex", flexDirection: "column", gap: "5px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                    <span style={{ fontSize: "14px", fontWeight: "700", color: isDosen ? C.cyan : C.green, letterSpacing: "0.5px" }}>
                      {displayName(item.room_name)}
                    </span>
                    {floor && (
                      <span style={{ fontSize: "10px", color: C.muted, letterSpacing: "1px", flexShrink: 0 }}>{floor}</span>
                    )}
                  </div>

                  {isDosen ? (
                    item.type === "dosen" && item.occupants?.length > 0 ? (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                        {item.occupants.map((name, j) => (
                          <span key={j} style={{ fontSize: "11px", color: C.sub }}>
                            {j > 0 && <span style={{ color: C.muted, marginRight: "4px" }}>·</span>}▸ {name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span style={{ fontSize: "12px", color: C.sub, letterSpacing: "0.5px" }}>
                        {item.label || displayName(item.room_name)}
                      </span>
                    )
                  ) : (
                    <>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                        {item.class_code && (
                          <span style={{ fontSize: "10px", color: C.cyan, background: "rgba(0,217,255,0.08)", border: "1px solid rgba(0,217,255,0.2)", borderRadius: "4px", padding: "1px 6px", letterSpacing: "0.5px" }}>
                            {item.class_code}
                          </span>
                        )}
                        <span style={{ fontSize: "13px", color: C.text, letterSpacing: "0.3px" }}>{item.subject}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        {item.lecturer && (
                          <span style={{ fontSize: "11px", color: C.sub }}>▸ {item.lecturer}</span>
                        )}
                        <span style={{ fontSize: "10px", color: C.muted, marginLeft: "auto" }}>
                          {item.start_time}–{item.end_time}
                        </span>
                      </div>
                    </>
                  )}
                </button>
              );
            })}
          </>
        )}

        {/* ── Normal floor / room list (hidden while searching) ── */}
        {query.trim().length < 2 && (
          <>
            {tvView === "rooms" && (
              <button onClick={() => send("back")} style={{
                padding: "10px 16px", background: "transparent",
                border: `1px solid ${C.border}`, borderRadius: "8px",
                color: C.sub, fontSize: "12px", cursor: "pointer",
                textAlign: "left", letterSpacing: "0.5px",
                fontFamily: "'DM Mono', monospace", width: "fit-content",
              }}>
                ← Kembali
              </button>
            )}

            <div>
              <p style={{ fontSize: "10px", letterSpacing: "2px", color: C.cyan, margin: "0 0 4px", textTransform: "uppercase", textShadow: `0 0 8px ${C.cyan}` }}>
                {tvView === "floors" ? "Pilih Lantai" : (tvFloor || "Ruangan")}
              </p>
              {tvView === "rooms" && (
                <p style={{ fontSize: "10px", color: C.muted, letterSpacing: "1px", margin: 0 }}>{rooms.length} ruangan terdeteksi</p>
              )}
            </div>

            {tvView === "floors" && FLOORS.map((f) => (
              <button key={f} onClick={() => send("selectFloor", f)} style={btnStyle(tvFloor === f, "cyan")}>
                {f}
              </button>
            ))}

            {tvView === "rooms" && rooms.length === 0 && (
              <p style={{ fontSize: "12px", color: C.muted, letterSpacing: "0.5px" }}>Tidak ada ruangan terdeteksi.</p>
            )}
            {tvView === "rooms" && rooms.map((name) => (
              <button key={name} onClick={() => send("selectRoom", name)} style={btnStyle(false, "green")}>
                {displayName(name)}
              </button>
            ))}
          </>
        )}
      </div>

      {/* Camera controls — always visible at bottom */}
      <CameraControls send={send} />
    </div>
  );
}
