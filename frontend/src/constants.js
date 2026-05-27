export const API_URL = "http://localhost:8000";

export const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"];

export const FLOORS = ["Lantai 1", "Lantai 2", "Lantai 3", "Lantai 4"];

export function getExt(name) { return name.split(".").pop().toLowerCase(); }

export const C = {
  bg:        "#08090f",
  sidebar:   "#0b0d18",
  card:      "#0f111c",
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

export const EXCLUDE = /pillar|box|lantai|tangga|pintu|sebelah/i;

// Classify a TC-model mesh to a floor index by name before falling back to Y position.
// This prevents exterior/structural geometry (Plaza_Supeno, IF_1xx rooms) from being
// mis-assigned when bounding-box extents distort the Y-based boundaries.
export const tcFloorByName = (name) => {
  const ifM = name.match(/^IF_([1-4])/i);
  if (ifM) return parseInt(ifM[1]) - 1;
  const lM = name.match(/^lantai[_\s]*([1-4])$/i);
  if (lM) return parseInt(lM[1]) - 1;
  const tM = name.match(/tembok.*lantai[_\s]*([1-4])/i);
  if (tM) return parseInt(tM[1]) - 1;
  if (/^plaza/i.test(name)) return 0;
  return -1;
};

const roomSort = (a, b) => {
  const isToilet = (n) => /toilet|wc|km|kamar/i.test(n);
  const ta = isToilet(a), tb = isToilet(b);
  if (ta !== tb) return ta ? 1 : -1;
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
};

const LANTAI3_ORDER = [
  (n) => /\bRPL\b/i.test(n),
  (n) => /\bKBJ\b/i.test(n),
  (n) => /\bKCV\b/i.test(n),
  (n) => /\bLP.?1\b/i.test(n),
  (n) => /\bHMTC\b/i.test(n),
  (n) => /surabaya/i.test(n),
  (n) => /pascasarjana/i.test(n),
  (n) => /\bnetics\b/i.test(n),
  (n) => /\bgiga\b/i.test(n),
  (n) => /co.{0,5}working/i.test(n) || /\bIUP\b/i.test(n),
  (n) => /jatim/i.test(n),
  (n) => /\bLP.?2\b/i.test(n),
  (n) => /\balpro\b/i.test(n),
  (n) => /\bMCI\b/i.test(n),
  (n) => /\bPKT\b/i.test(n),
  (n) => /toilet|wc|km|kamar/i.test(n),
];

const makeFloorSort = (matchers) => (a, b) => {
  const asDisplay = (n) => n.replace(/_/g, " ");
  const getIdx = (n) => {
    const d = asDisplay(n);
    for (let i = 0; i < matchers.length; i++) {
      if (matchers[i](n) || matchers[i](d)) return i;
    }
    return matchers.length;
  };
  const ia = getIdx(a), ib = getIdx(b);
  if (ia !== ib) return ia - ib;
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
};

export const getRoomSort = (floorName) => {
  if (floorName === "Lantai 3") return makeFloorSort(LANTAI3_ORDER);
  return roomSort;
};

export const displayName = (name) => name.replace(/_/g, " ");
