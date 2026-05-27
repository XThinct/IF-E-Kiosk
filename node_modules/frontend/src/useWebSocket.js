import { useEffect, useRef, useState } from "react";

const WS_URL = "ws://localhost:8000";

/**
 * Connects the TV browser to the backend WebSocket relay.
 *
 * @param {object} callbacks
 * @param {(action, payload) => void} callbacks.onCmd         - called when phone sends a command
 * @param {() => void}                callbacks.onPhoneConnect - called when phone pairs (use to sync state)
 *
 * @returns {{ mobileUrl, phoneConnected, sendState }}
 *   - mobileUrl:      URL encoded in the QR code (empty until session is established)
 *   - phoneConnected: true while a phone is paired to this session
 *   - sendState:      call this to push current app state to the phone
 */
export function useTVWebSocket({ onCmd, onPhoneConnect }) {
  const wsRef          = useRef(null);
  const onCmdRef       = useRef(onCmd);
  const onConnectRef   = useRef(onPhoneConnect);

  const [mobileUrl,      setMobileUrl]      = useState("");
  const [phoneConnected, setPhoneConnected] = useState(false);

  // keep callbacks fresh on every render without re-running the effect
  onCmdRef.current     = onCmd;
  onConnectRef.current = onPhoneConnect;

  const sendState = (state) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "state", ...state }));
    }
  };

  useEffect(() => {
    let active = true;
    const ws = new WebSocket(`${WS_URL}?role=tv`);

    ws.onopen = () => {
      if (!active) { ws.close(); return; }
      wsRef.current = ws;
    };

    ws.onmessage = (e) => {
      if (!active) return;
      const msg = JSON.parse(e.data);

      if (msg.type === "session") {
        setMobileUrl(msg.mobileUrl);
      }
      if (msg.type === "phoneConnected") {
        setPhoneConnected(true);
        // small delay so React state has settled before we broadcast
        setTimeout(() => onConnectRef.current?.(), 100);
      }
      if (msg.type === "phoneDisconnected") {
        setPhoneConnected(false);
      }
      if (msg.type === "cmd") {
        onCmdRef.current?.(msg.action, msg.payload);
      }
    };

    ws.onclose = () => {
      if (!active) return;
      wsRef.current = null;
      setPhoneConnected(false);
      setMobileUrl("");
    };

    return () => {
      active = false;
      wsRef.current = null;
      // only close if already OPEN — avoids StrictMode "closed before
      // established" warning when the cleanup fires mid-handshake
      if (ws.readyState === WebSocket.OPEN) ws.close();
    };
  }, []);

  return { mobileUrl, phoneConnected, sendState };
}
