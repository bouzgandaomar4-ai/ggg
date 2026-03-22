import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// ============ GLOBALS ============
let scene, camera, renderer, composer;
let mountains = null, logo = null;
let mountainMaterials = []; // To store materials for hover effect
let plexusGroup, plexusPoints = [], plexusLines;
let clock = new THREE.Clock();

// Animation State
let isAnimating = false;
let animStartTime = 0;
let animDuration = 0;
let animStartPos = new THREE.Vector3();
let animEndPos = new THREE.Vector3();
let animStartQuat = new THREE.Quaternion();
let animEndQuat = new THREE.Quaternion();

// Hover State
let isHovering = false;
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();

// Settings
const settings = {
  mountains: { 
    pos: new THREE.Vector3(-7.9, 0, 3.5), // Lowered Y so it sits on ground
    scale: 20,                           // Adjusted scale
    rotY: 0                              // Reset rotation to fix "inverted" issue
  },
  logo: { 
    pos: new THREE.Vector3(-0.6, 2.0, 8.2), 
    scale: 0.8, 
    rot: new THREE.Euler(0, 0, 2 * Math.PI / 180) 
  },
  camera: {
    start: { pos: new THREE.Vector3(-0.51, 2.14, 10.47), lookAt: new THREE.Vector3(-0.6, 2.0, 8.2) },
    paths: {
      1: { pos: new THREE.Vector3(-2.77, 2.64, 1.57), lookAt: new THREE.Vector3(-7.9, 0, 3.5) },
      2: { pos: new THREE.Vector3(-0.66, 2.14, 10.35), lookAt: new THREE.Vector3(-0.6, 2.0, 8.2) },
      3: { pos: new THREE.Vector3(-5.87, 2.14, 13.47), lookAt: new THREE.Vector3(-7.9, 0, 3.5) },
      4: { pos: new THREE.Vector3(-0.61, 5.15, -7.06), lookAt: new THREE.Vector3(-0.6, 2.0, 8.2) }
    }
  }
};

// ============ INIT ============
async function init() {
  setupScene();
  setupCamera();
  setupLights();
  
  try {
    await loadModels();
  } catch (e) {
    console.error("Model loading failed", e);
    createFallbackScene();
  }
  
  setupPlexus();
  setupRenderer();
  setupPostProcessing();
  setupEvents();
  
  document.getElementById('loader').classList.add('hidden');
  
  setTimeout(() => {
    const welcome = document.getElementById('welcome-overlay');
    if(welcome) welcome.classList.add('hidden');
  }, 4500);
  
  animate();
}

function createFallbackScene() {
  const geo = new THREE.BoxGeometry(2, 2, 2);
  const mat = new THREE.MeshStandardMaterial({ color: 0x00eaff });
  logo = new THREE.Mesh(geo, mat);
  logo.position.copy(settings.logo.pos);
  scene.add(logo);
}

function setupScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);
  scene.fog = new THREE.FogExp2(0xffffff, 0.008); // Reduced fog density
}

function setupCamera() {
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.copy(settings.camera.start.pos);
  camera.lookAt(settings.camera.start.lookAt);
}

function setupLights() {
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(5, 10, 5);
  scene.add(dirLight);
}

function setupRenderer() {
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.8;
  document.getElementById('canvas-container').appendChild(renderer.domElement);
}

function setupPostProcessing() {
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.3, 0.4, 0.85);
  composer.addPass(bloomPass);
}

async function loadModels() {
  const loader = new GLTFLoader();
  
  // Load Mountains
  try {
    const gltf = await loader.loadAsync('mountains.glb');
    mountains = gltf.scene;
    
    // --- FIX: Apply settings to fix position and inversion ---
    mountains.position.copy(settings.mountains.pos);
    mountains.scale.setScalar(settings.mountains.scale);
    mountains.rotation.y = settings.mountains.rotY; 
    
    // Store materials for hover effect
    mountains.traverse((child) => {
      if (child.isMesh) {
        child.material = child.material.clone(); // Clone to avoid affecting other meshes
        mountainMaterials.push(child.material);
      }
    });
    
    scene.add(mountains);
  } catch(e) { console.warn("Mountain model error", e); }

  // Load Logo
  try {
    const gltf = await loader.loadAsync('white_mesh.glb');
    logo = gltf.scene;
    logo.position.copy(settings.logo.pos);
    logo.scale.setScalar(settings.logo.scale);
    logo.rotation.copy(settings.logo.rot);
    scene.add(logo);
  } catch(e) { console.warn("Logo model error", e); }
}

// ============ PLEXUS ============
function setupPlexus() {
  plexusGroup = new THREE.Group();
  scene.add(plexusGroup);
  
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(500 * 3); 
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  
  const mat = new THREE.LineBasicMaterial({ color: 0x00eaff, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending });
  plexusLines = new THREE.LineSegments(geo, mat);
  plexusGroup.add(plexusLines);
  
  for(let i=0; i<20; i++) {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x00eaff, transparent: true, opacity: 0.6 }));
    sprite.scale.set(0.1, 0.1, 1);
    sprite.position.set(
      settings.logo.pos.x + (Math.random() - 0.5) * 10,
      settings.logo.pos.y + (Math.random() - 0.5) * 5,
      settings.logo.pos.z + (Math.random() - 0.5) * 10
    );
    sprite.userData.velocity = new THREE.Vector3((Math.random()-0.5)*0.02, (Math.random()-0.5)*0.02, (Math.random()-0.5)*0.02);
    plexusGroup.add(sprite);
    plexusPoints.push(sprite);
  }
}

function updatePlexus() {
  let idx = 0;
  const positions = plexusLines.geometry.attributes.position.array;
  
  plexusPoints.forEach(p => {
    p.position.add(p.userData.velocity);
    if(p.position.distanceTo(settings.logo.pos) > 8) p.userData.velocity.multiplyScalar(-1);
    
    plexusPoints.forEach(p2 => {
      if(p === p2) return;
      const dist = p.position.distanceTo(p2.position);
      if(dist < 3.0) {
        positions[idx++] = p.position.x;
        positions[idx++] = p.position.y;
        positions[idx++] = p.position.z;
        positions[idx++] = p2.position.x;
        positions[idx++] = p2.position.y;
        positions[idx++] = p2.position.z;
      }
    });
  });
  
  plexusLines.geometry.setDrawRange(0, idx / 3);
  plexusLines.geometry.attributes.position.needsUpdate = true;
  plexusLines.material.opacity = isHovering ? 0.6 : 0.2;
}

// ============ ANIMATION SYSTEM ============
window.playPath = function(id) {
  if(isAnimating || !settings.camera.paths[id]) return;
  
  document.querySelectorAll('.glass-btn').forEach(b => b.classList.remove('active'));
  const btn = document.querySelector(`.btn-path${id} .glass-btn`);
  if(btn) btn.classList.add('active');
  
  isAnimating = true;
  animStartTime = clock.getElapsedTime();
  animDuration = 10.0;
  
  animStartPos.copy(camera.position);
  animEndPos.copy(settings.camera.paths[id].pos);
  
  camera.getWorldQuaternion(animStartQuat);
  
  const dummyCam = new THREE.Object3D();
  dummyCam.position.copy(animEndPos);
  dummyCam.lookAt(settings.camera.paths[id].lookAt);
  animEndQuat.setFromRotationMatrix(dummyCam.matrixWorld);
  
  document.getElementById('backBtn').classList.remove('show');
}

window.resetCamera = function() {
  if(isAnimating) return;
  
  document.getElementById('backBtn').classList.remove('show');
  document.querySelectorAll('.glass-btn').forEach(b => b.classList.remove('active'));
  
  isAnimating = true;
  animStartTime = clock.getElapsedTime();
  animDuration = 12.0;
  
  animStartPos.copy(camera.position);
  animEndPos.copy(settings.camera.start.pos);
  
  camera.getWorldQuaternion(animStartQuat);
  
  const dummyCam = new THREE.Object3D();
  dummyCam.position.copy(animEndPos);
  dummyCam.lookAt(settings.camera.start.lookAt);
  animEndQuat.setFromRotationMatrix(dummyCam.matrixWorld);
}

function updateAnimation() {
  if(!isAnimating) return;
  
  let elapsed = clock.getElapsedTime() - animStartTime;
  let t = Math.min(elapsed / animDuration, 1.0);
  
  const eased = easeInOutCubic(t);
  
  camera.position.lerpVectors(animStartPos, animEndPos, eased);
  camera.quaternion.slerpQuaternions(animStartQuat, animEndQuat, eased);
  
  if(t >= 1.0) {
    isAnimating = false;
    // Show back button only if we are not at the start position
    if(settings.camera.start.pos.distanceTo(animEndPos) > 0.1) {
       document.getElementById('backBtn').classList.add('show');
    }
  }
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// ============ HOVER EFFECTS ============
function updateHoverEffects() {
  // 1. Check raycast
  raycaster.setFromCamera(mouse, camera);
  const intersects = logo ? raycaster.intersectObject(logo, true) : [];
  isHovering = intersects.length > 0;
  document.body.style.cursor = isHovering ? 'pointer' : 'default';

  // 2. Update Mountain Colors (Turn blue on hover)
  mountainMaterials.forEach(mat => {
    if (isHovering) {
      // Target Blue
      mat.color.lerp(new THREE.Color(0x4da6ff), 0.1);
    } else {
      // Target White
      mat.color.lerp(new THREE.Color(0xffffff), 0.05);
    }
  });
}

// ============ EVENTS ============
function setupEvents() {
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
  });
  
  window.addEventListener('mousemove', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  });
  
  window.addEventListener('keydown', (e) => {
    if(e.key.toLowerCase() === 'r') resetCamera();
  });
}

// ============ LOOP ============
function animate() {
  requestAnimationFrame(animate);
  
  // Logo Floating Animation
  if(logo) {
    logo.position.y = settings.logo.pos.y + Math.sin(clock.getElapsedTime() * 0.5) * 0.05;
  }
  
  updatePlexus();
  updateAnimation();
  updateHoverEffects(); // Added hover update here
  
  composer.render();
}

init();
