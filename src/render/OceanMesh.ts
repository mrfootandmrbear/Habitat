import * as THREE from "three";
import { config } from "../config";
import { createFieldTexture, updateFieldTexture } from "./fieldTexture";
import {
  SUN_COLOR,
  sunDirectionFromSky,
  type SkyLighting,
  type SkyLightingConsumer,
} from "./lightingRig";
import { SEABED_GLSL } from "./seabed";

// Same panning-fbm ripple + sky-reflection + sun-specular treatment as
// WaterMesh's shader (kept as a separate copy, not a shared import — the
// shader bodies are each meant to be self-contained render pieces). The
// *lighting* is not duplicated: sun direction/colour and the sky tones this
// plane reflects come from the shared rig via `setSkyLighting`, so the sea
// reads as the same water/light system as the inland WaterMesh and can never
// drift out of sync with the sun the way a hardcoded copy did.
const oceanVertex = /* glsl */ `
varying vec3 vWorldPos;

void main() {
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPos = worldPos.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

const oceanFragment = /* glsl */ `
varying vec3 vWorldPos;
uniform vec3 uShallowColor;
uniform vec3 uMidColor;
uniform vec3 uDeepColor;
uniform float uOpacity;
uniform float uShallowOpacity;
uniform float uTime;
uniform vec3 uSunDirection;
uniform vec3 uSunColor;
uniform vec3 uSkyZenith;
uniform vec3 uSkyHorizon;
uniform sampler2D uElevationTex;
uniform float uSeaLevel;
uniform float uWorldSize;
uniform float uShallowDepth;
uniform float uMidDepth;
uniform float uOpaqueMargin;
uniform vec3 uFoamColor;
uniform float uFoamDepth;
uniform float uDetailNear;
uniform float uDetailFar;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 3; i++) {
    sum += amp * valueNoise(p);
    p *= 2.03;
    amp *= 0.5;
  }
  return sum;
}

${SEABED_GLSL}

float rippleHeight(vec2 p, float t) {
  vec2 p1 = p * 0.35 + vec2(t * 0.07, t * 0.045);
  vec2 p2 = p * 0.83 - vec2(t * 0.05, t * 0.09);
  return fbm(p1) * 0.65 + fbm(p2) * 0.35;
}

vec2 rippleTilt(vec2 p, float t) {
  float eps = 0.12;
  float hL = rippleHeight(p - vec2(eps, 0.0), t);
  float hR = rippleHeight(p + vec2(eps, 0.0), t);
  float hD = rippleHeight(p - vec2(0.0, eps), t);
  float hU = rippleHeight(p + vec2(0.0, eps), t);
  return vec2(hL - hR, hD - hU) / (2.0 * eps);
}

void main() {
  vec2 p = vWorldPos.xz;

  // The plane now runs out to the visible horizon (see SEA_HORIZON_HALF_EXTENT),
  // which is hundreds of units past the sim grid. Two things break out there:
  // the ripple fbm's fract() math loses precision at large coordinates and
  // shimmers, and both ripples and sun sparkle are far below a pixel anyway,
  // so they alias into crawling noise. Fade the detail out with view distance
  // and let the far sea settle into a clean flat band — which is also how the
  // references read: saturated, calm open water, not textured to the horizon.
  float viewDist = length(cameraPosition - vWorldPos);
  float detail = 1.0 - smoothstep(uDetailNear, uDetailFar, viewDist);

  // Fragment-only normal perturbation — the plane's vertex Y is left
  // untouched (no vertex displacement) so the depthWrite/polygonOffset
  // shoreline z-fight fix noted below still applies exactly as tuned.
  vec2 tilt = rippleTilt(p, uTime) * detail;
  vec3 n = normalize(vec3(0.0, 1.0, 0.0) + vec3(tilt.x, 0.0, tilt.y) * 0.5);

  vec3 viewDir = normalize(cameraPosition - vWorldPos);
  vec3 reflectDir = reflect(-viewDir, n);
  float skyT = smoothstep(0.0, 0.7, reflectDir.y * 0.5 + 0.5);
  vec3 skyColor = mix(uSkyHorizon, uSkyZenith, skyT);

  float ndv = clamp(dot(n, viewDir), 0.0, 1.0);
  float fresnel = 0.02 + 0.98 * pow(1.0 - ndv, 5.0);

  // --- Depth banding (bar v2 points 6-8) --------------------------------
  // Map world XZ onto the terrain field to get the real seabed inside the
  // sim grid. The texture is ClampToEdge, so sampling past the grid returns
  // the edge row rather than wrapping.
  vec2 gridUv = vWorldPos.xz / uWorldSize + 0.5;
  // fieldUv's V flip (see fieldTexture.ts) — fields upload row-major in +Z.
  float bed = texture2D(uElevationTex, vec2(gridUv.x, 1.0 - gridUv.y)).r;
  float gridDepth = max(uSeaLevel - bed, 0.0);

  // How far outside the sim grid this fragment is, in world units — the
  // standard box distance, so it is 0 everywhere inside and grows smoothly
  // outward with rounded rather than mitred corners.
  vec2 outsideXZ = abs(vWorldPos.xz) - uWorldSize * 0.5;
  float outside = seabedOutside(vWorldPos.xz, length(max(outsideXZ, 0.0)));

  // Continue the seabed past the map footprint. This MUST be the same function
  // TerrainMesh's skirt geometry uses, which is why it lives in seabed.ts and
  // not here: when the two were written separately the water painted shallow
  // turquoise over troughs the geometry had actually sunk, and dark ridges
  // showed up where the ramp expected open blue. Colour and shape describing
  // one surface have to come from one definition.
  //
  // Note this is the OPPOSITE of terracing (see the shape ruling in
  // reference/OBSERVATIONS.md): it turns the one hard geometric step in the
  // frame into a continuous slope.
  float depth = gridDepth + seabedDrop(vWorldPos.xz, outside);

  // Two-stage ramp: sand-lit shallow -> turquoise -> deep teal. Godus reads
  // as distinct depth bands rather than one plane colour, so the stages are
  // deliberately separated instead of a single linear gradient.
  float shallowT = smoothstep(0.0, uShallowDepth, depth);
  float deepT = smoothstep(uShallowDepth, uMidDepth, depth);
  vec3 waterColor = mix(uShallowColor, uMidColor, shallowT);
  waterColor = mix(waterColor, uDeepColor, deepT);

  // Bar v2 point 8 — "the shoreline shows a distinct pale band between land
  // and shallow water" — scored FAIL: on the east shore the frame stepped
  // from land straight to teal in a single pixel. This is that band, and it
  // is squared so it stays tight to the waterline instead of washing the
  // whole shelf pale. natural-mauritius-lagoon is the reference.
  float foam = 1.0 - smoothstep(0.0, uFoamDepth, depth);
  waterColor = mix(waterColor, uFoamColor, foam * foam * 0.9);

  float ndl = 0.52 + 0.48 * max(dot(n, uSunDirection), 0.0);
  // Fresnel runs to 1 at the grazing angles that fill the top of frame, so a
  // full-strength sky mirror out there turns the whole far sea into a pale
  // band of sky colour — trading the old grey sky dome for an equally grey
  // sea. The references keep deep water saturated all the way to the frame
  // edge, so the sky mirror is damped with the same distance term.
  float skyMix = fresnel * 0.65 * mix(0.35, 1.0, detail);
  vec3 col = mix(waterColor * ndl, skyColor, skyMix);

  // Sun specular sparkle, softly compressed so it never hard-clips to a
  // flat white disc (bar item 10).
  vec3 halfDir = normalize(viewDir + uSunDirection);
  float spec = pow(max(dot(n, halfDir), 0.0), 140.0);
  float sparkle = 0.5 + 0.9 * valueNoise(p * 9.0 + uTime * 0.6);
  spec *= sparkle * (0.3 + 0.7 * fresnel) * detail;
  vec3 specCol = uSunColor * spec * 1.4;
  specCol = specCol / (1.0 + specCol);
  col += specCol;

  // Opacity ramps with depth for the same reason the colour does: Godus
  // shallows glow because the lit sand reads *through* them, while deep water
  // hides its bed entirely. A single fixed opacity (0.55) was the diagnosed
  // cause of the old muddy near-neutral plane — the dark bed dominated the
  // blend everywhere, including where it should have been bright sand.
  float bedOpacity = mix(uShallowOpacity, uOpacity, smoothstep(0.0, uMidDepth, depth));
  // There IS a seabed past the sim grid now — TerrainMesh's skirt continues it
  // (see buildSkirtGeometry). Before that existed, the water had only the
  // bright below-horizon sky dome behind it out here, and staying transparent
  // over that drew a glowing halo around the map footprint; the stopgap was to
  // force the water opaque just inside the boundary, which worked but threw
  // away the owner's stated requirement of seeing the underwater world.
  //
  // With real geometry behind it the water can stay honest and simply go
  // opaque with depth, like water does. uOpaqueMargin remains as a safety net
  // for the far field, where the skirt eventually ends too.
  float signedOut = max(outsideXZ.x, outsideXZ.y);
  bedOpacity = mix(bedOpacity, 1.0, smoothstep(uOpaqueMargin, uOpaqueMargin * 3.0, signedOut));
  // Let the specular sparkle read through the transparency instead of
  // being washed out flat by the fixed low opacity.
  float alpha = clamp(bedOpacity + spec * 0.35, 0.0, 1.0);
  // Far open water goes fully opaque. There is no bed to read through out
  // there, and leaving it transparent means it blends against whatever the
  // backdrop happens to be, which is how the distant sea lost its colour.
  // This is NOT the "forced opaque at the grid edge" idea rejected below —
  // that one fired right beside the island and turned the sun glint into hard
  // streaks off the plane's corners. This fires only past uDetailFar (300
  // units, an order of magnitude beyond the grid), where the same detail
  // term has already faded the specular out entirely.
  alpha = mix(1.0, alpha, detail);
  // NOT forced opaque at the grid edge. Tried mix(1.0, alpha, gridFalloff)
  // to hide the terrain mesh's boundary showing through; it traded the
  // rectangle for worse — fully opaque water made the sun glint read as hard
  // bright streaks off the plane's corners. The residual seam is a geometry
  // problem (the terrain mesh simply stops) and wants a terrain skirt, not
  // more shader compensation here.

  gl_FragColor = vec4(col, alpha);
}
`;

/**
 * Half-width of the sea plane, in world units — far enough that the sea runs
 * past the horizon instead of stopping inside the camera frustum.
 *
 * It used to be `worldSize * 1.35` (half-width 32.4) while the camera sits at
 * a horizontal radius of ~48, i.e. **the camera was outside the sea plane
 * entirely**. That single fact was behind two separately-tracked defects:
 *
 *  - the "square ocean seam" — the plane's own straight edge, visible as a
 *    rectangle cutting across open water; and
 *  - the flat grey band filling the top ~25% of frame, which every previous
 *    round read as a *sky* defect and tried to fix by tuning the atmosphere.
 *    It is not sky-as-the-player-would-know-it: the camera pitches down 27.4°
 *    with a 50° vertical FOV, so the top of frame sits ~2.4° *below*
 *    horizontal, and what shows past the sea plane's edge is the Preetham
 *    dome's below-horizon region. Measured directly with the rig's own probe:
 *    that region is b/r **1.05** in linear space — it is nearly achromatic
 *    before tone mapping ever touches it, so no amount of rayleigh, exposure
 *    or calibration tuning could have made it blue.
 *
 * Sized from the geometry rather than guessed: the top-of-frame ray leaves the
 * camera (height 28) at 2.4° below horizontal and so meets sea level at
 * 28 / tan(2.4°) ≈ 670 units. 900 clears that with margin for orbiting the
 * camera, and it is two triangles either way.
 */
export const SEA_HORIZON_HALF_EXTENT = 900;

/**
 * Visual ocean plane at sea level (observer only — T-006).
 * C-015: shoreline reads against this plane without an inspector.
 */
export class OceanMesh implements SkyLightingConsumer {
  readonly mesh: THREE.Mesh;
  private readonly material: THREE.ShaderMaterial;
  private readonly uniforms: Record<string, THREE.IUniform>;
  /** Seafloor elevation, so the plane can band its colour by water depth. */
  private readonly elevationTex: THREE.DataTexture;
  /** Wall-clock accumulator driving ripple/sparkle animation; wrapped to
   *  keep float precision sane across long play sessions. */
  private elapsedSeconds = 0;
  private lastRenderMs: number | undefined = undefined;

  constructor(
    worldSize = config.worldSize,
    gridWidth = config.gridSize,
    gridHeight = config.gridSize,
  ) {
    // `worldSize` stays the *grid* size — it is what the depth-banding shader
    // maps world XZ onto — while the plane's own extent is independent of it.
    const geo = new THREE.PlaneGeometry(
      SEA_HORIZON_HALF_EXTENT * 2,
      SEA_HORIZON_HALF_EXTENT * 2,
    );
    geo.rotateX(-Math.PI / 2);
    this.elevationTex = createFieldTexture(gridWidth, gridHeight);
    this.uniforms = {
      // Godus-clarity palette (bar v2 points 6-8): a bright saturated shallow
      // reading off lit sand, a turquoise mid band, and a deep blue-teal. The
      // single dark navy this replaced (0x1a4a6e) is what measured
      // rgb(42,48,52) on screen — a near-neutral plane with no depth read.
      uShallowColor: { value: new THREE.Color(0x36e0d2) },
      uMidColor: { value: new THREE.Color(0x1f9fb5) },
      uDeepColor: { value: new THREE.Color(0x1b5f78) },
      uOpacity: { value: 0.88 },
      uShallowOpacity: { value: 0.58 },
      uElevationTex: { value: this.elevationTex },
      uSeaLevel: { value: 0 },
      uWorldSize: { value: worldSize },
      uShallowDepth: { value: 0.9 },
      uMidDepth: { value: 3.5 },
      // World units PAST the grid boundary at which the water starts closing
      // up, reaching fully opaque at three times that. Sized to sit well
      // inside SKIRT_REACH so there is always real seabed behind the water
      // while it is still see-through.
      uOpaqueMargin: { value: 14.0 },
      // Pale wet-sand band right at the waterline (bar v2 point 8).
      uFoamColor: { value: new THREE.Color(0xd9f2e4) },
      uFoamDepth: { value: 0.32 },
      // View distances over which ripple detail and sun sparkle fade out.
      // `near` sits beyond the grid's far corner as seen from the camera home
      // (~85 units), so nothing inside the playable world loses its ripples.
      uDetailNear: { value: 90 },
      uDetailFar: { value: 300 },
      uTime: { value: 0 },
      // Seeded from the shared rig so the plane is lit correctly even before
      // the measured sky lands; `setSkyLighting` overwrites both with the
      // values probed off the real sky dome.
      uSunDirection: { value: sunDirectionFromSky() },
      uSunColor: { value: new THREE.Color(SUN_COLOR) },
      uSkyZenith: { value: new THREE.Color(0.53, 0.7, 0.86) },
      uSkyHorizon: { value: new THREE.Color(0xcdd9e2) },
    };
    // Opaque-enough + depthWrite + FrontSide: DoubleSide + depthWrite:false
    // z-fought the shoreline every sim/camera frame (playtest flash).
    // Opacity kept moderate so Sea: mid reads as a surrounding plane, not a
    // filled aquarium tank that looks like the island is drowning (playtest).
    this.material = new THREE.ShaderMaterial({
      vertexShader: oceanVertex,
      fragmentShader: oceanFragment,
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: true,
      depthTest: true,
      side: THREE.FrontSide,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.name = "ocean";
    this.mesh.renderOrder = 0;
    this.mesh.visible = false;
    // Self-contained animation hook: three.js calls this every render for
    // any mesh in the frustum, so ripples/sparkle animate without needing
    // a per-frame call wired in from main.ts. Uses real wall-clock delta
    // (not an assumed 60fps step) so ripple speed stays frame-rate-independent.
    this.mesh.onBeforeRender = () => {
      const now = performance.now();
      const dt =
        this.lastRenderMs === undefined
          ? 1 / 60
          : Math.min((now - this.lastRenderMs) / 1000, 0.1);
      this.lastRenderMs = now;
      this.elapsedSeconds = (this.elapsedSeconds + dt) % 10000;
      this.uniforms.uTime!.value = this.elapsedSeconds;
    };
  }

  /** Adopt the scene's measured sun/sky so reflections match the real sky. */
  setSkyLighting(lighting: SkyLighting): void {
    (this.uniforms.uSunDirection!.value as THREE.Vector3).copy(lighting.sunDirection);
    (this.uniforms.uSunColor!.value as THREE.Color).copy(lighting.sunColor);
    (this.uniforms.uSkyZenith!.value as THREE.Color).copy(lighting.skyZenith);
    (this.uniforms.uSkyHorizon!.value as THREE.Color).copy(lighting.skyHorizon);
  }

  /**
   * Upload the seafloor the plane is sitting over, so depth banding tracks
   * sculpting. Cheap enough to call whenever terrain changes; the texture is
   * a single-channel float the size of the sim grid.
   */
  setTerrain(elevation: Float32Array): void {
    updateFieldTexture(this.elevationTex, elevation);
  }

  /** Show ocean at sea level (m). Pass undefined to hide. */
  setSeaLevel(seaLevel: number | undefined): void {
    if (seaLevel === undefined) {
      this.mesh.visible = false;
      return;
    }
    // Hair below datum so land foreshore verts at ~sea win depth cleanly.
    this.mesh.position.y = seaLevel - 0.02;
    // The shader needs the true datum, not the offset mesh position, or every
    // depth would be biased by the z-fight hair above.
    this.uniforms.uSeaLevel!.value = seaLevel;
    this.mesh.visible = true;
  }
}
