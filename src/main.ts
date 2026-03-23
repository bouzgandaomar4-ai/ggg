import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// Constants
const HOME = {
  x: -0.51, y: 2.14, z: 10.47,
  h: 179.4 * (Math.PI / 180),
  v: -5.3 * (Math.PI / 180)
};

const PATHS = {
  1: { start: { ...HOME }, end: { x: -2.77, y: 2.64, z: 1.57, h: HOME.h, v: HOME.v } },
  2: { start: { ...HOME }, end: { x: -0.66, y: 2.14, z: 10.35, h: HOME.h, v: HOME.v } },
  3: { start: { ...HOME }, end: { x: -5.87, y: 2.14, z: 13.47, h: HOME.h, v: HOME.v } },
  4: { start: { ...HOME }, end: { x: -0.61, y: 5.15, z: -7.06, h: HOME.h, v: HOME.v } }
};

// Variables
let scene, camera, renderer, composer;
let mountains = null;
let logo = null;
let isAnimating = false;
let plexusGroup;
let plexusPoints = [];
let plexusLines = null;

// Easing function
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Set camera
function setCamera(x, y, z, h, v) {
  camera.position.set(x, y, z);
  const dir = new THREE.Vector3();
  dir.x = Math.sin(h) * Math.cos(v);
  dir.y = Math.sin(v);
  dir.z = Math.cos(h) * Math.cos(v);
  camera.lookAt(x + dir.x, y + dir.y, z + dir.z);
}

// Initialize
function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);
  scene.fog = new THREE.FogExp2(0xffffff, 0.01);

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  setCamera(HOME.x, HOME.y, HOME.z, HOME.h, HOME.v);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.5;
  renderer.shadowMap.enabled = true;
  document.getElementById('canvas-container').appendChild(renderer.domElement);

  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.2, 0.4, 0.1);
  composer.addPass(bloomPass);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambientLight);
  const mainLight = new THREE.DirectionalLight(0xffffff, 0.6);
  mainLight.position.set(5, 10, 5);
  mainLight.castShadow = true;
  scene.add(mainLight);
  const rimLight = new THREE.DirectionalLight(0x88ccff, 0.3);
  rimLight.position.set(-5, 2, -5);
  scene.add(rimLight);
  const logoLight = new THREE.PointLight(0x4da6ff, 0.3, 20);
  logoLight.position.set(-0.6, 2, 8.2);
  scene.add(logoLight);

  loadModels();
  setupPlexus();
  setupUI();
  setupEvents();

  setTimeout(() => {
    const loader = document.getElementById('loader');
    loader?.classList.add('opacity-0');
    setTimeout(() => {
      loader?.remove();
      const welcome = document.getElementById('welcome-overlay');
      setTimeout(() => {
        welcome?.classList.add('opacity-0');
        setTimeout(() => welcome?.remove(), 1500);
      }, 3000);
    }, 1000);
  }, 500);

  animate();
}

async function loadModels() {
  const loader = new GLTFLoader();
  
  try {
    const gltf = await new Promise((resolve) => {
      loader.load('/models/mountains.glb', (gltf) => resolve(gltf.scene));
    });
    mountains = gltf;
    mountains.position.set(-7.9, 4.9, 3.5);
    mountains.scale.set(24, 57, 30);
    mountains.rotation.set(0, 133 * Math.PI / 180, 0);
    scene.add(mountains);
  } catch (e) {
    console.log('Mountains model not found');
  }

  try {
    const gltf = await new Promise((resolve) => {
      loader.load('/models/white_mesh.glb', (gltf) => resolve(gltf.scene));
    });
    logo = gltf;
    logo.position.set(-0.6, 2.0, 8.2);
    logo.scale.set(0.8, 0.8, 0.72);
    logo.rotation.set(0, 0, 2 * Math.PI / 180);
    logo.castShadow = true;
    scene.add(logo);
  } catch (e) {
    console.log('Logo model not found');
  }
}

function setupPlexus() {
  plexusGroup = new THREE.Group();
  scene.add(plexusGroup);
  
  for (let i = 0; i < 15; i++) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 32;
    canvas.height = 32;
    ctx.fillStyle = 'rgba(0, 212, 255, 0.95)';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((Math.floor(Math.random() * 9) + 1).toString(), 16, 16);
    
    const texture = new THREE.CanvasTexture(canvas);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0, color: 0x00d4ff }));
    sprite.scale.set(0.05, 0.05, 1);
    sprite.userData = {
      targetPos: new THREE.Vector3(
        -7.9 + Math.cos(Math.random() * Math.PI * 2) * 8 * (0.5 + Math.random() * 0.5),
        4.9 + (Math.random() - 0.5) * 15,
        3.5 + Math.sin(Math.random() * Math.PI * 2) * 8 * (0.5 + Math.random() * 0.5)
      )
    };
    plexusGroup.add(sprite);
    plexusPoints.push(sprite);
  }
  
  const lineGeometry = new THREE.BufferGeometry();
  const positions = new Float32Array(15 * 15 * 6);
  lineGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0 });
  plexusLines = new THREE.LineSegments(lineGeometry, lineMaterial);
  plexusGroup.add(plexusLines);
}

function updatePlexus() {
  plexusPoints.forEach(sprite => {
    sprite.position.lerp(sprite.userData.targetPos, 0.03);
    sprite.material.opacity += (0.3 - sprite.material.opacity) * 0.03;
  });
  
  if (plexusLines && plexusPoints.length > 1) {
    const positions = plexusLines.geometry.attributes.position.array;
    let index = 0;
    for (let i = 0; i < plexusPoints.length; i++) {
      for (let j = i + 1; j < plexusPoints.length; j++) {
        const p1 = plexusPoints[i].position;
        const p2 = plexusPoints[j].position;
        if (p1.distanceTo(p2) < 10) {
          positions[index++] = p1.x; positions[index++] = p1.y; positions[index++] = p1.z;
          positions[index++] = p2.x; positions[index++] = p2.y; positions[index++] = p2.z;
        }
      }
    }
    plexusLines.geometry.attributes.position.needsUpdate = true;
    plexusLines.material.opacity += (0.1 - plexusLines.material.opacity) * 0.03;
  }
}

function setupUI() {
  const container = document.getElementById('path-buttons');
  const positions = [
    { top: '15%', left: '-120px' },
    { top: '65%', left: '-100px' },
    { top: '15%', right: '-100px' },
    { top: '65%', right: '-120px' }
  ];
  
  for (let i = 1; i <= 4; i++) {
    const node = document.createElement('div');
    node.className = 'absolute pointer-events-auto';
    node.style.top = positions[i-1].top || '';
    if (positions[i-1].left) node.style.left = positions[i-1].left;
    if (positions[i-1].right) node.style.right = positions[i-1].right;
    
    node.innerHTML = `
      <svg class="absolute" style="width:150px;height:120px;top:-50px;left:-50px;pointer-events:none;opacity:0.7">
        <line class="path-line" x1="130" y1="70" x2="50" y2="40"/>
        <circle class="path-dot" cx="50" cy="40" r="4"/>
      </svg>
      <button id="path-btn-${i}" class="glass-btn">Path ${i}</button>
    `;
    
    container.appendChild(node);
  }
}

function setupEvents() {
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
  });

  document.getElementById('back-btn')?.addEventListener('click', () => resetToHome());
  
  for (let i = 1; i <= 4; i++) {
    document.getElementById(`path-btn-${i}`)?.addEventListener('click', () => travelTo(i));
  }

  document.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'r') resetToHome();
  });
}

function travelTo(pathNumber) {
  if (isAnimating) return;
  
  const path = PATHS[pathNumber];
  isAnimating = true;
  
  const buttons = document.getElementById('path-buttons');
  buttons.style.opacity = '0';
  buttons.style.pointerEvents = 'none';
  
  const backBtn = document.getElementById('back-btn');
  backBtn.classList.remove('opacity-100', 'pointer-events-auto');
  backBtn.classList.add('opacity-0', 'pointer-events-none');
  
  const startX = camera.position.x;
  const startY = camera.position.y;
  const startZ = camera.position.z;
  const startTime = performance.now();
  
  function animate() {
    if (!isAnimating) return;
    
    const elapsed = performance.now() - startTime;
    const progress = Math.min(elapsed / 10000, 1);
    const eased = easeInOutCubic(progress);
    
    camera.position.x = path.start.x + (path.end.x - path.start.x) * eased;
    camera.position.y = path.start.y + (path.end.y - path.start.y) * eased;
    camera.position.z = path.start.z + (path.end.z - path.start.z) * eased;
    
    const h = path.start.h + (path.end.h - path.start.h) * eased;
    const v = path.start.v + (path.end.v - path.start.v) * eased;
    setCamera(camera.position.x, camera.position.y, camera.position.z, h, v);
    
    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      isAnimating = false;
      setTimeout(() => {
        backBtn.classList.remove('opacity-0', 'pointer-events-none');
        backBtn.classList.add('opacity-100', 'pointer-events-auto');
      }, 500);
    }
  }
  
  animate();
}

function resetToHome() {
  if (isAnimating) return;
  
  isAnimating = true;
  
  const backBtn = document.getElementById('back-btn');
  backBtn.classList.remove('opacity-100', 'pointer-events-auto');
  backBtn.classList.add('opacity-0', 'pointer-events-none');
  
  const startX = camera.position.x;
  const startY = camera.position.y;
  const startZ = camera.position.z;
  const startTime = performance.now();
  
  function animate() {
    if (!isAnimating) return;
    
    const elapsed = performance.now() - startTime;
    const progress = Math.min(elapsed / 12000, 1);
    const eased = easeInOutCubic(progress);
    
    camera.position.x = startX + (HOME.x - startX) * eased;
    camera.position.y = startY + (HOME.y - startY) * eased;
    camera.position.z = startZ + (HOME.z - startZ) * eased;
    
    const h = HOME.h * eased;
    const v = HOME.v * eased;
    setCamera(camera.position.x, camera.position.y, camera.position.z, h, v);
    
    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      isAnimating = false;
      const buttons = document.getElementById('path-buttons');
      buttons.style.opacity = '1';
      buttons.style.pointerEvents = 'auto';
    }
  }
  
  animate();
}

function animate() {
  requestAnimationFrame(animate);
  
  if (logo) {
    logo.position.y = 2.0 + Math.sin(Date.now() * 0.0008) * 0.05;
  }
  
  updatePlexus();
  composer.render();
}

init();
