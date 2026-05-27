import { C, FLOORS, EXCLUDE, getRoomSort, displayName } from "../constants";

function sidebarLabel(text) {
  return (
    <p style={{ fontSize: "10px", letterSpacing: "2px", color: C.cyan, marginBottom: "10px", textTransform: "uppercase", textShadow: `0 0 8px ${C.cyan}` }}>
      {text}
    </p>
  );
}

function FloorBtn({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      background:   active ? C.cyanDim : "transparent",
      border:       `1px solid ${active ? C.cyan : C.border}`,
      borderLeft:   active ? `3px solid ${C.cyan}` : `3px solid transparent`,
      borderRadius: "6px", padding: "9px 12px", width: "100%",
      color:        active ? C.cyan : C.sub, fontSize: "13px",
      cursor: "pointer", textAlign: "left", transition: "all 0.2s",
      boxShadow:    active ? C.cyanGlow : "none", letterSpacing: "0.5px",
    }}>
      {label}
    </button>
  );
}

function RoomBtn({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      background:   active ? C.greenDim : "transparent",
      border:       `1px solid ${active ? C.green : C.border}`,
      borderLeft:   active ? `3px solid ${C.green}` : `3px solid transparent`,
      borderRadius: "6px", padding: "9px 12px", width: "100%",
      color:        active ? C.green : C.sub, fontSize: "13px",
      cursor: "pointer", textAlign: "left", transition: "all 0.2s",
      boxShadow:    active ? C.greenGlow : "none", letterSpacing: "0.5px",
    }}>
      {displayName(label)}
    </button>
  );
}

export function Sidebar({
  view,
  activeFloor,
  activeRoom,
  modelInfo,
  status,
  errorMsg,
  isAnimatingRef,
  onFloorSelect,
  onBack,
  onRoomSelect,
}) {
  return (
    <div style={{ width: "260px", minWidth: "260px", background: C.sidebar, borderRight: `1px solid ${C.border}`, borderTop: `2px solid ${C.cyan}`, display: "flex", flexDirection: "column", padding: "20px 16px", gap: "20px", overflowY: "auto", boxShadow: "inset -1px 0 20px rgba(0,0,0,0.4)" }}>

      {/* header */}
      <div style={{ paddingBottom: "16px", borderBottom: `1px solid ${C.border}` }}>
        <p style={{ fontSize: "9px", letterSpacing: "3px", color: "#ffffff", textTransform: "uppercase", marginBottom: "4px" }}>Teknik Informatika</p>
        <p style={{ fontSize: "20px", fontWeight: "700", margin: 0, letterSpacing: "2px", lineHeight: 1.2, textShadow: `0 0 16px ${C.cyan}` }}>
          <span style={{ color: C.cyan }}>IF </span>
          <span style={{ color: C.cyan }}>E-KIOSK</span>
        </p>
      </div>

      {/* floor picker */}
      {view === "floors" && (
        <div>
          {sidebarLabel("Pilih Lantai")}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {FLOORS.map((f) => (
              <FloorBtn key={f} label={f} active={activeFloor === f}
                onClick={() => {
                  if (isAnimatingRef.current) return;
                  onFloorSelect(f);
                }} />
            ))}
          </div>
        </div>
      )}

      {/* room picker */}
      {view === "rooms" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <button onClick={onBack} style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: "6px", padding: "7px 12px", color: C.sub, fontSize: "12px", cursor: "pointer", textAlign: "left", transition: "all 0.2s", letterSpacing: "0.5px" }}>
            ← Kembali
          </button>
          <div>
            {sidebarLabel(activeFloor || "Ruangan")}
            <p style={{ fontSize: "10px", color: C.muted, letterSpacing: "1px" }}>
              {modelInfo?.meshNames?.filter(n => !EXCLUDE.test(n)).length || 0} ruangan terdeteksi
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {modelInfo?.meshNames?.length > 0 ? (
              modelInfo.meshNames
                .filter((name) => !EXCLUDE.test(name))
                .sort(getRoomSort(activeFloor))
                .map((name) => (
                  <RoomBtn key={name} label={name} active={activeRoom === name}
                    onClick={() => onRoomSelect(name)} />
                ))
            ) : (
              <p style={{ fontSize: "11px", color: C.muted, lineHeight: "1.6" }}>Tidak ada mesh ditemukan.</p>
            )}
          </div>
        </div>
      )}

      {/* status indicators */}
      {status === "loading" && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: C.cyan, fontSize: "12px", letterSpacing: "0.5px" }}>
          <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span>
          Memuat...
        </div>
      )}
      {status === "error" && (
        <div style={{ background: "#200a10", border: "1px solid #5a1020", borderRadius: "6px", padding: "10px", fontSize: "12px", color: "#ff4060" }}>
          ⚠ {errorMsg}
        </div>
      )}

      {/* controls hint */}
      <div style={{ marginTop: "auto", fontSize: "10px", color: C.muted, lineHeight: "2", letterSpacing: "0.5px", borderTop: `1px solid ${C.border}`, paddingTop: "12px" }}>
        <p style={{ margin: "0 0 4px", color: C.sub, letterSpacing: "1px", fontSize: "9px", textTransform: "uppercase" }}>Kontrol</p>
        Drag Kiri — orbit · Drag Kanan — pan<br />Scroll — zoom
      </div>
    </div>
  );
}
