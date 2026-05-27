import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

import { API_URL, C, EXCLUDE, getRoomSort } from "./constants";
import { useThreeScene }  from "./hooks/useThreeScene";
import { useAnimations }  from "./hooks/useAnimations";
import { useModelLoader } from "./hooks/useModelLoader";
import { Sidebar }        from "./components/Sidebar";
import { SchedulePanel }  from "./components/SchedulePanel";
import { useTVWebSocket } from "./useWebSocket";
import { QROverlay }      from "./QROverlay";

export default function App() {
  const mountRef           = useRef(null);
  const lastActiveFloorRef = useRef(null);
  const pendingRoomRef     = useRef(null);

  const [status,       setStatus]       = useState("idle");
  const [fileName,     setFileName]     = useState("");
  const [modelInfo,    setModelInfo]    = useState(null);
  const [errorMsg,     setErrorMsg]     = useState("");
  const [activeFloor,  setActiveFloor]  = useState(null);
  const [activeRoom,   setActiveRoom]   = useState(null);
  const [view,         setView]         = useState("floors");
  const [schedule,     setSchedule]     = useState([]);
  const [schedLoading, setSchedLoading] = useState(false);
  const [schedError,   setSchedError]   = useState("");
  const [dosenInfo,    setDosenInfo]    = useState(null);

  // ── Three.js scene (renderer, camera, lights, controls) ──────────
  const sceneRef = useThreeScene(mountRef);

  // ── Floor/room animations ─────────────────────────────────────────
  const { floorAnimRef, isAnimatingRef, animateFloorTransition, animateTCIntro, animateFloorIntro } =
    useAnimations(sceneRef);

  // ── Model loading ─────────────────────────────────────────────────
  const { loadTC, loadFloorObjMtl, loadByFiles, highlightRoom } = useModelLoader({
    sceneRef, floorAnimRef, isAnimatingRef,
    animateFloorIntro, animateTCIntro, lastActiveFloorRef, pendingRoomRef,
    setStatus, setModelInfo, setErrorMsg, setFileName,
    setActiveFloor, setActiveRoom, setSchedule, setView,
  });

  // ── WebSocket command handler ─────────────────────────────────────
  const handleCmdRef = useRef(null);
  handleCmdRef.current = (action, payload) => {
    if (action === "selectFloor") {
      setActiveFloor(payload);
      animateFloorTransition(payload, () => loadFloorObjMtl(payload));
    }
    if (action === "selectRoom") { setActiveRoom(payload); highlightRoom(payload); }
    if (action === "selectFloorAndRoom") {
      const { floor, room } = payload;
      pendingRoomRef.current = room;
      setActiveFloor(floor);
      animateFloorTransition(floor, () => loadFloorObjMtl(floor));
    }
    if (action === "back") {
      lastActiveFloorRef.current = activeFloor;
      setActiveFloor(null); setView("floors"); loadTC();
    }

    if (action === "cameraRotate") {
      const { camera, controls } = sceneRef.current;
      if (!camera || !controls) return;
      const offset = new THREE.Vector3().subVectors(camera.position, controls.target);
      const sph = new THREE.Spherical().setFromVector3(offset);
      sph.theta -= payload.dx * 0.005;
      sph.phi    = Math.max(0.05, Math.min(Math.PI - 0.05, sph.phi - payload.dy * 0.005));
      offset.setFromSpherical(sph);
      camera.position.copy(controls.target).add(offset);
    }

    if (action === "cameraZoom") {
      const { camera, controls } = sceneRef.current;
      if (!camera || !controls) return;
      const offset = new THREE.Vector3().subVectors(camera.position, controls.target);
      const scale  = payload.scale ?? (payload.direction === "in" ? 0.93 : 1.07);
      const newLen = Math.max(controls.minDistance, Math.min(controls.maxDistance, offset.length() * scale));
      offset.setLength(newLen);
      camera.position.copy(controls.target).add(offset);
    }

    if (action === "cameraTransform") {
      const { camera, controls } = sceneRef.current;
      if (!camera || !controls) return;
      if (payload.zoom !== 1) {
        const offset = new THREE.Vector3().subVectors(camera.position, controls.target);
        const newLen = Math.max(controls.minDistance, Math.min(controls.maxDistance, offset.length() * payload.zoom));
        offset.setLength(newLen);
        camera.position.copy(controls.target).add(offset);
      }
      if (payload.panDx !== 0 || payload.panDy !== 0) {
        const distance = camera.position.distanceTo(controls.target);
        const speed    = distance * 0.002;
        const dir = new THREE.Vector3(), right = new THREE.Vector3(), up = new THREE.Vector3();
        camera.getWorldDirection(dir);
        right.crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
        up.crossVectors(right, dir).normalize();
        const panOffset = new THREE.Vector3()
          .addScaledVector(right, -payload.panDx * speed)
          .addScaledVector(up,     payload.panDy * speed);
        camera.position.add(panOffset);
        controls.target.add(panOffset);
      }
    }

    if (action === "cameraPan") {
      const { camera, controls } = sceneRef.current;
      if (!camera || !controls) return;
      const distance = camera.position.distanceTo(controls.target);
      const speed    = distance * 0.002;
      const dir = new THREE.Vector3(), right = new THREE.Vector3(), up = new THREE.Vector3();
      camera.getWorldDirection(dir);
      right.crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
      up.crossVectors(right, dir).normalize();
      const offset = new THREE.Vector3()
        .addScaledVector(right, -payload.dx * speed)
        .addScaledVector(up,     payload.dy * speed);
      camera.position.add(offset);
      controls.target.add(offset);
    }

    if (action === "cameraReset") {
      const { controls } = sceneRef.current;
      if (controls) controls.reset();
    }
  };

  // ── WebSocket (sync state to phone on connect) ────────────────────
  const sendStateRef = useRef(null);
  const { mobileUrl, phoneConnected, sendState } = useTVWebSocket({
    onCmd:          (action, payload) => handleCmdRef.current(action, payload),
    onPhoneConnect: () => sendStateRef.current(),
  });

  sendStateRef.current = () => {
    const rooms = modelInfo?.meshNames?.filter(n => !EXCLUDE.test(n)).sort(getRoomSort(activeFloor)) || [];
    sendState({ view, activeFloor, rooms });
  };

  useEffect(() => { sendStateRef.current(); }, [view, activeFloor, modelInfo]);

  // ── Schedule / dosen info fetch ───────────────────────────────────
  // Always try dosen-room info first; fall back to class schedule if not found.
  useEffect(() => {
    if (!activeRoom) { setSchedule([]); setDosenInfo(null); return; }

    setDosenInfo(null); setSchedule([]);
    fetch(`${API_URL}/api/dosen-rooms/${encodeURIComponent(activeRoom)}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) { setDosenInfo(data); return; }
        setSchedLoading(true); setSchedError("");
        fetch(`${API_URL}/api/rooms/${encodeURIComponent(activeRoom)}/schedules`)
          .then((r) => { if (!r.ok) throw new Error(`Server error: ${r.status}`); return r.json(); })
          .then((d) => { setSchedule(d.schedules || []); setSchedLoading(false); })
          .catch((err) => { setSchedError(err.message); setSchedLoading(false); });
      })
      .catch(() => setDosenInfo(null));
  }, [activeRoom]);

  // ── Load TC model on mount ────────────────────────────────────────
  useEffect(() => { loadTC(); }, []);

  // ── Layout ────────────────────────────────────────────────────────
  return (
    <div
      style={{ display: "flex", height: "100vh", background: C.bg, fontFamily: "'DM Mono', monospace", color: C.text }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); loadByFiles(e.dataTransfer.files); }}
    >
      <Sidebar
        view={view}
        activeFloor={activeFloor}
        activeRoom={activeRoom}
        modelInfo={modelInfo}
        status={status}
        errorMsg={errorMsg}
        isAnimatingRef={isAnimatingRef}
        onFloorSelect={(f) => { setActiveFloor(f); animateFloorTransition(f, () => loadFloorObjMtl(f)); }}
        onBack={() => { lastActiveFloorRef.current = activeFloor; setActiveFloor(null); setView("floors"); loadTC(); }}
        onRoomSelect={(name) => { setActiveRoom(name); highlightRoom(name); }}
      />

      {/* 3D viewport */}
      <div style={{ flex: 1, position: "relative" }}>
        <div ref={mountRef} style={{ width: "100%", height: "100%" }} />

        {activeFloor && status === "success" && (
          <div style={{ position: "absolute", top: "16px", left: "16px", background: "rgba(8,9,15,0.85)", border: `1px solid ${C.cyan}`, boxShadow: C.cyanGlow, borderRadius: "4px", padding: "6px 14px", fontSize: "12px", color: C.cyan, letterSpacing: "1px", backdropFilter: "blur(6px)" }}>
            {activeFloor}{activeRoom && <span style={{ color: C.sub }}> / {activeRoom.replace(/_/g, " ")}</span>}
          </div>
        )}

        <QROverlay mobileUrl={mobileUrl} phoneConnected={phoneConnected} />
      </div>

      <SchedulePanel
        roomName={activeRoom}
        dosenInfo={dosenInfo}
        schedule={schedule}
        loading={schedLoading}
        error={schedError}
      />
    </div>
  );
}
