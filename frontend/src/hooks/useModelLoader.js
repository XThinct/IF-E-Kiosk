import { useRef } from "react";
import * as THREE from "three";
import { GLTFLoader }   from "three/examples/jsm/loaders/GLTFLoader";
import { FBXLoader }    from "three/examples/jsm/loaders/FBXLoader";
import { OBJLoader }    from "three/examples/jsm/loaders/OBJLoader";
import { MTLLoader }    from "three/examples/jsm/loaders/MTLLoader";
import { ColladaLoader } from "three/examples/jsm/loaders/ColladaLoader";
import { getExt } from "../constants";

export function useModelLoader({
  sceneRef,
  floorAnimRef,
  isAnimatingRef,
  animateFloorIntro,
  animateTCIntro,
  lastActiveFloorRef,
  pendingRoomRef,
  setStatus,
  setModelInfo,
  setErrorMsg,
  setFileName,
  setActiveFloor,
  setActiveRoom,
  setSchedule,
  setView,
}) {
  const originalMaterials = useRef({});
  const savedCameraRef    = useRef(null);

  const onErr = (err) => {
    console.error(err);
    setErrorMsg(err?.message || "Failed to load.");
    setStatus("error");
  };

  const highlightRoom = (roomName) => {
    const { scene } = sceneRef.current;
    const model = scene.getObjectByName("__loaded_model__");
    if (!model) return;

    model.traverse((child) => {
      if (!child.isMesh) return;
      if (!originalMaterials.current[child.uuid]) {
        originalMaterials.current[child.uuid] = Array.isArray(child.material)
          ? child.material.map((m) => m.clone())
          : child.material.clone();
      }

      const highlight = (mat) => {
        const h = mat.clone();
        h.emissive = new THREE.Color(0x22aa44);
        h.emissiveIntensity = 0.8;
        h.transparent = true;
        h.opacity     = 1;
        h.depthWrite  = true;
        return h;
      };
      const dim = (mat) => {
        const d = mat.clone();
        d.transparent = true;
        d.opacity     = roomName ? 0.2 : 1;
        d.emissive    = new THREE.Color(0x000000);
        d.emissiveIntensity = 0;
        return d;
      };

      const orig = originalMaterials.current[child.uuid];
      child.material = child.name === roomName
        ? (Array.isArray(orig) ? orig.map(highlight) : highlight(orig))
        : (Array.isArray(orig) ? orig.map(dim)       : dim(orig));
    });
  };

  const finalizeModel = (model, switchToRooms = true, preserveCamera = false) => {
    if (floorAnimRef.current) {
      cancelAnimationFrame(floorAnimRef.current);
      floorAnimRef.current  = null;
      isAnimatingRef.current = false;
    }

    const { scene, camera, controls } = sceneRef.current;
    const prev = scene.getObjectByName("__loaded_model__");
    if (prev) scene.remove(prev);
    originalMaterials.current = {};

    model.name = "__loaded_model__";
    const meshNames = [];
    model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow    = true;
        child.receiveShadow = true;
        if (child.name) meshNames.push(child.name);
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((m) => { if (m && m.opacity < 1) { m.transparent = true; m.depthWrite = false; } });
      }
    });

    const box    = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size   = box.getSize(new THREE.Vector3());
    model.position.sub(center);
    model.position.y += size.y / 2;
    scene.add(model);

    if (preserveCamera && savedCameraRef.current) {
      camera.position.copy(savedCameraRef.current.position);
      controls.target.copy(savedCameraRef.current.target);
      savedCameraRef.current = null;
    } else {
      const dist = Math.max(size.x, size.y, size.z) * 1.8;
      camera.position.set(dist, dist * 0.7, dist);
      controls.target.set(0, size.y / 2, 0);
    }
    controls.update();
    controls.saveState();

    if (switchToRooms) {
      animateFloorIntro(model);
      setModelInfo({
        meshCount: meshNames.length,
        meshNames,
        size: { x: size.x.toFixed(2), y: size.y.toFixed(2), z: size.z.toFixed(2) },
      });

      const pending = pendingRoomRef?.current;
      if (pending && meshNames.includes(pending)) {
        pendingRoomRef.current = null;
        setActiveRoom(pending);
        setSchedule([]);
        highlightRoom(pending);
      } else {
        setActiveRoom(null);
        setSchedule([]);
      }
      setView("rooms");
    } else {
      const lf = lastActiveFloorRef.current;
      lastActiveFloorRef.current = null;
      animateTCIntro(lf);
    }
    setStatus("success");
  };

  const loadTC = () => {
    const { camera, controls } = sceneRef.current;
    if (camera && controls) {
      savedCameraRef.current = { position: camera.position.clone(), target: controls.target.clone() };
    }
    setStatus("loading"); setModelInfo(null); setErrorMsg("");
    setActiveFloor(null); setActiveRoom(null); setSchedule([]);
    const ml = new MTLLoader();
    ml.load(
      "/models/TC.mtl",
      (mats) => {
        mats.preload();
        const ol = new OBJLoader();
        ol.setMaterials(mats);
        ol.load("/models/TC.obj", (obj) => finalizeModel(obj, false, true), undefined, onErr);
      },
      undefined,
      onErr,
    );
  };

  const loadFloorObjMtl = (floorName) => {
    const { camera, controls, scene } = sceneRef.current;
    if (camera && controls) {
      savedCameraRef.current = { position: camera.position.clone(), target: controls.target.clone() };
    }
    const prev = scene?.getObjectByName("__loaded_model__");
    if (prev) prev.visible = false;
    setStatus("loading"); setModelInfo(null); setErrorMsg("");
    setFileName(floorName + ".obj"); setView("floors");
    const ml = new MTLLoader();
    ml.load(
      `/models/${floorName}.mtl`,
      (mats) => {
        mats.preload();
        const ol = new OBJLoader();
        ol.setMaterials(mats);
        ol.load(`/models/${floorName}.obj`, (obj) => finalizeModel(obj, true, true), undefined, onErr);
      },
      undefined,
      onErr,
    );
  };

  const loadByUrl = (url, ext) => {
    setStatus("loading"); setModelInfo(null); setErrorMsg(""); setView("floors");
    if (ext === "glb" || ext === "gltf") new GLTFLoader().load(url, (g) => finalizeModel(g.scene), undefined, onErr);
    else if (ext === "fbx") new FBXLoader().load(url, finalizeModel, undefined, onErr);
    else if (ext === "dae") new ColladaLoader().load(url, (c) => finalizeModel(c.scene), undefined, onErr);
    else if (ext === "obj") new OBJLoader().load(url, finalizeModel, undefined, onErr);
    else { setErrorMsg(`Unsupported: .${ext}`); setStatus("error"); }
  };

  const loadByFiles = (files) => {
    const fm = {};
    Array.from(files).forEach((f) => { fm[getExt(f.name)] = f; });
    setStatus("loading"); setModelInfo(null); setErrorMsg(""); setView("floors");

    if (fm["glb"] || fm["gltf"]) {
      const f = fm["glb"] || fm["gltf"];
      setFileName(f.name);
      loadByUrl(URL.createObjectURL(f), getExt(f.name));
    } else if (fm["fbx"]) {
      setFileName(fm["fbx"].name);
      loadByUrl(URL.createObjectURL(fm["fbx"]), "fbx");
    } else if (fm["dae"]) {
      setFileName(fm["dae"].name);
      loadByUrl(URL.createObjectURL(fm["dae"]), "dae");
    } else if (fm["obj"]) {
      setFileName(fm["obj"].name);
      if (fm["mtl"]) {
        const ml = new MTLLoader();
        ml.load(
          URL.createObjectURL(fm["mtl"]),
          (mats) => {
            mats.preload();
            const ol = new OBJLoader();
            ol.setMaterials(mats);
            ol.load(URL.createObjectURL(fm["obj"]), finalizeModel, undefined, onErr);
          },
          undefined,
          onErr,
        );
      } else {
        loadByUrl(URL.createObjectURL(fm["obj"]), "obj");
      }
    } else {
      setErrorMsg("No supported file found.");
      setStatus("error");
    }
  };

  return { loadTC, loadFloorObjMtl, loadByUrl, loadByFiles, highlightRoom };
}
