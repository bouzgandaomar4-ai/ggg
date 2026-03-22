import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// ============ GLOBALS ============
let scene, camera, renderer, composer;
let mountains = null, logo = null;
let mountainMaterials = [];
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

// ============ SETTINGS ============
const settings = {
  mountains: { 
    pos: new THREE.Vector3(-7.9, 0, 3.5),
    scale: 20,
    rotY: 0
  },
  logo: { 
    pos: new THREE.Vector3(-0.6, 2.0, 8.2), 
    scale: 0.8
  },
  camera: {
    // EXACT Home Position provided
    start: { 
      pos: new THREE.Vector3(-0.51, 2.14, 10.47)
    },
    paths: {
      1: { pos: new THREE.Vector3(-2.77, 2.64, 1.57), lookAt: new THREE.Vector3(-7.9, 0, 3.5) },
      2: { pos: new THREE.Vector3(-0.66, 2.14, 10.35), lookAt: new THREE.Vector3(-0.6, 2.0, 8.2) },
      3: { pos: new THREE.Vector3(-5.87, 2.14, 13.47), lookAt: new THREE.Vector3(-7.9, 0, 3.5) },
      4: { pos: new THREE.Vector3(-0.61, 5.15, -7.06), lookAt: new THREE.Vector3(-0.6, 2.0, 8.2) }
    }
  }
};

// CALCULATE START LOOK TARGET
// Horizontal: 179.4° (Almost behind, looking at logo)
// Vertical: -5.3° (Looking slightly down)
const hRad = 179.4 * (Math.PI / 180);
const vRad = -5.3 * (Math.PI / 180);

// Calculate Direction Vector
const dir = new THREE.Vector3(
  Math.sin(hRad) * Math.cos(vRad),
  Math.sin(vRad),
  Math.cos(hRad) * Math.cos(vRad)
);

// Target = Position + Direction
settings.camera.start.lookAt = new THREE.Vector3().addVectors(settings.camera.start.pos, dir);


// ============ INIT ============
async function init() {
  setupScene();
  setupCamera();
  setupLights();
  
  try {
    await loadModels();
  } catch (e) {
    console.error(e);
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
  scene.fog = new THREE.FogExp2(0xffffff, 0.008);
}

function setupCamera() {
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  
  // Apply exact start position
  camera.position.copy(settings.camera.start.pos);
  
  // Apply calculated look direction
  camera.lookAt(settings.camera.start.lookAt);
}

function setupLights() {
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(5, 10, 5);
  scene.add(dirLight);
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
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.3, 0.4, 0.85);
  composer.addPass(bloomPass);
}

async function loadModels() {
  const loader = new GLTFLoader();
  
  try {
    const gltf = await loader.loadAsync('mountains.glb');
    mountains = gltf.scene;
    mountains.position.copy(settings.mountains.pos);
    mountains.scale.setScalar(settings.mountains.scale);
    mountains.rotation.y = settings.mountains.rotY; 
    mountains.traverse((child) => {
      if (child.isMesh) {
        child.material = child.material.clone();
        mountainMaterials.push(child.material);
      }
    });
    scene.add(mountains);
  } catch(e) { console.warn("Mountain model error", e); }

  try {
    const gltf = await loader.loadAsync('white_mesh.glb');
    logo = gltf.scene;
    logo.position.copy(settings.logo.pos);
    logo.scale.setScalar(settings.logo.scale);
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
        positions[idx++] = p.position.x; positions[idx++] = p.position.y; positions[idx++] = p.position.z;
        positions[idx++] = p2.position.x; positions[idx++] = p2.position.y; positions[idx++] = p2.position.z;
      }
    });
  });
  plexusLines.geometry.setDrawRange(0, idx / 3);
  plexusLines.geometry.attributes.position.needsUpdate = true;
}

// ============ ANIMATION SYSTEM ============
window.playPath = function(id) {
  if(isAnimating || !settings.camera.paths[id]) return;
  
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
  
  // UI Updates
  document.getElementById('backBtn').classList.remove('show');
  document.getElementById('button-group').classList.add('hidden');
}

// FIXED: Logic to return to specific home coordinates
window.resetCamera = function() {
  if(isAnimating) return;
  
  isAnimating = true;
  animStartTime = clock.getElapsedTime();
  animDuration = 12.0;
  
  animStartPos.copy(camera.position);
  // Return to Calculated Start Position
  animEndPos.copy(settings.camera.start.pos);
  
  camera.getWorldQuaternion(animStartQuat);
  
  // Calculate Return Rotation using the SAME MATH as init
  const dummyCam = new THREE.Object3D();
  dummyCam.position.copy(animEndPos);
  dummyCam.lookAt(settings.camera.start.lookAt);
  animEndQuat.setFromRotationMatrix(dummyCam.matrixWorld);
  
  document.getElementById('backBtn').classList.remove('show');
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
    
    // Check distance to the Home Position
    const distToStart = camera.position.distanceTo(settings.camera.start.pos);
    
    // If we are close to home (arrived)
    if(distToStart < 0.5) {
       document.getElementById('button-group').classList.remove('hidden');
    } else {
       // If we are at an endpoint
       document.getElementById('backBtn').classList.add('show');
    }
  }
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// ============ INTERACTIONS ============
function updateInteractions() {
  raycaster.setFromCamera(mouse, camera);
  
  if(logo) {
    const intersects = raycaster.intersectObject(logo, true);
    isHovering = intersects.length > 0;
    document.body.style.cursor = isHovering ? 'pointer' : 'default';
  }

  const targetColor = new THREE.Color(0xaaddff);
  const whiteColor = new THREE.Color(0xffffff);

  mountainMaterials.forEach(mat => {
    if (isHovering) mat.color.lerp(targetColor, 0.05);
    else mat.color.lerp(whiteColor, 0.05);
  });
  
  if(logo) {
    logo.traverse((child) => {
        if (child.isMesh && child.material) {
            if (isHovering) {
                child.material.color.lerp(targetColor, 0.05);
                child.material.emissive = child.material.emissive || new THREE.Color(0x000000);
                child.material.emissive.lerp(new THREE.Color(0x00eaff), 0.05);
            } else {
                child.material.color.lerp(whiteColor, 0.05);
                 if (child.material.emissive) child.material.emissive.lerp(new THREE.Color(0x000000), 0.05);
            }
        }
    });
  }
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
  
  if(logo) {
    logo.position.y = settings.logo.pos.y + Math.sin(clock.getElapsedTime() * 0.5) * 0.05;
  }
  
  updatePlexus();
  updateAnimation();
  updateInteractions();
  
  composer.render();
}

init();
