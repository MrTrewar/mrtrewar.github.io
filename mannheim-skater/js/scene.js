import * as THREE from 'three';
import { CAM_FRUSTUM_SIZE, CAM_OFFSET_Y, CAM_OFFSET_Z, GROUND_WIDTH } from './config.js';

let scene, camera, renderer;
let ambientLight, directionalLight;
let resizeHandler = null;

export function initScene(container) {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5efe0);
    scene.fog = new THREE.Fog(0xf5efe0, 20, 50);

    // Isometric orthographic camera
    const aspect = container.clientWidth / container.clientHeight;
    const frustum = CAM_FRUSTUM_SIZE;
    camera = new THREE.OrthographicCamera(
        -frustum * aspect, frustum * aspect,
        frustum, -frustum,
        0.1, 100
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

    // Handle resize (remove old listener to avoid stacking on restart)
    if (resizeHandler) window.removeEventListener('resize', resizeHandler);
    resizeHandler = () => {
        const a = container.clientWidth / container.clientHeight;
        camera.left = -frustum * a;
        camera.right = frustum * a;
        camera.top = frustum;
        camera.bottom = -frustum;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', resizeHandler);

    return { scene, camera, renderer };
}

export function getScene() { return scene; }
export function getCamera() { return camera; }
export function getRenderer() { return renderer; }

export function updateCamera(playerZ) {
    camera.position.z = playerZ + CAM_OFFSET_Z;
    camera.position.x = CAM_OFFSET_Z; // fixed X offset for iso angle
    camera.lookAt(0, 0, playerZ + 4); // look ahead of player
    directionalLight.position.set(5, 10, playerZ + 7);
    directionalLight.target.position.set(0, 0, playerZ);
    directionalLight.target.updateMatrixWorld();
}

export function renderScene() {
    renderer.render(scene, camera);
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
