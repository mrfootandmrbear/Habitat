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
import {
  ENVIRONMENT_INTENSITY,
  FOG_FAR,
  FOG_NEAR,
  HEMI_GROUND_COLOR,
  HEMI_INTENSITY,
  HEMI_SKY_COLOR,
  SKY_MIE_COEFFICIENT,
  SKY_MIE_DIRECTIONAL_G,
  SKY_RAYLEIGH,
  SKY_TURBIDITY,
  SUN_COLOR,
  SUN_INTENSITY,
  TONE_MAPPING_EXPOSURE,
  calibrateSkyLighting,
  installSkyRadianceScale,
  sunDirectionFromSky,
  type SkyLighting,
} from "./lightingRig";

export type SceneHandles = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  /** Shadow-casting key light — module agents (terrain/water/veg) read its direction. */
  sun: THREE.DirectionalLight;
  /**
   * Measured sun/sky values for anything that reflects or fades into the sky.
   * Read this instead of re-deriving light constants locally — see
   * `lightingRig.ts` for why duplicated literals are a standing bug source.
   */
  skyLighting: SkyLighting;
  qualityTier: QualityTier;
  /** Draws one frame — routes through the post-fx composer on tiers that have one. */
  render: () => void;
  dispose: () => void;
};

export function createScene(container: HTMLElement): SceneHandles {
  const qualityTier = detectQualityTier();

  const scene = new THREE.Scene();
  // Fog colour is measured off the real sky dome further down (the horizon
  // probe) so distant terrain always fades into the atmosphere that is
  // actually being rendered. This placeholder only covers the window before
  // the sky exists.
  scene.fog = new THREE.Fog(0xcdd9e2, FOG_NEAR, FOG_FAR);

  // Far plane has to clear the sea plane's far corner, or the sea gets cut off
  // inside the frustum and the below-horizon sky dome shows through the gap —
  // which is the exact defect SEA_HORIZON_HALF_EXTENT exists to remove. That
  // corner sits ~1270 units out, so 2400 leaves room to orbit.
  //
  // Near moves 0.1 -> 0.5 in the same breath, deliberately. Depth precision
  // goes as far/near, and pushing far out 4.8x while leaving near alone would
  // have made the buffer 4.8x coarser — a live regression risk, because the
  // shoreline z-fight that showed up as a per-frame flash in playtest is held
  // off by a tuned polygonOffset in OceanMesh. Moving near by the same factor
  // keeps the ratio at 4800, marginally *better* than the 5000 that fix was
  // tuned against, so this change cannot reintroduce it. 0.5 is still far
  // closer than the camera can orbit.
  const camera = new THREE.PerspectiveCamera(
    50,
    container.clientWidth / Math.max(container.clientHeight, 1),
    0.5,
    2400,
  );
  const cameraHome = new THREE.Vector3(32, 28, 36);
  const cameraTarget = new THREE.Vector3(0, 3, 0);
  camera.position.copy(cameraHome);

  const renderer = new THREE.WebGLRenderer({ antialias: !qualityTier.postFx });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, qualityTier.pixelRatioCap));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = TONE_MAPPING_EXPOSURE;
  renderer.shadowMap.enabled = qualityTier.shadows;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.target.copy(cameraTarget);
  controls.update();

  // --- Sky dome + sun rig -----------------------------------------------
  const sunDirection = sunDirectionFromSky();

  const sky = new Sky();
  sky.scale.setScalar(380);
  const skyUniforms = sky.material.uniforms;
  skyUniforms.turbidity.value = SKY_TURBIDITY;
  skyUniforms.rayleigh.value = SKY_RAYLEIGH;
  skyUniforms.mieCoefficient.value = SKY_MIE_COEFFICIENT;
  skyUniforms.mieDirectionalG.value = SKY_MIE_DIRECTIONAL_G;
  // CloudMesh already renders sim-driven clouds — Sky's own procedural
  // cloud layer would double up and drift out of sync with cloudWater.
  skyUniforms.cloudCoverage.value = 0;
  skyUniforms.cloudDensity.value = 0;
  skyUniforms.sunPosition.value.copy(sunDirection).multiplyScalar(200);
  if (!installSkyRadianceScale(sky.material)) {
    console.warn(
      "lightingRig: could not patch Sky's radiance scale — three.js shader changed. " +
        "Sky will render overbright and desaturated until lightingRig.ts is updated.",
    );
  }
  scene.add(sky);

  const hemi = new THREE.HemisphereLight(HEMI_SKY_COLOR, HEMI_GROUND_COLOR, HEMI_INTENSITY);
  const sun = new THREE.DirectionalLight(SUN_COLOR, SUN_INTENSITY);
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
  // Normalise and measure the sky while the scene is still sky-only, so
  // nothing else bleeds into the reading — and crucially *before* the PMREM
  // bake, so the environment map inherits the corrected radiance scale rather
  // than the raw Preetham values.
  // Anchored on the camera's home view direction, nudged up toward the top of
  // frame — that band is the only sky the player ever sees, and it is the one
  // that has to land at a sane brightness. See SKY_VIEW_TARGET_LUMINANCE.
  const viewDirection = cameraTarget
    .clone()
    .sub(cameraHome)
    .normalize()
    .setY(0.08)
    .normalize();
  const skyLighting = calibrateSkyLighting(
    renderer,
    scene,
    sky.material,
    sunDirection,
    viewDirection,
  );
  const envRenderTarget = pmrem.fromScene(scene, 0.02, 1, 700);
  skyUniforms.showSunDisc.value = showSunDisc;
  scene.environment = envRenderTarget.texture;
  scene.environmentIntensity = ENVIRONMENT_INTENSITY;
  pmrem.dispose();

  scene.fog.color.copy(skyLighting.skyHorizon);

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
    skyLighting,
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
