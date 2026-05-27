import { useRef } from "react";
import * as THREE from "three";
import { FLOORS, tcFloorByName } from "../constants";

export function useAnimations(sceneRef) {
  const floorAnimRef    = useRef(null);
  const isAnimatingRef  = useRef(false);

  const animateFloorTransition = (selectedFloor, callback) => {
    const { scene } = sceneRef.current;
    const model = scene.getObjectByName("__loaded_model__");
    if (!model) { callback(); return; }

    const selectedIdx = FLOORS.indexOf(selectedFloor);
    if (selectedIdx === -1) { callback(); return; }

    const totalBox = new THREE.Box3().setFromObject(model);
    const minY     = totalBox.min.y;
    const totalH   = totalBox.max.y - minY;
    if (totalH === 0) { callback(); return; }
    const floorH = totalH / FLOORS.length;

    const meshData = [];
    model.traverse((child) => {
      if (!child.isMesh) return;
      const box      = new THREE.Box3().setFromObject(child);
      const named    = tcFloorByName(child.name);
      const floorIdx = named !== -1
        ? named
        : Math.min(FLOORS.length - 1, Math.floor((box.min.y - minY) / floorH));

      if (floorIdx > selectedIdx) {
        const origLocalY   = child.position.y;
        const relIdx       = floorIdx - selectedIdx - 1;
        const totalAbove   = FLOORS.length - 1 - selectedIdx;
        const staggerDelay = totalAbove > 1
          ? ((totalAbove - 1 - relIdx) / (totalAbove - 1)) * 0.3
          : 0;
        const mats = (Array.isArray(child.material) ? child.material : [child.material]).filter(Boolean);
        mats.forEach((m) => { m.transparent = true; });
        meshData.push({ mesh: child, origLocalY, staggerDelay, dir: 1 });
      } else if (floorIdx < selectedIdx) {
        const origLocalY   = child.position.y;
        const relIdx       = selectedIdx - floorIdx - 1;
        const totalBelow   = selectedIdx;
        const staggerDelay = totalBelow > 1
          ? ((totalBelow - 1 - relIdx) / (totalBelow - 1)) * 0.3
          : 0;
        const mats = (Array.isArray(child.material) ? child.material : [child.material]).filter(Boolean);
        mats.forEach((m) => { m.transparent = true; });
        meshData.push({ mesh: child, origLocalY, staggerDelay, dir: -1 });
      } else {
        // Selected floor: fade out in place (no Y movement) after other floors have moved away.
        // This prevents structural elements like Plaza_Supeno or pillar boxes (which land on
        // floorIdx === selectedIdx via Y-position fallback) from lingering visibly.
        const origLocalY = child.position.y;
        const mats = (Array.isArray(child.material) ? child.material : [child.material]).filter(Boolean);
        mats.forEach((m) => { m.transparent = true; });
        meshData.push({ mesh: child, origLocalY, staggerDelay: 0.5, dir: 0 });
      }
    });

    if (meshData.length === 0) { callback(); return; }

    if (floorAnimRef.current) cancelAnimationFrame(floorAnimRef.current);
    isAnimatingRef.current = true;

    const DURATION  = 700;
    const startTime = performance.now();

    const tick = (now) => {
      const t = Math.min((now - startTime) / DURATION, 1);

      meshData.forEach(({ mesh, origLocalY, staggerDelay, dir }) => {
        const localT = staggerDelay >= 1
          ? 0
          : Math.max(0, Math.min(1, (t - staggerDelay) / (1 - staggerDelay)));
        const eased = localT * localT; // easeInQuad — accelerate away

        mesh.position.y = origLocalY + dir * eased * floorH * 2.5;

        const opacity = Math.max(0, 1 - localT * 1.5);
        const applyOp = (m) => { m.opacity = opacity; };
        if (Array.isArray(mesh.material)) mesh.material.forEach(applyOp);
        else if (mesh.material) applyOp(mesh.material);
      });

      if (t < 1) {
        floorAnimRef.current = requestAnimationFrame(tick);
      } else {
        isAnimatingRef.current = false;
        floorAnimRef.current   = null;
        callback();
      }
    };

    floorAnimRef.current = requestAnimationFrame(tick);
  };

  const animateTCIntro = (lastFloor) => {
    const { scene } = sceneRef.current;
    const model = scene.getObjectByName("__loaded_model__");
    if (!model || !lastFloor) return;

    const selectedIdx = FLOORS.indexOf(lastFloor);
    if (selectedIdx === -1) return;

    const totalBox = new THREE.Box3().setFromObject(model);
    const minY   = totalBox.min.y;
    const totalH = totalBox.max.y - minY;
    if (totalH === 0) return;
    const floorH = totalH / FLOORS.length;

    const meshData = [];
    model.traverse((child) => {
      if (!child.isMesh) return;
      const box      = new THREE.Box3().setFromObject(child);
      const named    = tcFloorByName(child.name);
      const centerY  = (box.min.y + box.max.y) / 2;
      const floorIdx = named !== -1
        ? named
        : Math.min(FLOORS.length - 1, Math.floor((centerY - minY) / floorH));
      if (floorIdx === selectedIdx) return;

      const origLocalY   = child.position.y;
      const dir          = floorIdx > selectedIdx ? 1 : -1;
      const relIdx       = dir === 1 ? floorIdx - selectedIdx - 1 : selectedIdx - floorIdx - 1;
      const totalOther   = dir === 1 ? FLOORS.length - 1 - selectedIdx : selectedIdx;
      const staggerDelay = totalOther > 1 ? (relIdx / (totalOther - 1)) * 0.3 : 0;
      const startOffset  = dir * floorH * 2.5;

      const mats = (Array.isArray(child.material) ? child.material : [child.material]).filter(Boolean);
      child.position.y = origLocalY + startOffset;
      mats.forEach((m) => { m.transparent = true; m.opacity = 0; });
      meshData.push({ mesh: child, origLocalY, startOffset, staggerDelay, mats });
    });

    if (meshData.length === 0) return;

    if (floorAnimRef.current) cancelAnimationFrame(floorAnimRef.current);
    isAnimatingRef.current = true;

    const DURATION  = 700;
    const startTime = performance.now();

    const tick = (now) => {
      const t = Math.min((now - startTime) / DURATION, 1);

      meshData.forEach(({ mesh, origLocalY, startOffset, staggerDelay, mats }) => {
        const localT = staggerDelay >= 1
          ? 0
          : Math.max(0, Math.min(1, (t - staggerDelay) / (1 - staggerDelay)));
        const eased = 1 - (1 - localT) * (1 - localT); // easeOutQuad — decelerate to settle

        mesh.position.y = origLocalY + startOffset * (1 - eased);
        const opacity = Math.min(1, localT * 1.5);
        mats.forEach((m) => { m.opacity = opacity; });
      });

      if (t < 1) {
        floorAnimRef.current = requestAnimationFrame(tick);
      } else {
        meshData.forEach(({ mesh, origLocalY, mats }) => {
          mesh.position.y = origLocalY;
          mats.forEach((m) => { m.opacity = 1; m.transparent = false; });
        });
        isAnimatingRef.current = false;
        floorAnimRef.current   = null;
      }
    };

    floorAnimRef.current = requestAnimationFrame(tick);
  };

  const animateFloorIntro = (model) => {
    // Collect unique materials first, saving opacity BEFORE any modification.
    // Multiple meshes can share the same material instance — modifying on first
    // pass would corrupt naturalOpacity on subsequent passes for the same mat.
    const matMap = new Map();
    model.traverse((child) => {
      if (!child.isMesh) return;
      const mats = (Array.isArray(child.material) ? child.material : [child.material]).filter(Boolean);
      mats.forEach((m) => { if (!matMap.has(m)) matMap.set(m, m.opacity); });
    });

    if (matMap.size === 0) return;

    matMap.forEach((naturalOpacity, mat) => {
      mat.transparent = true;
      mat.needsUpdate = true;
      mat.opacity     = 0;
    });

    if (floorAnimRef.current) cancelAnimationFrame(floorAnimRef.current);
    isAnimatingRef.current = true;

    const DURATION  = 600;
    const startTime = performance.now();

    const tick = (now) => {
      const t     = Math.min((now - startTime) / DURATION, 1);
      const eased = 1 - (1 - t) * (1 - t); // easeOutQuad

      matMap.forEach((naturalOpacity, mat) => { mat.opacity = eased * naturalOpacity; });

      if (t < 1) {
        floorAnimRef.current = requestAnimationFrame(tick);
      } else {
        matMap.forEach((naturalOpacity, mat) => { mat.opacity = naturalOpacity; });
        isAnimatingRef.current = false;
        floorAnimRef.current   = null;
      }
    };

    floorAnimRef.current = requestAnimationFrame(tick);
  };

  return { floorAnimRef, isAnimatingRef, animateFloorTransition, animateTCIntro, animateFloorIntro };
}
