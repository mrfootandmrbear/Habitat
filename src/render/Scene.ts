import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Sky } from "three/addons/objects/Sky.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { SSAOPass } from "three/addons/postprocessing/SSAOPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { SMAAPass } from "three/addons/postprocessing/SMAAPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { config } from "../config";
import { detectQualityTier, type QualityTier } from "./QualityTier";

export type SceneHandles = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  /** Shadow-casting key light — module agents (terrain/water/veg) read its direction. */
  sun: THREE.DirectionalLight;
  qualityTier: QualityTier;
  /** Draws one frame — routes through the post-fx composer on tiers that have one. */
  render: () => void;
  dispose: () => void;
};

/**
 * Sun position on the Preetham sky dome — high enough for long, soft-edged
 * shadows across the island rather than harsh noon shadows underfoot.
 */
const SUN_ELEVATION_DEG = 38;
const SUN_AZIMUTH_DEG = 205;

function sunDirectionFromSky(elevationDeg: number, azimuthDeg: number): THREE.Vector3 {
  const phi = THREE.MathUtils.degToRad(90 - elevationDeg);
  const theta = THREE.MathUtils.degToRad(azimuthDeg);
  return new THREE.Vector3().setFromSphericalCoords(1, phi, theta);
}

export function createScene(container: HTMLElement): SceneHandles {
  const qualityTier = detectQualityTier();

  const scene = new THREE.Scene();
  // Fog color matches the sky's horizon tone (Preetham low-turbidity pale
  // blue) so distant terrain fades into atmosphere instead of a flat wall.
  const fogColor = 0xcdd9e2;
  scene.fog = new THREE.Fog(fogColor, 75, 165);

  const camera = new THREE.PerspectiveCamera(
    50,
    container.clientWidth / Math.max(container.clientHeight, 1),
    0.1,
    500,
  );
  camera.position.set(32, 28, 36);

  const renderer = new THREE.WebGLRenderer({ antialias: !qualityTier.postFx });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, qualityTier.pixelRatioCap));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = qualityTier.shadows;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.target.set(0, 3, 0);
  controls.update();

  // --- Sky dome + sun rig -----------------------------------------------
  const sunDirection = sunDirectionFromSky(SUN_ELEVATION_DEG, SUN_AZIMUTH_DEG);

  const sky = new Sky();
  sky.scale.setScalar(380);
  const skyUniforms = sky.material.uniforms;
  skyUniforms.turbidity.value = 1.0;
  skyUniforms.rayleigh.value = 0.15;
  // Mie (sun-glow) term was tuned down on coefficient alone before, but at
  // mieDirectionalG≈0.78 the forward-scattering lobe stayed razor-tight —
  // its hot core cleared the tonemapper's shoulder and clipped to a hard-
  // edged bright patch near the sun instead of a soft glow. Spreading the
  // lobe (lower g) trades peak intensity for width so the glow falls off
  // smoothly instead of slamming into a seam.
  skyUniforms.mieCoefficient.value = 0.0014;
  skyUniforms.mieDirectionalG.value = 0.6;
  // CloudMesh already renders sim-driven clouds — Sky's own procedural
  // cloud layer would double up and drift out of sync with cloudWater.
  skyUniforms.cloudCoverage.value = 0;
  skyUniforms.cloudDensity.value = 0;
  skyUniforms.sunPosition.value.copy(sunDirection).multiplyScalar(200);
  scene.add(sky);

  const hemi = new THREE.HemisphereLight(0xe8f0f8, 0x6b5a45, 0.22);
  const sun = new THREE.DirectionalLight(0xfff2dd, 1.15);
  sun.position.copy(sunDirection).multiplyScalar(45);
  sun.target.position.set(0, 0, 0);
  sun.castShadow = qualityTier.shadows;
  if (qualityTier.shadows) {
    const half = config.worldSize * 0.62;
    sun.shadow.mapSize.set(qualityTier.shadowMapSize, qualityTier.shadowMapSize);
    sun.shadow.camera.left = -half;
    sun.shadow.camera.right = half;
    sun.shadow.camera.top = half;
    sun.shadow.camera.bottom = -half;
    sun.shadow.camera.near = 5;
    sun.shadow.camera.far = 130;
    sun.shadow.bias = -0.0012;
    sun.shadow.normalBias = 0.045;
    sun.shadow.radius = 2.2;
  }
  scene.add(hemi, sun, sun.target);

  // --- Image-based lighting: bake the sky (only) into a PMREM env map ---
  // Baked once at startup, before any terrain/water/etc. is added to
  // `scene`, so the environment is pure sky — no feedback loop and no
  // per-frame cost.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const showSunDisc = skyUniforms.showSunDisc.value;
  skyUniforms.showSunDisc.value = 0; // avoid a blown-out firefly pixel in the irradiance map
  const envRenderTarget = pmrem.fromScene(scene, 0.02, 1, 700);
  skyUniforms.showSunDisc.value = showSunDisc;
  scene.environment = envRenderTarget.texture;
  // Preetham sky radiance is very high relative to the sun+hemi light
  // levels tuned below — heavily tamed so IBL only contributes a subtle
  // reflection/ambient tint instead of blowing every material to white.
  scene.environmentIntensity = 0.045;
  pmrem.dispose();

  // --- Post-processing (skipped on the low tier — direct render instead) -
  let composer: EffectComposer | null = null;
  if (qualityTier.postFx) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    if (qualityTier.ssao) {
      const ssao = new SSAOPass(scene, camera, container.clientWidth, container.clientHeight);
      ssao.kernelRadius = 0.55;
      ssao.minDistance = 0.0006;
      ssao.maxDistance = 0.12;
      ssao.output = SSAOPass.OUTPUT.Default;
      composer.addPass(ssao);
    }
    if (qualityTier.bloom) {
      const bloom = new UnrealBloomPass(
        new THREE.Vector2(container.clientWidth, container.clientHeight),
        0.32,
        0.55,
        0.88,
      );
      composer.addPass(bloom);
    }
    composer.addPass(new SMAAPass());
    composer.addPass(new OutputPass());
  }

  const onResize = (): void => {
    const w = container.clientWidth;
    const h = Math.max(container.clientHeight, 1);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer?.setSize(w, h);
  };
  window.addEventListener("resize", onResize);

  const render = (): void => {
    if (composer) composer.render();
    else renderer.render(scene, camera);
  };

  return {
    scene,
    camera,
    renderer,
    controls,
    sun,
    qualityTier,
    render,
    dispose: () => {
      window.removeEventListener("resize", onResize);
      controls.dispose();
      envRenderTarget.dispose();
      renderer.dispose();
      container.removeChild(renderer.domElement);
    },
  };
}
