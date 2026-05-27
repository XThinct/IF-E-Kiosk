import { C, displayName } from "../constants";

const JS_DAY_TO_ID = ["", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", ""];

function getTodayName() {
  return JS_DAY_TO_ID[new Date().getDay()] || null;
}

function DosenPanel({ roomName, dosenInfo }) {
  return (
    <div style={{ width: "300px", minWidth: "300px", background: C.sidebar, borderLeft: `1px solid ${C.border}`, display: "flex", flexDirection: "column", overflowY: "auto", fontFamily: "'DM Mono', monospace" }}>
      <div style={{ padding: "20px 16px 14px", borderBottom: `1px solid ${C.border}`, borderLeft: `3px solid ${C.cyan}`, background: "linear-gradient(90deg, rgba(0,217,255,0.05) 0%, transparent 100%)" }}>
        <p style={{ fontSize: "10px", letterSpacing: "2px", color: C.cyan, marginBottom: "6px", textTransform: "uppercase", textShadow: `0 0 8px ${C.cyan}` }}>
          {dosenInfo.type === "dosen" ? "Ruang Dosen" : "Informasi Ruangan"}
        </p>
        <p style={{ fontSize: "17px", fontWeight: "700", color: C.text, margin: 0, letterSpacing: "1px" }}>{displayName(roomName)}</p>
        <p style={{ fontSize: "11px", color: C.sub, margin: "6px 0 0", letterSpacing: "0.5px" }}>Lantai 2</p>
      </div>

      <div style={{ flex: 1, padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
        {dosenInfo.type === "dosen" ? (
          <>
            <p style={{ fontSize: "10px", letterSpacing: "2px", color: C.muted, textTransform: "uppercase", margin: 0 }}>Penghuni Ruangan</p>
            {dosenInfo.occupants.map((name, i) => (
              <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.cyan}`, borderRadius: "6px", padding: "12px 14px" }}>
                <span style={{ fontSize: "13px", color: C.text }}>▸ {name}</span>
              </div>
            ))}
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <p style={{ fontSize: "14px", color: C.sub, letterSpacing: "1px" }}>{dosenInfo.label}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function SchedulePanel({ roomName, dosenInfo, schedule, loading, error }) {
  const today       = getTodayName();
  const daySchedule = today ? schedule.filter((s) => s.day === today) : [];

  if (!roomName) return (
    <div style={{ width: "300px", minWidth: "300px", background: C.sidebar, borderLeft: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ fontSize: "12px", color: C.muted, textAlign: "center", padding: "20px", letterSpacing: "0.5px" }}>
        Pilih ruangan untuk melihat jadwal
      </p>
    </div>
  );

  if (dosenInfo) return <DosenPanel roomName={roomName} dosenInfo={dosenInfo} />;

  return (
    <div style={{ width: "300px", minWidth: "300px", background: C.sidebar, borderLeft: `1px solid ${C.border}`, display: "flex", flexDirection: "column", overflowY: "auto", fontFamily: "'DM Mono', monospace" }}>
      <div style={{ padding: "20px 16px 14px", borderBottom: `1px solid ${C.border}`, borderLeft: `3px solid ${C.cyan}`, background: "linear-gradient(90deg, rgba(0,217,255,0.05) 0%, transparent 100%)" }}>
        <p style={{ fontSize: "10px", letterSpacing: "2px", color: C.cyan, marginBottom: "6px", textTransform: "uppercase", textShadow: `0 0 8px ${C.cyan}` }}>Jadwal Kelas</p>
        <p style={{ fontSize: "17px", fontWeight: "700", color: C.text, margin: 0, letterSpacing: "1px" }}>{displayName(roomName)}</p>
        <p style={{ fontSize: "11px", color: C.sub, margin: "6px 0 0", letterSpacing: "0.5px" }}>
          {today ? today : "Akhir Pekan"}
        </p>
      </div>

      <div style={{ flex: 1, padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: C.cyan, fontSize: "12px" }}>
            <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span> Memuat jadwal...
          </div>
        )}
        {error && (
          <div style={{ background: "#200a10", border: "1px solid #5a1020", borderRadius: "6px", padding: "10px", fontSize: "12px", color: "#ff4060" }}>
            ⚠ {error}
          </div>
        )}
        {!loading && !error && !today && (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <p style={{ fontSize: "11px", color: C.muted, letterSpacing: "1px" }}>— AKHIR PEKAN —</p>
          </div>
        )}
        {!loading && !error && today && daySchedule.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <p style={{ fontSize: "11px", color: C.muted, letterSpacing: "1px" }}>— TIDAK ADA KELAS —</p>
          </div>
        )}
        {!loading && daySchedule.map((item) => (
          <div key={item.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.green}`, borderRadius: "6px", padding: "12px", display: "flex", flexDirection: "column", gap: "6px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ background: C.greenDim, border: `1px solid rgba(0,230,118,0.3)`, borderRadius: "4px", padding: "2px 8px", fontSize: "11px", color: C.green, fontWeight: "700" }}>
                {item.start_time} – {item.end_time}
              </span>
              {item.class_code && (
                <span style={{ fontSize: "10px", color: C.muted, letterSpacing: "1px" }}>{item.class_code}</span>
              )}
            </div>
            <p style={{ fontSize: "13px", fontWeight: "600", color: C.text, margin: 0 }}>{item.subject}</p>
            {item.lecturer && (
              <p style={{ fontSize: "11px", color: C.sub, margin: 0 }}>▸ {item.lecturer}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
