import * as THREE from "three";

/**
 * Single source of truth for the scene's light + atmosphere.
 *
 * Why this file exists: the sun direction, sun colour and sky horizon/zenith
 * tones used to be duplicated as literal constants inside OceanMesh.ts and
 * WaterMesh.ts "so each render piece stays self-contained." That is exactly
 * how the near-black water regression happened — the sun rig moved, the
 * literals did not, and nothing type-checks or tests a stale copy of a
 * lighting constant. Everything that needs to know where the light is coming
 * from reads it from here instead.
 */

/**
 * Sun position on the Preetham sky dome, in degrees.
 *
 * Azimuth is chosen against the camera's home azimuth (~42 degrees), not in
 * isolation, because the camera only ever frames the horizon band:
 *   - near 205 (round 1's value) the camera stares straight into the mie
 *     forward-scatter glare and the whole sky washes to white;
 *   - near 42 the sun sits behind the camera and the visible sky is flat and
 *     gradientless, with no glow anywhere in frame.
 * A raking side sun keeps the glow at the edge of frame, gives the island
 * cross-lit relief and long shadows rather than flat frontal light, and
 * leaves a visible gradient across the band.
 */
export const SUN_ELEVATION_DEG = 38;
export const SUN_AZIMUTH_DEG = 130;

/**
 * Atmosphere shape. These are free to tune for *look* — they no longer drag
 * the whole exposure chain with them, because the sky's absolute brightness
 * is normalised separately (see `SKY_ZENITH_TARGET_LUMINANCE`).
 */
export const SKY_TURBIDITY = 1.6;
export const SKY_RAYLEIGH = 2.6;
export const SKY_MIE_COEFFICIENT = 0.004;
/**
 * Forward-scattering lobe width. A tight lobe (g ~ 0.8) puts a hot core near
 * the sun that clears the tonemapper's shoulder and clips to a hard-edged
 * bright patch; spreading it trades peak intensity for width so the glow
 * falls off smoothly (round 1 finding, kept).
 */
export const SKY_MIE_DIRECTIONAL_G = 0.66;

/**
 * The one number that makes the rest of this file behave.
 *
 * three's `Sky` emits raw Preetham radiance — zenith values around 15-25 in
 * linear units, i.e. roughly 20x display range. Everything downstream then
 * inherits that scale: ACES sees a hugely overbright input and desaturates it
 * to flat grey no matter what exposure it is given (measured: still grey at
 * exposure 0.12), and the PMREM environment map bakes the same overbright
 * values, so any sane `environmentIntensity` washes every material white.
 *
 * Round 1 worked around the symptom by crushing `rayleigh` to 0.15 and
 * `environmentIntensity` to 0.045 — which switches the atmosphere off rather
 * than scaling it. Instead, the sky is *measured* at startup and multiplied
 * down to land at this luminance. After that the sky is an ordinary,
 * correctly-scaled light source: exposure stays at 1.0, IBL is meaningful,
 * and turbidity/rayleigh can be tuned for look alone.
 *
 * Measured along the *camera's own view direction*, which is the only sky
 * this game ever shows. The default camera looks down at the island from
 * above, so with a 50-degree vertical FOV the top of frame sits a few degrees
 * *below* horizontal — the frame never contains the blue zenith at all, only
 * the horizon band, which is the brightest and whitest part of the Preetham
 * model (the `1 - Fex` term saturates as the optical path lengthens). Worse,
 * the default camera looks roughly toward the sun's azimuth, so that band is
 * also sitting in the mie forward-scatter glow.
 *
 * Anchoring anywhere else normalises sky nobody sees. Both were measured:
 * anchored on the zenith the visible band rendered 213,213,213, and anchored
 * on a four-azimuth horizon average it rendered 218,218,217 — in each case
 * while the probe itself reported a perfectly reasonable value.
 *
 * 0.35 linear tonemaps to a mid sky tone that keeps its blue tint instead of
 * riding ACES's shoulder into white.
 */
export const SKY_VIEW_TARGET_LUMINANCE = 0.35;

export const TONE_MAPPING_EXPOSURE = 1.0;

/** How much the baked sky IBL contributes to material ambient/reflection. */
export const ENVIRONMENT_INTENSITY = 0.28;

/** Direct key light. */
export const SUN_COLOR = 0xfff2dd;
export const SUN_INTENSITY = 1.4;
/** Kept low — with the sky IBL correctly scaled, that is now the ambient. */
export const HEMI_SKY_COLOR = 0xdfeaf5;
export const HEMI_GROUND_COLOR = 0x6b5a45;
export const HEMI_INTENSITY = 0.12;

export const FOG_NEAR = 75;
export const FOG_FAR = 180;

/** Unit vector pointing from the world origin toward the sun. */
export function sunDirectionFromSky(
  elevationDeg = SUN_ELEVATION_DEG,
  azimuthDeg = SUN_AZIMUTH_DEG,
): THREE.Vector3 {
  const phi = THREE.MathUtils.degToRad(90 - elevationDeg);
  const theta = THREE.MathUtils.degToRad(azimuthDeg);
  return new THREE.Vector3().setFromSphericalCoords(1, phi, theta);
}

/**
 * The lighting values render pieces consume. Sky colours are *measured* off
 * the actual sky dome (see `sampleSkyLighting`) rather than hand-matched
 * hex literals, so changing a sky uniform can never silently desync the
 * water's reflection or the fog.
 */
export type SkyLighting = {
  sunDirection: THREE.Vector3;
  sunColor: THREE.Color;
  /** Linear-space sky colour looking straight up. */
  skyZenith: THREE.Color;
  /** Linear-space sky colour averaged around the horizon. */
  skyHorizon: THREE.Color;
  /** Linear-space sky colour along the camera's default view direction. */
  skyView: THREE.Color;
};

/** Anything that reflects or fades into the sky implements this. */
export type SkyLightingConsumer = {
  setSkyLighting(lighting: SkyLighting): void;
};

const PROBE_SIZE = 16;

/**
 * Wide cone for the zenith/horizon tones, which stand in for "what colour is
 * the sky as a light source" — a single direction off a gradient is not a
 * representative answer.
 */
const AMBIENT_PROBE_FOV = 75;

/**
 * Narrow cone for the calibration anchor. This one must match what fills the
 * top of the frame, and the sky's vertical gradient is steep near the horizon:
 * a 75-degree cone pointed at the view direction averages in far darker sky
 * from 40 degrees up, so normalising *that* average left the bright band
 * actually on screen about 2x too hot (probe read 0.35, screen rendered 200).
 */
const VIEW_PROBE_FOV = 24;

function averageProbe(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  target: THREE.WebGLRenderTarget,
  camera: THREE.PerspectiveCamera,
  lookAt: THREE.Vector3,
  fovDeg: number,
  buffer: Float32Array,
  out: THREE.Color,
): void {
  camera.fov = fovDeg;
  camera.updateProjectionMatrix();
  camera.position.set(0, 0, 0);
  camera.lookAt(lookAt);
  camera.updateMatrixWorld(true);

  const previousTarget = renderer.getRenderTarget();
  renderer.setRenderTarget(target);
  renderer.render(scene, camera);
  renderer.readRenderTargetPixels(target, 0, 0, PROBE_SIZE, PROBE_SIZE, buffer);
  renderer.setRenderTarget(previousTarget);

  let r = 0;
  let g = 0;
  let b = 0;
  const pixels = PROBE_SIZE * PROBE_SIZE;
  for (let i = 0; i < pixels; i++) {
    r += buffer[i * 4] ?? 0;
    g += buffer[i * 4 + 1] ?? 0;
    b += buffer[i * 4 + 2] ?? 0;
  }
  out.setRGB(r / pixels, g / pixels, b / pixels, THREE.LinearSRGBColorSpace);
}

const RADIANCE_SCALE_UNIFORM = "uRadianceScale";

function luminance(color: THREE.Color): number {
  return 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b;
}

/**
 * Adds a radiance-scale uniform to three's `Sky` material so its output can be
 * brought into display range (see `SKY_ZENITH_TARGET_LUMINANCE`). Returns
 * false if the upstream shader no longer has the line being patched — a
 * three.js upgrade should surface as a loud warning, not a silently grey sky.
 */
export function installSkyRadianceScale(material: THREE.ShaderMaterial): boolean {
  if (material.uniforms[RADIANCE_SCALE_UNIFORM]) return true;

  const marker = "gl_FragColor = vec4( texColor, 1.0 );";
  if (!material.fragmentShader.includes(marker)) return false;

  material.uniforms[RADIANCE_SCALE_UNIFORM] = { value: 1 };
  material.fragmentShader =
    `uniform float ${RADIANCE_SCALE_UNIFORM};\n` +
    material.fragmentShader.replace(
      marker,
      `gl_FragColor = vec4( texColor * ${RADIANCE_SCALE_UNIFORM}, 1.0 );`,
    );
  material.needsUpdate = true;
  return true;
}

function setSkyRadianceScale(material: THREE.ShaderMaterial, scale: number): void {
  const uniform = material.uniforms[RADIANCE_SCALE_UNIFORM];
  if (uniform) uniform.value = scale;
}

/**
 * Normalises the sky's absolute brightness, then measures the tones that
 * everything reflecting or fading into it needs.
 *
 * Two passes on purpose: the first measures the sky as authored, which is the
 * only way to know what to divide by; the second measures it as it will
 * actually be rendered, so the water's reflection and the fog colour are the
 * real sky rather than an estimate of it.
 *
 * Call this while `scene` still contains only the sky and lights — before the
 * PMREM bake, so the environment map inherits the corrected scale — and
 * nothing else can bleed into the measurement.
 */
export function calibrateSkyLighting(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  skyMaterial: THREE.ShaderMaterial,
  sunDirection: THREE.Vector3,
  viewDirection: THREE.Vector3,
): SkyLighting {
  setSkyRadianceScale(skyMaterial, 1);
  const raw = sampleSkyLighting(renderer, scene, sunDirection, viewDirection);
  const rawView = luminance(raw.skyView);
  // A degenerate sky (sun below the horizon, or a shader that failed to
  // patch) must not turn into a divide-by-zero blowout.
  const scale = rawView > 1e-4 ? SKY_VIEW_TARGET_LUMINANCE / rawView : 1;
  setSkyRadianceScale(skyMaterial, scale);
  const calibrated = sampleSkyLighting(renderer, scene, sunDirection, viewDirection);
  if (import.meta.env.DEV) {
    // Tuning the sky by screenshot is slow; these numbers say most of what a
    // round needs to know. `view` is the band that actually reaches the
    // screen — if it drifts up, the sky is washing out again.
    const fmt = (c: THREE.Color) =>
      `${luminance(c).toFixed(3)}(b/r ${(c.b / Math.max(c.r, 1e-4)).toFixed(2)})`;
    console.log(
      `[rig] rawView=${rawView.toFixed(3)} scale=${scale.toFixed(4)} ` +
        `view=${fmt(calibrated.skyView)} horizon=${fmt(calibrated.skyHorizon)} ` +
        `zenith=${fmt(calibrated.skyZenith)}`,
    );
  }
  return calibrated;
}

/**
 * Renders the sky dome into a tiny offscreen target and reads back the
 * radiance along each direction the rest of the rig cares about.
 */
export function sampleSkyLighting(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  sunDirection: THREE.Vector3,
  viewDirection: THREE.Vector3,
): SkyLighting {
  const target = new THREE.WebGLRenderTarget(PROBE_SIZE, PROBE_SIZE, {
    type: THREE.FloatType,
    colorSpace: THREE.LinearSRGBColorSpace,
  });
  const camera = new THREE.PerspectiveCamera(AMBIENT_PROBE_FOV, 1, 0.1, 2000);
  const buffer = new Float32Array(PROBE_SIZE * PROBE_SIZE * 4);

  const skyZenith = new THREE.Color();
  averageProbe(
    renderer,
    scene,
    target,
    camera,
    new THREE.Vector3(0, 1, 0),
    AMBIENT_PROBE_FOV,
    buffer,
    skyZenith,
  );

  // Average four horizon directions so the sun's own limb doesn't dominate
  // the "what colour is the horizon" answer.
  const horizon = new THREE.Color();
  const sample = new THREE.Color();
  let hr = 0;
  let hg = 0;
  let hb = 0;
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2;
    averageProbe(
      renderer,
      scene,
      target,
      camera,
      new THREE.Vector3(Math.cos(angle), 0.06, Math.sin(angle)),
      AMBIENT_PROBE_FOV,
      buffer,
      sample,
    );
    hr += sample.r;
    hg += sample.g;
    hb += sample.b;
  }
  horizon.setRGB(hr / 4, hg / 4, hb / 4, THREE.LinearSRGBColorSpace);

  // The band the camera actually frames — see SKY_VIEW_TARGET_LUMINANCE.
  const view = new THREE.Color();
  averageProbe(renderer, scene, target, camera, viewDirection, VIEW_PROBE_FOV, buffer, view);

  target.dispose();

  return {
    sunDirection: sunDirection.clone(),
    sunColor: new THREE.Color(SUN_COLOR),
    skyZenith,
    skyHorizon: horizon,
    skyView: view,
  };
}
