/* Home page: 3D injector renders for the MAPS steps.
   Adapted from design-source/Injector 3D Viewer.html. One WebGL scene is shared by the four
   step panels: the canvas moves into the active panel's .step-art and plays that
   step's animation. The SVG illustrations stay in the markup as the fallback. */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const LABEL_LINES = ['DMPA-SC', 'Single dose · S.C.'];
// Index 0 is the resting pose; 1–4 are the MAPS steps (tab index + 1).
const STEPS = [{ dur: 0 }, { dur: 4.5 }, { dur: 5 }, { dur: 6 }, { dur: 7.5 }];
const LOOP_PAUSE = 2.5;   // seconds to hold the end of a step before replaying it
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const tabs = [...document.querySelectorAll('.step-tab')];
const panels = tabs.map(t => document.getElementById(t.getAttribute('aria-controls')));

// Stage: canvas plus the overlay chip and replay button
const container = document.createElement('div');
container.className = 'step-3d';
container.innerHTML = '<span class="step-3d__chip"></span>' +
  '<button class="step-3d__replay" type="button" aria-label="Replay animation">↻ Replay</button>' +
  '<span class="step-3d__hint">Drag to turn</span>';
const chipEl = container.querySelector('.step-3d__chip');
const replayBtn = container.querySelector('.step-3d__replay');

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x000000, 0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
container.appendChild(renderer.domElement);
renderer.domElement.setAttribute('aria-hidden', 'true');

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 600);
const DEMO_POS = new THREE.Vector3(-19, 20, 86);
camera.position.copy(DEMO_POS);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enablePan = false;
controls.enableZoom = false;   // keep the mouse wheel for scrolling the page

const key = new THREE.DirectionalLight(0xffffff, 1.6);
key.position.set(20, 60, 25);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, near: 1, far: 200 });
key.shadow.radius = 5;
key.shadow.bias = -0.0005;
scene.add(key);
scene.add(new THREE.HemisphereLight(0xffffff, 0xbbbbbb, 0.6));

const ground = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), new THREE.ShadowMaterial({ opacity: 0.12 }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// ---------- Materials ----------
const clear = new THREE.MeshPhysicalMaterial({
  color: 0xf4f7fa, roughness: 0.12, metalness: 0, transparent: true, opacity: 0.38,
  clearcoat: 1, clearcoatRoughness: 0.05, depthWrite: false, side: THREE.DoubleSide
});
const capMat = clear.clone();
const frosted = new THREE.MeshPhysicalMaterial({
  color: 0xf8f8f6, roughness: 0.45, transparent: true, opacity: 0.94, clearcoat: 0.6, side: THREE.DoubleSide
});
const steel = new THREE.MeshStandardMaterial({ color: 0xd8dbe0, metalness: 1, roughness: 0.22 });
const skinMat = new THREE.MeshPhysicalMaterial({ color: 0xc68863, roughness: 0.55, sheen: 0.4, sheenColor: 0xffd2b8, transparent: true, opacity: 0 });

function cylX(rTop, rBot, len, mat, x, seg = 48) {
  const g = new THREE.CylinderGeometry(rTop, rBot, len, seg);
  g.rotateZ(Math.PI / 2);
  const m = new THREE.Mesh(g, mat);
  m.position.x = x;
  m.castShadow = true;
  return m;
}

function labelTexture(lines) {
  const c = document.createElement('canvas');
  c.width = 960; c.height = 512;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = '#1d1d22';
  ctx.textBaseline = 'middle';
  ctx.font = '700 104px system-ui, sans-serif';
  ctx.fillText(lines[0], 60, 200);
  ctx.font = '400 64px system-ui, sans-serif';
  ctx.fillText(lines[1], 60, 330);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// ---------- Device ----------
const TILT = Math.PI / 2;                                       // needle straight down, perpendicular to skin
const N = new THREE.Vector3(Math.sin(TILT), Math.cos(TILT), 0); // skin normal in device frame
const parts = {};
const injector = new THREE.Group();
injector.rotation.y = 0.5;
const YAW = injector.rotation.y;

const plate = new THREE.Mesh(new RoundedBoxGeometry(30, 2, 18, 4, 0.9), clear);
plate.position.set(13, 0, 0);
plate.castShadow = true;
injector.add(plate);
[6.8, 7.6, 8.4].forEach(r => {
  const t = new THREE.Mesh(new THREE.TorusGeometry(r, 0.12, 8, 80), clear);
  t.rotation.x = Math.PI / 2;
  t.position.set(9, 1.02, 0);
  injector.add(t);
});
parts.domeTop = new THREE.Mesh(new THREE.SphereGeometry(6, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2), frosted);
parts.domeTop.position.set(9, 1, 0); parts.domeTop.castShadow = true;
parts.domeBot = new THREE.Mesh(new THREE.SphereGeometry(6, 64, 32, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), frosted);
parts.domeBot.position.set(9, -1, 0); parts.domeBot.castShadow = true;
const rim = new THREE.Mesh(new THREE.CylinderGeometry(6.3, 6.3, 0.5, 64), frosted);
rim.position.set(9, 1.1, 0);
injector.add(parts.domeTop, parts.domeBot, rim);

const lg = new THREE.PlaneGeometry(15, 8);
lg.rotateX(-Math.PI / 2);
lg.rotateY(Math.PI / 2);
const label = new THREE.Mesh(lg, new THREE.MeshStandardMaterial({ map: labelTexture(LABEL_LINES), roughness: 0.6 }));
label.position.set(23, 1.03, 0);
injector.add(label);

// Port
injector.add(cylX(1.3, 1.3, 7, frosted, -0.5));
injector.add(cylX(3, 3, 1.2, clear, -4.6));
injector.add(cylX(2.0, 2.4, 6, clear, -8));
injector.add(cylX(2.6, 2.6, 0.8, clear, -6));

// Sliding needle
parts.needle = new THREE.Group();
parts.needle.add(cylX(0.7, 1.0, 7, frosted, -9.5));
parts.needle.add(cylX(0.16, 0.16, 6, steel, -16, 16));
const tipG = new THREE.ConeGeometry(0.16, 0.8, 16);
tipG.rotateZ(Math.PI / 2);
const tip = new THREE.Mesh(tipG, steel);
tip.position.x = -19.4;
parts.needle.add(tip);
injector.add(parts.needle);

// Cap
parts.cap = new THREE.Group();
parts.cap.add(cylX(2.1, 2.1, 9, capMat, 0));
parts.cap.add(cylX(2.7, 2.7, 0.9, capMat, 4.1));
injector.add(parts.cap);
const CAP_ON = new THREE.Vector3(-16, 0, 0);
const CAP_OFF = new THREE.Vector3(-36, 0, 7);
const GAP = 2.6;

// Skin
parts.skin = new THREE.Group();
parts.skin.rotation.z = -TILT;
const slab = new THREE.Mesh(new RoundedBoxGeometry(48, 8, 34, 4, 2), skinMat);
slab.receiveShadow = true; slab.castShadow = true;
parts.bump = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), skinMat);
parts.bump.position.y = 4;
parts.skin.add(slab, parts.bump);
injector.add(parts.skin);

// Fit to scene
const wrapper = new THREE.Group();
wrapper.add(injector);
parts.skin.visible = false;
const box = new THREE.Box3().setFromObject(injector);
const size = box.getSize(new THREE.Vector3());
const S = 52 / Math.max(size.x, size.y, size.z);
wrapper.scale.setScalar(S);
box.setFromObject(injector);
const center = box.getCenter(new THREE.Vector3());
wrapper.position.sub(center);
const GROUND_BASE = box.min.y - center.y - 4;
scene.add(wrapper);

// ---------- Fingers: thumb on top of the bubble, index finger underneath ----------
const fclamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (a, b, x) => { const t = fclamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const FLAT_X = 1.1, FLAT_Z = 0.88;   // fingers are a little wider than they are deep

function fadeTexture() {
  const c = document.createElement('canvas');
  c.width = 4; c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 256, 0, 0);   // bottom of texture = finger base
  grad.addColorStop(0, '#000'); grad.addColorStop(0.3, '#fff'); grad.addColorStop(1, '#fff');
  g.fillStyle = grad; g.fillRect(0, 0, 4, 256);
  return new THREE.CanvasTexture(c);
}
const fingerSkin = new THREE.MeshPhysicalMaterial({
  color: 0xffffff, vertexColors: true, roughness: 0.5, sheen: 0.6, sheenRoughness: 0.55,
  sheenColor: 0xffc9b0, clearcoat: 0.12, clearcoatRoughness: 0.6,
  alphaMap: fadeTexture(), transparent: true, opacity: 0
});
// Acrylic nail art: pink-violet-teal ombré with white flowers and gold glitter
function nailArtTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const grad = g.createLinearGradient(0, 512, 0, 0);   // bottom = cuticle, top = free edge
  grad.addColorStop(0, '#ff4f9a'); grad.addColorStop(0.5, '#9b5cf6'); grad.addColorStop(1, '#1fc8c8');
  g.fillStyle = grad; g.fillRect(0, 0, 512, 512);
  // flowers
  // the visible top of the nail is the left half of the texture, so the flowers go there
  const spots = [[128, 150, 30], [70, 290, 22], [180, 330, 26], [110, 420, 18], [200, 200, 16], [55, 170, 14]];
  for (const [x, y, r] of spots) {
    const rot = rnd() * Math.PI;
    g.save(); g.translate(x, y); g.rotate(rot);
    g.fillStyle = '#ffffff';
    for (let k = 0; k < 5; k++) {
      g.rotate((Math.PI * 2) / 5);
      g.beginPath(); g.ellipse(0, -r * 0.62, r * 0.36, r * 0.6, 0, 0, Math.PI * 2); g.fill();
    }
    g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(0, 0, r * 0.28, 0, Math.PI * 2); g.fill();
    g.restore();
  }
  // gold glitter
  for (let i = 0; i < 260; i++) {
    g.fillStyle = `rgba(255, ${200 + Math.floor(rnd() * 40)}, 90, ${0.5 + rnd() * 0.5})`;
    g.beginPath(); g.arc(rnd() * 512, rnd() * 512, 0.8 + rnd() * 2.2, 0, Math.PI * 2); g.fill();
  }
  // thin gold line where the colour meets the cuticle
  g.fillStyle = '#f2c14e'; g.fillRect(0, 488, 512, 6);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
const nailMat = new THREE.MeshPhysicalMaterial({
  color: 0xffffff, map: nailArtTexture(), roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.03,
  iridescence: 0.25, iridescenceIOR: 1.4, transparent: true, opacity: 0
});

// Bend positions and normals toward the pad side (-z) at each joint
function bendAttr(geo, L, joints) {
  const p = geo.attributes.position, n = geo.attributes.normal;
  const v = new THREE.Vector3(), nv = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i); nv.fromBufferAttribute(n, i);
    for (let j = joints.length - 1; j >= 0; j--) {
      const yj = joints[j].t * L, w = 0.05 * L;
      const k = smooth(yj - w, yj + w, v.y);
      if (k <= 0) continue;
      const a = -joints[j].a * k, c = Math.cos(a), s = Math.sin(a);
      const dy = v.y - yj, dz = v.z;
      v.y = yj + dy * c - dz * s; v.z = dy * s + dz * c;
      const ny = nv.y, nz = nv.z;
      nv.y = ny * c - nz * s; nv.z = ny * s + nz * c;
    }
    p.setXYZ(i, v.x, v.y, v.z); n.setXYZ(i, nv.x, nv.y, nv.z);
  }
  p.needsUpdate = n.needsUpdate = true;
}
function bendPoint(v, L, joints) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([v.x, v.y, v.z], 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, 1], 3));
  bendAttr(g, L, joints);
  return new THREE.Vector3().fromBufferAttribute(g.attributes.position, 0);
}

function makeFinger({ L, R, joints, nailFrom, nailTo, nailW = 0.74 }) {
  const capLen = 0.95 * R, tc = 1 - capLen / L;
  const radius = t => {
    let r = R * (1 - 0.17 * t);
    joints.forEach(j => { r *= 1 + 0.06 * Math.exp(-(((t - j.t) / 0.05) ** 2)); });  // knuckles
    if (t > tc) { const u = (t - tc) / (1 - tc); r *= Math.sqrt(Math.max(0, 1 - u * u)); }
    return r;
  };
  const pts = [];
  const NP = 60;
  for (let i = 0; i <= NP; i++) { const t = i / NP; pts.push(new THREE.Vector2(Math.max(radius(t), 0.0001), t * L)); }
  const geo = new THREE.LatheGeometry(pts, 64);

  // Flatten, add the fingertip pad, paint skin tones
  const p = geo.attributes.position, n = geo.attributes.normal;
  const colors = [];
  const base = new THREE.Color(0xc68863), rosy = new THREE.Color(0xd4836f), crease = new THREE.Color(0x9a634a);
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    let z = p.getZ(i);
    const t = y / L, r = Math.max(radius(t), 0.0001), side = z / r;   // side < 0 = pad
    if (side < 0 && t > 0.68) z *= 1 + 0.16 * Math.sin(Math.PI * fclamp((t - 0.68) / 0.3, 0, 1)) * -side;
    p.setXYZ(i, x * FLAT_X, y, z * FLAT_Z);
    const nx = n.getX(i) / FLAT_X, ny = n.getY(i), nz = n.getZ(i) / FLAT_Z;
    const nl = Math.hypot(nx, ny, nz) || 1;
    n.setXYZ(i, nx / nl, ny / nl, nz / nl);

    c.copy(base).lerp(rosy, smooth(0.78, 1, t) * (0.55 + 0.45 * Math.max(0, -side)));
    joints.forEach(j => {
      c.lerp(crease, Math.exp(-(((t - j.t) / 0.012) ** 2)) * 0.45 * Math.max(0, -side));       // palm crease
      c.lerp(crease, Math.exp(-(((t - j.t + 0.01) / 0.02) ** 2)) * 0.18 * Math.max(0, side));  // knuckle wrinkle
    });
    colors.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  bendAttr(geo, L, joints);
  const finger = new THREE.Mesh(geo, fingerSkin);
  finger.castShadow = true;

  // Acrylic nail: follows the nail bed, then extends past the fingertip to an almond-shaped tip
  const bedEnd = 0.9;
  const rN = radius((nailFrom + bedEnd) / 2);
  const surfAt = t => t <= bedEnd ? radius(t) * FLAT_Z : radius(bedEnd) * FLAT_Z - (t - bedEnd) * L * 0.3;
  const tm = (nailFrom + nailTo) / 2;
  const nailGeo = new THREE.SphereGeometry(1, 64, 32);
  nailGeo.scale(nailW * rN * FLAT_X, (nailTo - nailFrom) * L / 2, 0.18 * rN);
  const np = nailGeo.attributes.position;
  for (let i = 0; i < np.count; i++) {
    const y = np.getY(i) + tm * L, t = y / L;
    const free = smooth(bedEnd, nailTo, t);
    const x = np.getX(i) * (1 - 0.55 * free * free);          // taper toward the tip
    np.setXYZ(i, x, y, np.getZ(i) + surfAt(t) + 0.06 * rN - (x * x) / (rN * FLAT_X) * 0.5);
  }
  nailGeo.computeVertexNormals();
  bendAttr(nailGeo, L, joints);
  const nail = new THREE.Mesh(nailGeo, nailMat);
  nail.castShadow = true;

  const g = new THREE.Group();
  g.add(finger, nail);
  // Shift so the pad point that presses the bubble sits at the group origin
  const contact = bendPoint(new THREE.Vector3(0, 0.87 * L, -radius(0.87) * FLAT_Z * 1.08), L, joints);
  g.position.copy(contact).multiplyScalar(-1);
  return g;
}

function fingerRig(spec, flip, { tilt = 0, yaw = 0 } = {}) {
  const outer = new THREE.Group();      // sits at the contact point on the bubble
  if (flip) outer.rotation.z = Math.PI; // pad facing up for the finger underneath
  const angle = new THREE.Group();      // approach angle, so both digits lead back toward one hand
  angle.rotation.set(tilt, yaw, 0);
  const inner = new THREE.Group();
  inner.rotation.x = -Math.PI / 2;      // finger points along -z with the pad toward the bubble
  inner.add(makeFinger(spec));
  angle.add(inner);
  outer.add(angle);
  injector.add(outer);
  return outer;
}
// Thumb: short and broad, one joint, wide nail. Index: long and slim, two joints, more curl.
parts.thumb = fingerRig({ L: 19, R: 3.15, joints: [{ t: 0.5, a: 0.26 }], nailFrom: 0.72, nailTo: 1.1, nailW: 0.82 },
                       false, { tilt: 0.06, yaw: 0.38 });
parts.index = fingerRig({ L: 27, R: 2.4, joints: [{ t: 0.36, a: 0.34 }, { t: 0.69, a: 0.28 }], nailFrom: 0.8, nailTo: 1.09, nailW: 0.72 },
                       true, { tilt: 0.06, yaw: 0.12 });
parts.thumb.visible = parts.index.visible = false;

// ---------- Timeline ----------
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const ease = x => x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
const prog = (t, a, b) => ease(clamp((t - a) / (b - a), 0, 1));
const lin = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const UP = -Math.PI / 2;

function targetState(step, t) {
  const s = { rotZ: 0, lift: 0, side: 0, gap: 1, capOut: 0, capFade: 1,
              skin: 0, pinch: 0, insert: 0, finger: 0, press: 0 };
  for (let i = 1; i <= step; i++) {
    const tt = i < step ? 1e9 : t;
    switch (i) {
      case 1: break; // Mix: shaking handled in the loop
      case 2: // Activate
        s.rotZ = UP * prog(tt, 0, 0.9);
        s.gap = 1 - prog(tt, 1.2, 2.6);
        s.capOut = prog(tt, 3.0, 4.1); s.capFade = 1 - prog(tt, 3.6, 4.4); break;
      case 3: { // Pinch & insert
        const p = prog(tt, 0, 1.2);
        s.rotZ = UP + (TILT - UP) * p; s.lift = -2 * p;
        s.skin = prog(tt, 0.6, 1.4); s.pinch = prog(tt, 1.6, 2.4); s.insert = prog(tt, 2.8, 4.8); break;
      }
      case 4: // Slowly press
        s.finger = prog(tt, 0, 0.9); s.press = lin(tt, 1.1, 7.0); break;
    }
  }
  return s;
}
const cur = targetState(0, 0);

const tmp = new THREE.Vector3();

function applyState(s, shake) {
  parts.needle.position.x = -GAP * s.gap;
  parts.cap.position.copy(CAP_ON).lerp(CAP_OFF, s.capOut);
  parts.cap.position.x += -GAP * s.gap * (1 - s.capOut);
  capMat.opacity = 0.38 * s.capFade;
  parts.cap.visible = s.capFade > 0.01;

  injector.rotation.z = s.rotZ;
  injector.rotation.x = 0.12 * shake * Math.sin(stepT * 22);
  const sx = s.side, sz = 1.4 * shake * Math.sin(stepT * 26);
  injector.position.set(sx * Math.cos(YAW) + sz * Math.sin(YAW), s.lift, -sx * Math.sin(YAW) + sz * Math.cos(YAW));

  parts.skin.visible = s.skin > 0.01;
  skinMat.opacity = s.skin;
  skinMat.transparent = s.skin < 0.999;
  skinMat.depthWrite = s.skin > 0.5;
  const bumpH = 4.5 * s.pinch;
  parts.bump.scale.set(7, Math.max(0.01, bumpH), 6);
  const insertPoint = new THREE.Vector3(-23 + 11.8 * s.insert, 0, 0);
  parts.skin.position.copy(insertPoint).addScaledVector(N, -(4 + bumpH));

  // Both sides of the reservoir squeeze together
  const topScale = Math.max(0.08, 0.75 * (1 - 0.85 * s.press));
  const botScale = Math.max(0.08, 0.5 * (1 - 0.8 * s.press));
  parts.domeTop.scale.y = topScale;
  parts.domeBot.scale.y = botScale;

  // Thumb on top, index finger underneath, closing in as the bubble flattens
  parts.thumb.visible = parts.index.visible = s.finger > 0.01;
  fingerSkin.opacity = nailMat.opacity = s.finger;
  fingerSkin.depthWrite = nailMat.depthWrite = s.finger > 0.5;
  const away = 1 - s.finger;
  parts.thumb.position.set(9, 1 + 6 * topScale + 0.15 + away * 3, 1 + away * 14);
  parts.index.position.set(9, -1 - 6 * botScale - 0.15 - away * 3, 1 + away * 14);

  let gy = GROUND_BASE;
  if (parts.skin.visible) {
    slab.getWorldPosition(tmp);
    gy = Math.min(gy, THREE.MathUtils.lerp(GROUND_BASE, tmp.y - 4.5 * S, s.skin));
  }
  ground.position.y = gy;
}

// ---------- Page wiring ----------
// With reduced motion the steps don't loop on their own; Replay plays one pass.
let step = 1, stepT = 0, camGoal = null, visible = false, playing = !reduceMotion;
const settle = () => { if (reduceMotion && step > 0) { stepT = STEPS[step].dur; playing = false; } };

function goTo(i) {
  step = i + 1; stepT = 0;
  const art = panels[i].querySelector('.step-art');
  const label = [...art.querySelectorAll('.ill-text')].map(t => t.textContent).join(' ');
  chipEl.textContent = label;
  chipEl.hidden = !label;
  art.classList.add('step-art--3d');
  art.appendChild(container);
  camGoal = DEMO_POS.clone();
  controls.target.set(0, 0, 0);
  settle();
}

const current = () => Math.max(0, tabs.findIndex(t => t.getAttribute('aria-selected') === 'true'));
new MutationObserver(() => { if (current() !== step - 1) goTo(current()); })
  .observe(document.querySelector('.step-tabs'), { subtree: true, attributes: true, attributeFilter: ['aria-selected'] });
replayBtn.addEventListener('click', () => { stepT = 0; camGoal = DEMO_POS.clone(); playing = true; });
controls.addEventListener('start', () => { camGoal = null; });

function resize() {
  const w = container.clientWidth, h = container.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.fov = w < 420 ? 44 : 38;
  camera.updateProjectionMatrix();
}
// Start from the finished previous step so the first frame isn't a jump
goTo(current());
for (const k in cur) cur[k] = targetState(step - 1, 1e9)[k];
// Observe only once the stage is in the page, otherwise the first callbacks are missed
new ResizeObserver(resize).observe(container);
new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(container);

// ---------- Loop ----------
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  if (!visible) return;
  if (playing) {
    stepT += dt;
    if (reduceMotion && stepT >= STEPS[step].dur) { stepT = STEPS[step].dur; playing = false; }
    else if (stepT > STEPS[step].dur + LOOP_PAUSE) stepT = 0;
  }
  const tgt = targetState(step, stepT);
  const follow = 1 - Math.exp(-11 * dt);   // ≈0.18 per frame at 60fps, same feel at any frame rate
  for (const k in cur) cur[k] += (tgt[k] - cur[k]) * follow;
  const shake = step === 1 && playing ? (stepT < 3.2 ? 1 : Math.max(0, 1 - (stepT - 3.2) / 0.4)) : 0;
  applyState(cur, shake);

  if (camGoal) {
    camera.position.lerp(camGoal, 1 - Math.exp(-3 * dt));
    if (camera.position.distanceTo(camGoal) < 0.3) camGoal = null;
  }
  controls.update();
  renderer.render(scene, camera);
});
