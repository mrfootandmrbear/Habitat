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
  /** Draws one frame — always through the composer (minimal on low tier), never a direct render. */
  render: () => void;
  dispose: () => void;
};

/**
 * Backdrop and frustum sizing — these three are a set, and changing one
 * without the others produces a specific, easy-to-miss bug.
 *
 * three's `Sky` is a **BoxGeometry(1,1,1) rendered BackSide**, so
 * `sky.scale.setScalar(n)` gives a box `n` across — a half-extent of `n/2`,
 * not `n`. (three's own example uses 10000 for this reason.) It was 380, i.e.
 * a half-extent of 190, which was fine while the sea plane stopped at 32.4.
 * Once the sea ran out to the horizon it extended far *outside* the sky box,
 * so the distant sea had no backdrop behind it at all and — being partly
 * transparent — blended toward the clear colour instead of toward sky. The
 * tell is the far water going dark and losing saturation with distance.
 *
 * So: the sky box must enclose the sea plane's far corner, and the far plane
 * must enclose the sky box's far corner.
 *   sea corner       = SEA_HORIZON_HALF_EXTENT * sqrt(2)  ~= 1273
 *   sky half-extent  = 1500                                > 1273  OK
 *   sky corner       = 1500 * sqrt(3) + camera radius     ~= 2646
 *   CAMERA_FAR       = 3000                                > 2646  OK
 */
const SKY_BOX_SCALE = 3000;
const CAMERA_FAR = 3000;
/** Chosen to hold CAMERA_FAR / CAMERA_NEAR at 5000 — see the camera comment. */
const CAMERA_NEAR = CAMERA_FAR / 5000;

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
  // Near moves with it, deliberately. Depth precision goes as far/near, and
  // pushing far out while leaving near alone would make the buffer coarser by
  // the same factor — a live regression risk, because the shoreline z-fight
  // that showed up as a per-frame flash in playtest is held off by a tuned
  // polygonOffset in OceanMesh. These two are picked together to hold the
  // ratio at exactly the 5000 that fix was tuned against, so this cannot
  // reintroduce it. 0.6 is still far closer than the camera can orbit.
  const camera = new THREE.PerspectiveCamera(
    50,
    container.clientWidth / Math.max(container.clientHeight, 1),
    CAMERA_NEAR,
    CAMERA_FAR,
  );
  // C5 (gauntlet-loop bar v2 point 12 / owner-ruled framing): every reference
  // (godus-wide-island, planet-coaster-terrain) looks down steeply and fills
  // the frame with world, camera close to the island. The old home (32, 28,
  // 36) sat at pitch ~27.4 deg and distance ~54 from cameraTarget — closer to
  // an overview shot than the references' close, steep framing. Round 1
  // brought distance to ~36 / pitch to ~42 deg; a critic confirmed the pitch
  // reads right but still measured ~40% of frame width as open-water margin
  // flanking the island (references push the landform to the frame edges).
  // Round 2: same pitch/azimuth, distance tightened further to ~30.
  const cameraHome = new THREE.Vector3(15, 23, 16.6);
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
  sky.scale.setScalar(SKY_BOX_SCALE);
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

  // --- Post-processing --------------------------------------------------
  // Every tier routes through the composer now, even "low" (SSAO/bloom/SMAA
  // skipped there, not the composer itself). A cold critic (2026-08-05)
  // measured the low tier's direct-render path (`renderer.render()`, no
  // composer) as ~1.8-2.1x darker per channel than the composer path for an
  // *identical* scene — isolated by bisection to the render mechanism
  // itself, not any of SSAO/bloom/SMAA/envMapSize/pixelRatio/shadowMapSize
  // (each tested independently, holding the others at low-tier values; only
  // the composer-vs-direct switch reproduced the gap). Materials skip
  // in-shader tonemap+encode when rendering into a target (verified against
  // three's source, `WebGLPrograms.js`) specifically so `OutputPass` can be
  // the one place that happens — that contract only holds if everything
  // actually goes through `OutputPass`. Two render paths computing the same
  // "final pixel color" is the exact bug class `seabed.ts` and
  // `lightingRig.ts` already exist to prevent for other quantities; this is
  // the same lesson applied to the composer boundary. A minimal composer
  // (RenderPass + OutputPass, no SSAO/bloom/SMAA) is cheap relative to a
  // full scene render, which every tier already pays for regardless.
  const composer = new EffectComposer(renderer);
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
  // SMAA stays tied to the same "full post-fx" flag as before — tiers
  // without it keep native MSAA (`antialias: !qualityTier.postFx` above) for
  // edge quality instead of paying for both.
  if (qualityTier.postFx) composer.addPass(new SMAAPass());
  composer.addPass(new OutputPass());

  const onResize = (): void => {
    const w = container.clientWidth;
    const h = Math.max(container.clientHeight, 1);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
  };
  window.addEventListener("resize", onResize);

  const render = (): void => {
    composer.render();
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
