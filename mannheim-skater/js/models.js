import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { MODEL_DEFS } from "./config.js";

const loader = new GLTFLoader();
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath(
  "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/libs/draco/",
);
loader.setDRACOLoader(dracoLoader);

const cache = {};

// Object3D.clone() shares geometries and materials across clones.
// Deep-clone materials so per-instance mutations (e.g. fog, opacity) stay local.
function cloneWithMaterials(src) {
  const copy = src.clone(true);
  copy.traverse((child) => {
    if (!child.isMesh || !child.material) return;
    child.material = Array.isArray(child.material)
      ? child.material.map((m) => m.clone())
      : child.material.clone();
  });
  return copy;
}

export function loadModel(key, onProgress) {
  if (cache[key]) return Promise.resolve(cloneWithMaterials(cache[key]));

  const def = MODEL_DEFS[key];
  if (!def) return Promise.reject(new Error(`Unknown model key: ${key}`));

  return new Promise((resolve, reject) => {
    loader.load(
      def.path,
      (gltf) => {
        const raw = gltf.scene;

        // Wrap in pivot group: centering on inner, rotation on outer
        const pivot = new THREE.Group();

        if (def.targetWidth) {
          const box = new THREE.Box3().setFromObject(raw);
          const size = new THREE.Vector3();
          box.getSize(size);
          const maxDim = Math.max(size.x, size.z);
          const scale = def.targetWidth / maxDim;
          raw.scale.setScalar(scale);

          // Center the raw model inside the pivot
          const center = new THREE.Vector3();
          box.getCenter(center);
          raw.position.set(
            -center.x * scale,
            -box.min.y * scale,
            -center.z * scale,
          );
        } else if (def.scale) {
          raw.scale.setScalar(def.scale);
        }

        raw.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        pivot.add(raw);
        // Rotation goes on the pivot — rotates around the centered origin
        cache[key] = pivot;
        resolve(cloneWithMaterials(pivot));
      },
      (progress) => {
        if (onProgress && progress.total > 0) {
          onProgress(progress.loaded / progress.total);
        }
      },
      (err) => {
        console.warn(`Failed to load model "${key}":`, err);
        reject(err);
      },
    );
  });
}

export async function preloadAllModels(onProgress) {
  const keys = Object.keys(MODEL_DEFS);
  let loaded = 0;
  for (const key of keys) {
    try {
      await loadModel(key, (fraction) => {
        if (onProgress) onProgress((loaded + fraction) / keys.length);
      });
      loaded++;
    } catch (e) {
      console.warn(`Skipping model "${key}" — will use fallback`);
      loaded++;
    }
  }
  if (onProgress) onProgress(1);
}

export function getCachedModel(key) {
  return cache[key] ? cloneWithMaterials(cache[key]) : null;
}
