// Hero background: a field of glowing particles drifting on a noise wave,
// animated entirely on the GPU with three.js TSL (WebGPU, WebGL2 fallback).
import * as THREE from 'three/webgpu';
import {
  instancedBufferAttribute, time, uv, vec3, float, sin, cos, mix, color, smoothstep, length, uniform
} from 'three/tsl';

const canvas = document.getElementById('hero-canvas');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const renderer = new THREE.WebGPURenderer({
  canvas, antialias: true, alpha: true,
  forceWebGL: new URLSearchParams(location.search).has('webgl') // ?webgl forces the WebGL2 backend
});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
camera.position.set(0, 2.2, 9);
camera.lookAt(0, 0, 0);

// Grid of particles on the XZ plane
const COLS = 180, ROWS = 90;
const COUNT = COLS * ROWS;
const base = new Float32Array(COUNT * 3);
for (let i = 0; i < COUNT; i++) {
  const x = (i % COLS) / (COLS - 1) - 0.5;
  const z = Math.floor(i / COLS) / (ROWS - 1) - 0.5;
  base[i * 3] = x * 26;
  base[i * 3 + 1] = 0;
  base[i * 3 + 2] = z * 13;
}

const pointer = uniform(new THREE.Vector2(0, 0));
const basePos = instancedBufferAttribute(new THREE.InstancedBufferAttribute(base, 3));
const t = reduceMotion ? float(0) : time.mul(0.6);

// Layered sine waves give a calm, ocean-like surface
const wave = sin(basePos.x.mul(0.45).add(t))
  .add(cos(basePos.z.mul(0.7).sub(t.mul(1.3))))
  .add(sin(basePos.x.mul(0.18).add(basePos.z.mul(0.32)).add(t.mul(0.7))).mul(1.5))
  .mul(0.35);
const height = wave.add(pointer.x.mul(basePos.z).mul(0.08));

const material = new THREE.SpriteNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
material.positionNode = vec3(basePos.x.add(pointer.y.mul(0.4)), height.sub(2.6), basePos.z);
material.scaleNode = float(0.055).add(height.mul(0.02));

const glow = smoothstep(0.5, 0.0, length(uv().sub(0.5)));
const tint = mix(color('#7c5cff'), color('#20d3c2'), smoothstep(-0.8, 0.8, height));
material.colorNode = tint;
material.opacityNode = glow.mul(0.85);

const particles = new THREE.Sprite(material);
particles.count = COUNT;
particles.frustumCulled = false;
scene.add(particles);

function resize() {
  const { clientWidth: w, clientHeight: h } = canvas;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);

addEventListener('pointermove', (e) => {
  pointer.value.set((e.clientX / innerWidth) * 2 - 1, (e.clientY / innerHeight) * 2 - 1);
});

// Pause rendering while the hero is off-screen
let visible = true;
new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }).observe(canvas);

await renderer.init();
resize();
renderer.setAnimationLoop(() => {
  if (visible) renderer.render(scene, camera);
});
