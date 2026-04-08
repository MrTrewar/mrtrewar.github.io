import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { MODEL_DEFS } from './config.js';

const loader = new GLTFLoader();
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/libs/draco/');
loader.setDRACOLoader(dracoLoader);

const cache = {};

export function loadModel(key, onProgress) {
    if (cache[key]) return Promise.resolve(cache[key].clone());

    const def = MODEL_DEFS[key];
    if (!def) return Promise.reject(new Error(`Unknown model key: ${key}`));

    return new Promise((resolve, reject) => {
        loader.load(
            def.path,
            (gltf) => {
                const model = gltf.scene;

                // Auto-scale based on targetWidth if specified
                if (def.targetWidth) {
                    const box = new THREE.Box3().setFromObject(model);
                    const size = new THREE.Vector3();
                    box.getSize(size);
                    const maxDim = Math.max(size.x, size.z); // use horizontal extent
                    const scale = def.targetWidth / maxDim;
                    model.scale.setScalar(scale);

                    // Re-center the model at origin
                    const center = new THREE.Vector3();
                    box.getCenter(center);
                    model.position.set(
                        -center.x * scale,
                        -box.min.y * scale, // sit on ground (y=0)
                        -center.z * scale
                    );
                } else if (def.scale) {
                    model.scale.setScalar(def.scale);
                }

                if (def.rotation) {
                    if (def.rotation.x) model.rotation.x = def.rotation.x;
                    if (def.rotation.y) model.rotation.y = def.rotation.y;
                    if (def.rotation.z) model.rotation.z = def.rotation.z;
                }
                model.traverse(child => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });
                cache[key] = model;
                resolve(model.clone());
            },
            (progress) => {
                if (onProgress && progress.total > 0) {
                    onProgress(progress.loaded / progress.total);
                }
            },
            (err) => {
                console.warn(`Failed to load model "${key}":`, err);
                reject(err);
            }
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
    return cache[key] ? cache[key].clone() : null;
}
