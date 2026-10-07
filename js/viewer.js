// Interactive 3D model viewer, rendered with three.js WebGPURenderer.
// Falls back to WebGL2 automatically on browsers without WebGPU.
import * as THREE from 'three/webgpu';
import { uv, length, smoothstep, float } from 'three/tsl';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

// Models shown in the viewer. `finish: true` swaps in the swatch material;
// otherwise the model keeps the materials and textures it was exported with.
const MODELS = {
  ring: { url: 'assets/models/ring.glb', finish: true },
  cabinet: { url: 'assets/models/cabinet.glb', finish: false },
};
const FIT_SIZE = 4; // model is scaled so its largest side is this many units

const wrap = document.getElementById('viewer-wrap');
const canvas = document.getElementById('viewer-canvas');
const loadingEl = document.getElementById('viewer-loading');
const progressEl = document.getElementById('viewer-progress');
const badge = document.getElementById('renderer-badge');

const renderer = new THREE.WebGPURenderer({
  canvas, antialias: true,
  forceWebGL: new URLSearchParams(location.search).has('webgl') // ?webgl forces the WebGL2 backend
});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 200);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.autoRotate = true;
controls.autoRotateSpeed = 1.2;
controls.minDistance = 1.5;
controls.maxDistance = 20;

// Key + rim lights on top of the image-based environment lighting
const key = new THREE.DirectionalLight(0xffffff, 1.6);
key.position.set(4, 6, 5);
const rim = new THREE.DirectionalLight(0x8fb4ff, 1.2);
rim.position.set(-5, 3, -4);
scene.add(key, rim);

// Soft fake contact shadow on the floor
const shadowMat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false });
shadowMat.colorNode = float(0);
shadowMat.opacityNode = smoothstep(0.5, 0.0, length(uv().sub(0.5))).mul(0.55);
const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), shadowMat);
shadow.rotation.x = -Math.PI / 2;
scene.add(shadow);

const material = new THREE.MeshPhysicalNodeMaterial({
  color: 0xc0c0c0, metalness: 1, roughness: 0.18, clearcoat: 0.6, clearcoatRoughness: 0.1
});

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const loaded = {}; // id -> scene, cached after first load
let model = null;
let current = null;
let wireframe = false;
const home = { position: new THREE.Vector3(), target: new THREE.Vector3() };

function frame() {
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const radius = size.length() / 2;
  const dist = radius / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2));
  home.target.set(0, size.y / 2, 0);
  home.position.set(dist * 0.55, size.y / 2 + dist * 0.25, dist * 0.8);
  camera.position.copy(home.position);
  controls.target.copy(home.target);
  controls.update();
  shadow.scale.setScalar(Math.max(size.x, size.z) * 1.6);
}

function meshMaterials(root) {
  const list = [];
  root.traverse((o) => { if (o.isMesh) list.push(...[].concat(o.material)); });
  return list;
}

function applyWireframe() {
  if (!model) return;
  for (const m of meshMaterials(model)) { m.wireframe = wireframe; m.needsUpdate = true; }
}

async function loadModel(id) {
  if (!loaded[id]) {
    loadingEl.classList.remove('done');
    progressEl.textContent = 'Loading model…';
    const gltf = await loader.loadAsync(MODELS[id].url, (e) => {
      if (e.total) progressEl.textContent = `Loading model… ${Math.round((e.loaded / e.total) * 100)}%`;
    });
    const root = gltf.scene;
    if (MODELS[id].finish) root.traverse((o) => { if (o.isMesh) o.material = material; });

    // Center on the floor and normalise scale
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const s = FIT_SIZE / Math.max(size.x, size.y, size.z);
    root.scale.setScalar(s);
    root.position.set(-center.x * s, -box.min.y * s, -center.z * s);
    loaded[id] = root;
  }
  if (current !== id) return; // another tab was picked while this one loaded
  if (model) scene.remove(model);
  model = loaded[id];
  scene.add(model);
  applyWireframe();
  frame();
  loadingEl.classList.add('done');
}

function showModel(id) {
  current = id;
  document.querySelectorAll('.model-tab').forEach((t) => t.classList.toggle('active', t.dataset.model === id));
  wrap.querySelector('.swatches').hidden = !MODELS[id].finish;
  loadModel(id).catch((err) => {
    console.error(err);
    progressEl.textContent = 'Could not load the model.';
  });
}

function resize() {
  const { clientWidth: w, clientHeight: h } = canvas;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(canvas);

// ---- UI ----
const btnRotate = document.getElementById('btn-rotate');
btnRotate.addEventListener('click', () => {
  controls.autoRotate = !controls.autoRotate;
  btnRotate.classList.toggle('active', controls.autoRotate);
});
// Stop auto-rotation as soon as the user grabs the model
controls.addEventListener('start', () => {
  controls.autoRotate = false;
  btnRotate.classList.remove('active');
});

const btnWire = document.getElementById('btn-wire');
btnWire.addEventListener('click', () => {
  wireframe = !wireframe;
  applyWireframe();
  btnWire.classList.toggle('active', wireframe);
});

document.getElementById('btn-reset').addEventListener('click', () => {
  if (!model) return;
  camera.position.copy(home.position);
  controls.target.copy(home.target);
  controls.update();
});

document.querySelectorAll('.swatch').forEach((sw) => {
  sw.addEventListener('click', () => {
    document.querySelectorAll('.swatch').forEach((s) => s.classList.remove('active'));
    sw.classList.add('active');
    material.color.set(sw.dataset.color);
    material.metalness = Number(sw.dataset.metal);
    material.roughness = Number(sw.dataset.rough);
  });
});

document.querySelectorAll('[data-model]').forEach((el) => {
  el.addEventListener('click', () => showModel(el.dataset.model));
});

document.getElementById('btn-full').addEventListener('click', () => {
  if (document.fullscreenElement) document.exitFullscreen();
  else wrap.requestFullscreen?.();
});

// ---- Boot ----
let visible = true;
new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }).observe(wrap);

await renderer.init();
badge.textContent = renderer.backend.isWebGPUBackend ? 'WebGPU' : 'WebGL 2 (fallback)';

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = (await pmrem.fromSceneAsync(new RoomEnvironment(), 0.04)).texture;
scene.environmentIntensity = 0.9;

resize();
renderer.setAnimationLoop(() => {
  if (!visible) return;
  controls.update();
  renderer.render(scene, camera);
});

showModel('ring');
