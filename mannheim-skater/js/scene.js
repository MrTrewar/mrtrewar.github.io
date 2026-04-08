import * as THREE from 'three';
import { CAM_FRUSTUM_SIZE, CAM_OFFSET_Y, CAM_OFFSET_Z, CAM_LOOK_AHEAD, CHASE_CAM_FOV, CHASE_CAM_Y, CHASE_CAM_Z, CHASE_CAM_LOOK_AHEAD, TURN_CHUNK, TURN_DURATION_CHUNKS, INTRO_ZOOM_DURATION, INTRO_ZOOM_START_FRUSTUM } from './config.js';

let scene, camera, renderer;
let ambientLight, directionalLight;
let resizeHandler = null;
let chaseCamera;
let activeCamera;
let introTimer = 0;
let containerAspect = 1;

export function initScene(container) {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5efe0);
    scene.fog = new THREE.Fog(0xf5efe0, 30, 80);

    // Isometric orthographic camera — start zoomed out for intro
    const aspect = container.clientWidth / container.clientHeight;
    containerAspect = aspect;
    introTimer = 0;
    const startFrustum = INTRO_ZOOM_START_FRUSTUM;
    camera = new THREE.OrthographicCamera(
        -startFrustum * aspect, startFrustum * aspect,
        startFrustum, -startFrustum,
        0.1, 200
    );

    // Isometric angle: rotate around Y by 45deg, then tilt X by ~35.264deg
    camera.position.set(CAM_OFFSET_Z, CAM_OFFSET_Y, CAM_OFFSET_Z);
    camera.lookAt(0, 0, 0);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Lighting
    ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.set(1024, 1024);
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -15;
    directionalLight.shadow.camera.right = 15;
    directionalLight.shadow.camera.top = 15;
    directionalLight.shadow.camera.bottom = -15;
    scene.add(directionalLight);

    chaseCamera = new THREE.PerspectiveCamera(
        CHASE_CAM_FOV,
        container.clientWidth / container.clientHeight,
        0.1, 100
    );
    activeCamera = camera; // start with ortho

    // Handle resize (remove old listener to avoid stacking on restart)
    if (resizeHandler) window.removeEventListener('resize', resizeHandler);
    resizeHandler = () => {
        const a = container.clientWidth / container.clientHeight;
        camera.left = -frustum * a;
        camera.right = frustum * a;
        camera.top = frustum;
        camera.bottom = -frustum;
        camera.updateProjectionMatrix();
        if (chaseCamera) {
            chaseCamera.aspect = container.clientWidth / container.clientHeight;
            chaseCamera.updateProjectionMatrix();
        }
        renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', resizeHandler);

    return { scene, camera, renderer };
}

export function getScene() { return scene; }
export function getCamera() { return camera; }
export function getRenderer() { return renderer; }

export function updateIntroZoom(dt) {
    if (introTimer >= INTRO_ZOOM_DURATION) return;
    introTimer += dt;
    const t = Math.min(1, introTimer / INTRO_ZOOM_DURATION);
    // Smooth ease-out
    const ease = 1 - (1 - t) * (1 - t);
    const frustum = INTRO_ZOOM_START_FRUSTUM + (CAM_FRUSTUM_SIZE - INTRO_ZOOM_START_FRUSTUM) * ease;
    camera.left = -frustum * containerAspect;
    camera.right = frustum * containerAspect;
    camera.top = frustum;
    camera.bottom = -frustum;
    camera.updateProjectionMatrix();
}

export function resetIntroZoom() {
    introTimer = 0;
}

export function updateCameraForPhase(phase, chunkCount) {
    if (phase === 'schloss') {
        camera.position.set(CAM_OFFSET_Z, CAM_OFFSET_Y, CAM_OFFSET_Z);
        camera.lookAt(0, 0, CAM_LOOK_AHEAD);
        directionalLight.position.set(5, 10, 7);
        directionalLight.target.position.set(0, 0, 0);
        directionalLight.target.updateMatrixWorld();
        activeCamera = camera;
        return;
    }

    if (phase === 'planken') {
        chaseCamera.position.set(0, CHASE_CAM_Y, -CHASE_CAM_Z);
        chaseCamera.lookAt(0, 0.5, CHASE_CAM_LOOK_AHEAD);
        directionalLight.position.set(0, 10, 5);
        directionalLight.target.position.set(0, 0, 3);
        directionalLight.target.updateMatrixWorld();
        activeCamera = chaseCamera;
        return;
    }

    // phase === 'turn': smooth transition
    const t = Math.max(0, Math.min(1, (chunkCount - TURN_CHUNK) / TURN_DURATION_CHUNKS));
    const s = t * t * (3 - 2 * t);

    const isoPos = { x: CAM_OFFSET_Z, y: CAM_OFFSET_Y, z: CAM_OFFSET_Z };
    const chasePos = { x: 0, y: CHASE_CAM_Y, z: -CHASE_CAM_Z };

    const cx = isoPos.x + (chasePos.x - isoPos.x) * s;
    const cy = isoPos.y + (chasePos.y - isoPos.y) * s;
    const cz = isoPos.z + (chasePos.z - isoPos.z) * s;

    const isoLook = { x: 0, y: 0, z: CAM_LOOK_AHEAD };
    const chaseLook = { x: 0, y: 0.5, z: CHASE_CAM_LOOK_AHEAD };

    const lx = isoLook.x + (chaseLook.x - isoLook.x) * s;
    const ly = isoLook.y + (chaseLook.y - isoLook.y) * s;
    const lz = isoLook.z + (chaseLook.z - isoLook.z) * s;

    if (t < 0.5) {
        camera.position.set(cx, cy, cz);
        camera.lookAt(lx, ly, lz);
        activeCamera = camera;
    } else {
        chaseCamera.position.set(cx, cy, cz);
        chaseCamera.lookAt(lx, ly, lz);
        activeCamera = chaseCamera;
    }

    directionalLight.position.set(cx * 0.5, 10, cz + 5);
    directionalLight.target.position.set(0, 0, lz - 2);
    directionalLight.target.updateMatrixWorld();
}

export function renderScene() {
    renderer.render(scene, activeCamera);
}

export function getActiveCamera() { return activeCamera; }

// Camera shake
let shakeIntensity = 0;
let shakeDecay = 0;

export function triggerCameraShake(intensity = 0.3, duration = 0.3) {
    shakeIntensity = intensity;
    shakeDecay = intensity / duration;
}

export function updateCameraShake(dt) {
    if (shakeIntensity <= 0) return;
    const offsetX = (Math.random() - 0.5) * shakeIntensity * 2;
    const offsetY = (Math.random() - 0.5) * shakeIntensity * 2;
    if (activeCamera) {
        activeCamera.position.x += offsetX;
        activeCamera.position.y += offsetY;
    }
    shakeIntensity = Math.max(0, shakeIntensity - shakeDecay * dt);
}

export function setNightMode(enabled) {
    if (enabled) {
        scene.background.set(0x111122);
        scene.fog.color.set(0x111122);
        ambientLight.intensity = 0.2;
        directionalLight.intensity = 0.3;
        directionalLight.color.set(0x6666cc);
    } else {
        scene.background.set(0xf5efe0);
        scene.fog.color.set(0xf5efe0);
        ambientLight.intensity = 0.7;
        directionalLight.intensity = 0.8;
        directionalLight.color.set(0xffffff);
    }
}
