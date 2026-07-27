import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export type SceneHandles = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  dispose: () => void;
};

export function createScene(container: HTMLElement): SceneHandles {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xb8c9d4);
  scene.fog = new THREE.Fog(0xb8c9d4, 70, 140);

  const camera = new THREE.PerspectiveCamera(
    50,
    container.clientWidth / Math.max(container.clientHeight, 1),
    0.1,
    400,
  );
  camera.position.set(32, 28, 36);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.target.set(0, 3, 0);
  controls.update();

  const hemi = new THREE.HemisphereLight(0xe8f0f8, 0x6b5a45, 0.9);
  const sun = new THREE.DirectionalLight(0xfff2dd, 1.05);
  sun.position.set(24, 40, 16);
  scene.add(hemi, sun);

  const onResize = (): void => {
    const w = container.clientWidth;
    const h = Math.max(container.clientHeight, 1);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  };
  window.addEventListener("resize", onResize);

  return {
    scene,
    camera,
    renderer,
    controls,
    dispose: () => {
      window.removeEventListener("resize", onResize);
      controls.dispose();
      renderer.dispose();
      container.removeChild(renderer.domElement);
    },
  };
}
