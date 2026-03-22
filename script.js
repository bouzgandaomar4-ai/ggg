import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// ============ GLOBAL VARIABLES ============
let scene, camera, renderer, composer;
let mountains = null;
let logo = null;
let logoMaterials = [];
let mountainMaterials = [];
let mouse = new THREE.Vector2();
let raycaster = new THREE.Raycaster();
let isHoveringLogo = false;
let isHoveringButtons = false;
let ambientLight, mainLight, rimLight, logoLight;
let bloomPass;

// Plexus
let plexusGroup = null;
let plexusPoints = [];
let plexusLines = null;

// Animation State
let animState = 'IDLE'; // IDLE, ALIGNING, MOVING
let animProgress = 0;
let animDuration = 0;
let startPos = new THREE.Vector3();
let endPos = new THREE.Vector3();
let startQuat = new THREE.Quaternion();
let endQuat = new THREE.Quaternion();
let targetQuat = new THREE.Quaternion(); // For alignment phase

// Clock
let clock = new THREE.Clock();

// Starting position
const startPosition = {
  x: -0.51,
  y: 2.14,
  z: 10.47,
  lookHorizontal: 179.4 * (Math.PI / 180),
  lookVertical: -5.3 * (Math.PI / 180)
};

// Paths
const paths = {
  1: { x: -2.77, y: 2.64, z: 1.57 },
  2: { x: -0.66, y: 2.14, z: 10.35 },
  3: { x: -5.87, y: 2.14, z: 13.47 },
  4: { x: -0.61, y: 5.15, z: -7.06 }
};

const defaultSettings = {
  mountains: {
    x: -7.9, y: 4.9, z: 3.5,
    scaleX: 0.8, scaleY: 1.9, scaleZ: 1.0,
    uniformScale: 30,
    rotX: 0, rotY: 133, rotZ: 0
  },
  logo: {
    x: -0.6, y: 2.0, z: 8.2,
    scaleX: 1.0, scaleY: 1.0, scaleZ: 0.9,
    uniformScale: 0.8,
    rotX: 0, rotY: 0, rotZ: 2,
    baseColor: 0xd0d0d0,
    highlightColor: 0xf5f5f5,
    shadowColor: 0x808080,
    glowColor: 0x4da6ff,
    rivetColor: 0xb8b8b8,
    keyholeColor: 0x1a1a1a,
    metalness: 0.8,
    roughness: 0.2,
    glowIntensity: 0.0,
    clearCoat: 0.8
  },
  plexus: { count: 15, radius: 8, size: 0.05, lineOpacity: 0.4, changeSpeed: 200 }
};

// ============ INIT & SETUP ============
async function init() {
  try {
    updateLoadingStatus('Setting up...');
    setupScene();
    setupCamera();
    setupRenderer();
    setupPostProcessing();
    setupLights();
    setupFog();
    await loadMountains();
    await loadLogo();
    setupPlexus();
    setupEventListeners();
    updateLoadingStatus('Ready!');
    setTimeout(() => {
      document.getElementById('loader').classList.add('hidden');
      setTimeout(() => document.getElementById('welcome-overlay').classList.add('hidden'), 3000);
    }, 500);
    animate();
  } catch (error) { console.error(error); }
}

function setupScene() { scene = new THREE.Scene(); scene.background = new THREE.Color(0xffffff); }
function setupCamera() {
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  resetCameraToStart();
}
function resetCameraToStart() {
  camera.position.set(startPosition.x, startPosition.y, startPosition.z);
  const h = startPosition.lookHorizontal; const v = startPosition.lookVertical;
  const dir = new THREE.Vector3(Math.sin(h) * Math.cos(v), Math.sin(v), Math.cos(h) * Math.cos(v));
  camera.lookAt(camera.position.clone().add(dir));
}
function setupRenderer() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  document.getElementById('canvas-container').appendChild(renderer.domElement);
}
function setupPostProcessing() {
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.2, 0.4, 0.1);
  composer.addPass(bloomPass);
}
function setupLights() {
  scene.add(new THREE.AmbientLight(0xffffff, 0.4));
  const dl = new THREE.DirectionalLight(0xffffff, 0.6); dl.position.set(5, 10, 5); scene.add(dl);
  scene.add(new THREE.DirectionalLight(0x88ccff, 0.3)).position.set(-5, 2, -5);
  const pl = new THREE.PointLight(0x4da6ff, 0.3, 20); pl.position.set(-0.6, 2, 8.2); scene.add(pl);
  logoLight = pl;
}
function setupFog() { scene.fog = new THREE.FogExp2(0xffffff, 0.01); }

// ============ LOADERS ============
async function loadMountains() {
  const loader = new GLTFLoader();
  const urls = ['mountains.glb', './mountains.glb'];
  for (let url of urls) {
    try {
      const gltf = await loader.loadAsync(url);
      mountains = gltf.scene;
      const s = defaultSettings.mountains;
      mountains.position.set(s.x, s.y, s.z);
      mountains.scale.set(s.uniformScale * s.scaleX, s.uniformScale * s.scaleY, s.uniformScale * s.scaleZ);
      mountains.rotation.set(s.rotX * Math.PI / 180, s.rotY * Math.PI / 180, s.rotZ * Math.PI / 180);
      mountains.traverse(c => { if(c.isMesh) { c.material = c.material.clone(); mountainMaterials.push(c.material); }});
      scene.add(mountains); return;
    } catch(e) {}
  }
}
async function loadLogo() {
  const loader = new GLTFLoader();
  const urls = ['white_mesh.glb', './white_mesh.glb'];
  for (let url of urls) {
    try {
      const gltf = await loader.loadAsync(url);
      logo = gltf.scene;
      const s = defaultSettings.logo;
      logo.position.set(s.x, s.y, s.z);
      logo.scale.set(s.uniformScale * s.scaleX, s.uniformScale * s.scaleY, s.uniformScale * s.scaleZ);
      logo.rotation.set(s.rotX * Math.PI / 180, s.rotY * Math.PI / 180, s.rotZ * Math.PI / 180);
      logo.traverse(c => { if(c.isMesh && c.material) logoMaterials.push(c.material.clone()); });
      scene.add(logo); return;
    } catch(e) {}
  }
}

// ============ PLEXUS ============
function setupPlexus() {
  plexusGroup = new THREE.Group(); scene.add(plexusGroup);
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(500*3), 3));
  plexusLines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0 }));
  plexusGroup.add(plexusLines);
  for(let i=0; i<defaultSettings.plexus.count; i++) {
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x00d4ff, transparent: true, opacity: 0 }));
    spr.scale.set(0.1, 0.1, 1);
    spr.userData = { vel: new THREE.Vector3((Math.random()-0.5)*0.02, (Math.random()-0.5)*0.02, (Math.random()-0.5)*0.02) };
    spr.position.set(-7.9 + (Math.random()-0.5)*16, 4.9 + (Math.random()-0.5)*10, 3.5 + (Math.random()-0.5)*16);
    plexusGroup.add(spr); plexusPoints.push(spr);
  }
}
function updatePlexus(dt) {
  const isHov = isHoveringLogo || isHoveringButtons;
  plexusPoints.forEach(p => {
    p.position.add(p.userData.vel);
    if(p.position.distanceTo(new THREE.Vector3(-7.9, 4.9, 3.5)) > 10) p.userData.vel.multiplyScalar(-1);
    p.material.opacity += ((isHov ? 0.8 : 0.3) - p.material.opacity) * dt * 2;
  });
  // lines update simplified for performance
}

// ============ HOVER ============
window.onHoverStart = () => isHoveringButtons = true;
window.onHoverEnd = () => isHoveringButtons = false;
function checkLogoHover() {
  if(!logo) return; raycaster.setFromCamera(mouse, camera);
  isHoveringLogo = raycaster.intersectObject(logo, true).length > 0;
  document.body.style.cursor = isHoveringLogo ? 'pointer' : 'default';
}
function updateHoverEffects(dt) {
  const isHov = isHoveringLogo || isHoveringButtons;
  if(logoMaterials.length > 0) logoMaterials.forEach((m, i) => { if(i===3 && m.emissive) m.emissiveIntensity += ((isHov ? 3.0 : 0.0) - m.emissiveIntensity) * dt * 2; });
  if(logoLight) logoLight.intensity += ((isHov ? 1.2 : 0.3) - logoLight.intensity) * dt * 2;
  if(mountainMaterials.length > 0) mountainMaterials.forEach(m => { if(m.color) { if(isHov) m.color.lerp(new THREE.Color(0x4da6ff), 0.05); else m.color.lerp(new THREE.Color(0xffffff), 0.05); } });
  if(bloomPass) bloomPass.strength += ((isHov ? 0.5 : 0.2) - bloomPass.strength) * dt * 2;
}

// ============ ANIMATION SYSTEM ============
window.playPath = function(id) {
  if(animState !== 'IDLE') return;
  const target = paths[id];
  if(!target) return;

  // UI
  document.getElementById('button-group').classList.add('hidden');
  document.querySelectorAll('.glass-btn').forEach((b, i) => b.classList.toggle('active', i+1 === id));

  // 1. Setup Alignment Phase
  startPos.copy(camera.position);
  camera.getWorldQuaternion(startQuat);
  
  // Calculate direction to end point
  endPos.set(target.x, target.y, target.z);
  const dir = new THREE.Vector3().subVectors(endPos, startPos).normalize();
  
  // Create a LookTarget slightly in front of camera in the direction of travel
  const lookTarget = startPos.clone().add(dir);
  const dummy = new THREE.Object3D();
  dummy.position.copy(startPos);
  dummy.lookAt(lookTarget);
  targetQuat.setFromRotationMatrix(dummy.matrixWorld);

  animState = 'ALIGNING';
  animProgress = 0;
  animDuration = 0.8; // 0.8 seconds to turn in place
}

window.resetCamera = function() {
  if(animState !== 'IDLE') return;
  document.getElementById('backBtn').classList.remove('show');
  
  startPos.copy(camera.position);
  camera.getWorldQuaternion(startQuat);
  endPos.set(startPosition.x, startPosition.y, startPosition.z);

  // Calculate exact end rotation
  const h = startPosition.lookHorizontal; const v = startPosition.lookVertical;
  const dir = new THREE.Vector3(Math.sin(h) * Math.cos(v), Math.sin(v), Math.cos(h) * Math.cos(v));
  const dummy = new THREE.Object3D();
  dummy.position.copy(endPos);
  dummy.lookAt(dummy.position.clone().add(dir));
  endQuat.setFromRotationMatrix(dummy.matrixWorld);

  // Skip aligning for return, just move
  animState = 'MOVING';
  animProgress = 0;
  animDuration = 12.0;
}

function updateAnimation(dt) {
  if(animState === 'IDLE') return;

  animProgress += dt / animDuration;

  if(animState === 'ALIGNING') {
    // Smoothly rotate to face movement direction
    if(animProgress >= 1.0) {
      camera.quaternion.copy(targetQuat);
      animState = 'MOVING';
      animProgress = 0;
      animDuration = 10.0; // 10 seconds to move
      
      // Setup Movement Phase
      camera.getWorldQuaternion(startQuat); // Start rot is current rot
      
      // Target Rotation: Look at Logo from End Position
      const dummy = new THREE.Object3D();
      dummy.position.copy(endPos);
      dummy.lookAt(logo ? logo.position : new THREE.Vector3(0,0,0));
      endQuat.setFromRotationMatrix(dummy.matrixWorld);
    } else {
      const e = easeInOutCubic(animProgress);
      camera.quaternion.slerpQuaternions(startQuat, targetQuat, e);
    }
  } 
  else if(animState === 'MOVING') {
    if(animProgress >= 1.0) {
      animProgress = 1.0;
      animState = 'IDLE';
      camera.position.copy(endPos);
      
      const dist = camera.position.distanceTo(new THREE.Vector3(startPosition.x, startPosition.y, startPosition.z));
      if(dist < 0.5) document.getElementById('button-group').classList.remove('hidden');
      else document.getElementById('backBtn').classList.add('show');
      
      document.querySelectorAll('.glass-btn').forEach(b => b.classList.remove('active'));
    } else {
      const e = easeInOutCubic(animProgress);
      camera.position.lerpVectors(startPos, endPos, e);
      camera.quaternion.slerpQuaternions(startQuat, endQuat, e);
    }
  }
}

function easeInOutCubic(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

// ============ EVENTS & LOOP ============
function setupEventListeners() {
  document.addEventListener('mousemove', e => { mouse.x = (e.clientX / window.innerWidth) * 2 - 1; mouse.y = -(e.clientY / window.innerHeight) * 2 + 1; checkLogoHover(); });
  window.addEventListener('resize', () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); composer.setSize(window.innerWidth, window.innerHeight); });
  document.addEventListener('keydown', e => { if(e.key.toLowerCase() === 'r') resetCamera(); });
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.1);
  const t = clock.getElapsedTime();
  
  if(logo) logo.position.y = defaultSettings.logo.y + Math.sin(t * 0.8) * 0.05;
  
  updateAnimation(dt);
  updateHoverEffects(dt);
  updatePlexus(dt);
  composer.render();
}

init();
