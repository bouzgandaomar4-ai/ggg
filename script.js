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

// Camera animation
let isAnimating = false;
let animationComplete = false;
let currentPathIndex = 0;

// Starting position
const startPosition = {
  x: -0.51,
  y: 2.14,
  z: 10.47,
  lookHorizontal: 179.4 * (Math.PI / 180),
  lookVertical: -5.3 * (Math.PI / 180)
};

// Paths - FIXED ENDPOINTS
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
  plexus: {
    count: 15,
    radius: 8,
    size: 0.05,
    lineOpacity: 0.4,
    changeSpeed: 200
  }
};

// ============ WELCOME ANIMATION ============
function showWelcomeAnimation() {
  const welcomeOverlay = document.getElementById('welcome-overlay');
  
  setTimeout(() => {
    welcomeOverlay.classList.add('hidden');
  }, 3000);
}

// ============ MAIN INIT ============
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
      const loader = document.getElementById('loader');
      if (loader) loader.classList.add('hidden');
      showWelcomeAnimation();
    }, 500);
    
    animate();
  } catch (error) {
    console.error('Error:', error);
  }
}

function updateLoadingStatus(text) {
  const status = document.getElementById('loading-status');
  if (status) status.textContent = text;
}

function setupScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);
}

function setupCamera() {
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  resetCameraToStart();
}

function resetCameraToStart() {
  camera.position.set(startPosition.x, startPosition.y, startPosition.z);
  
  const h = startPosition.lookHorizontal;
  const v = startPosition.lookVertical;
  
  const direction = new THREE.Vector3();
  direction.x = Math.sin(h) * Math.cos(v);
  direction.y = Math.sin(v);
  direction.z = Math.cos(h) * Math.cos(v);
  
  const target = new THREE.Vector3().copy(camera.position).add(direction);
  camera.lookAt(target);
  
  const backBtn = document.getElementById('backBtn');
  if (backBtn) {
    backBtn.classList.remove('show');
  }
}

function setupRenderer() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.5;
  renderer.shadowMap.enabled = true;
  document.getElementById('canvas-container').appendChild(renderer.domElement);
}

function setupPostProcessing() {
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.2, 0.4, 0.1);
  composer.addPass(bloomPass);
}

function setupLights() {
  ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambientLight);
  
  mainLight = new THREE.DirectionalLight(0xffffff, 0.6);
  mainLight.position.set(5, 10, 5);
  mainLight.castShadow = true;
  scene.add(mainLight);
  
  rimLight = new THREE.DirectionalLight(0x88ccff, 0.3);
  rimLight.position.set(-5, 2, -5);
  scene.add(rimLight);
  
  logoLight = new THREE.PointLight(0x4da6ff, 0.3, 20);
  logoLight.position.set(-0.6, 2, 8.2);
  scene.add(logoLight);
}

function setupFog() {
  scene.fog = new THREE.FogExp2(0xffffff, 0.01);
}

async function loadMountains() {
  const loader = new GLTFLoader();
  const paths = ['mountains.glb', './mountains.glb'];
  
  for (const path of paths) {
    try {
      const gltf = await new Promise((resolve, reject) => {
        loader.load(path, resolve, undefined, reject);
      });
      
      mountains = gltf.scene;
      mountainMaterials = [];
      
      mountains.traverse((child) => {
        if (child.isMesh && child.material) {
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach(mat => {
            const cloned = mat.clone();
            if (cloned.color) cloned.color.multiplyScalar(0.7);
            mountainMaterials.push(cloned);
          });
        }
      });
      
      const s = defaultSettings.mountains;
      mountains.position.set(s.x, s.y, s.z);
      mountains.scale.set(s.uniformScale * s.scaleX, s.uniformScale * s.scaleY, s.uniformScale * s.scaleZ);
      mountains.rotation.set(s.rotX * Math.PI / 180, s.rotY * Math.PI / 180, s.rotZ * Math.PI / 180);
      
      scene.add(mountains);
      console.log('✅ Mountains loaded');
      return;
    } catch (error) {}
  }
}

async function loadLogo() {
  const loader = new GLTFLoader();
  const paths = ['white_mesh.glb', './white_mesh.glb'];
  
  for (const path of paths) {
    try {
      const gltf = await new Promise((resolve, reject) => {
        loader.load(path, resolve, undefined, reject);
      });
      
      logo = gltf.scene;
      logoMaterials = [];
      
      logo.traverse((child) => {
        if (child.isMesh && child.material) {
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach(mat => logoMaterials.push(mat.clone()));
        }
      });
      
      updateLogoTransform();
      updateLogoColors();
      logo.castShadow = true;
      scene.add(logo);
      console.log('✅ Logo loaded with', logoMaterials.length, 'materials');
      return;
    } catch (error) {}
  }
}

function updateLogoTransform() {
  if (!logo) return;
  const s = defaultSettings.logo;
  logo.position.set(s.x, s.y, s.z);
  logo.scale.set(s.uniformScale * s.scaleX, s.uniformScale * s.scaleY, s.uniformScale * s.scaleZ);
  logo.rotation.set(s.rotX * Math.PI / 180, s.rotY * Math.PI / 180, s.rotZ * Math.PI / 180);
}

function updateLogoColors() {
  if (!logoMaterials.length) return;
  const s = defaultSettings.logo;
  
  logoMaterials.forEach((mat, i) => {
    if (!mat) return;
    if (i === 0) mat.color.setHex(s.baseColor);
    else if (i === 1) mat.color.setHex(s.highlightColor);
    else if (i === 2) mat.color.setHex(s.shadowColor);
    else if (i === 3) {
      mat.color.setHex(s.glowColor);
      if (!mat.emissive) mat.emissive = new THREE.Color();
      mat.emissive.setHex(s.glowColor);
      mat.emissiveIntensity = s.glowIntensity;
    }
    else if (i === 4) mat.color.setHex(s.rivetColor);
    else if (i === 5) mat.color.setHex(s.keyholeColor);
    else mat.color.setHex(s.baseColor);
    
    mat.metalness = s.metalness;
    mat.roughness = s.roughness;
    mat.clearcoat = s.clearCoat;
    mat.clearcoatRoughness = 0.05;
    mat.needsUpdate = true;
  });
}

function setupPlexus() {
  if (!plexusGroup) {
    plexusGroup = new THREE.Group();
    scene.add(plexusGroup);
  }
  
  for (let i = 0; i < defaultSettings.plexus.count; i++) {
    createPlexusPoint();
  }
  
  const lineGeometry = new THREE.BufferGeometry();
  const maxLines = defaultSettings.plexus.count * defaultSettings.plexus.count * 6;
  const positions = new Float32Array(maxLines);
  lineGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0 });
  plexusLines = new THREE.LineSegments(lineGeometry, lineMaterial);
  plexusGroup.add(plexusLines);
  plexusGroup.visible = true;
}

function createPlexusPoint() {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 32;
  canvas.height = 32;
  
  const texture = new THREE.CanvasTexture(canvas);
  const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0, color: 0x00d4ff });
  
  const sprite = new THREE.Sprite(spriteMaterial);
  sprite.scale.set(defaultSettings.plexus.size, defaultSettings.plexus.size, 1);
  sprite.userData.number = Math.floor(Math.random() * 9) + 1;
  sprite.userData.currentOpacity = 0;
  sprite.userData.canvas = canvas;
  sprite.userData.ctx = ctx;
  
  updatePointNumber(sprite);
  randomizePlexusPosition(sprite);
  
  plexusGroup.add(sprite);
  plexusPoints.push(sprite);
}

function updatePointNumber(sprite) {
  const ctx = sprite.userData.ctx;
  const canvas = sprite.userData.canvas;
  ctx.clearRect(0, 0, 32, 32);
  ctx.fillStyle = 'rgba(0, 212, 255, 0.95)';
  ctx.font = 'bold 20px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(sprite.userData.number.toString(), 16, 16);
  sprite.material.map.needsUpdate = true;
}

function randomizePlexusPosition(sprite) {
  const angle = Math.random() * Math.PI * 2;
  const radius = defaultSettings.plexus.radius * (0.5 + Math.random() * 0.5);
  const height = (Math.random() - 0.5) * 15;
  
  sprite.userData.targetPos = new THREE.Vector3(
    -7.9 + Math.cos(angle) * radius,
    4.9 + height,
    3.5 + Math.sin(angle) * radius
  );
}

let lastPlexusChange = 0;
function updatePlexus(time, deltaTime) {
  const speed = 3.0;
  const targetOpacity = (isHoveringLogo || isHoveringButtons) ? 0.8 : 0.3;
  
  if (time - lastPlexusChange > defaultSettings.plexus.changeSpeed) {
    lastPlexusChange = time;
    plexusPoints.forEach(sprite => {
      sprite.userData.number = Math.floor(Math.random() * 9) + 1;
      updatePointNumber(sprite);
      randomizePlexusPosition(sprite);
    });
  }
  
  plexusPoints.forEach(sprite => {
    if (!sprite.position) sprite.position = new THREE.Vector3();
    if (!sprite.userData.targetPos) randomizePlexusPosition(sprite);
    
    sprite.position.lerp(sprite.userData.targetPos, deltaTime * speed);
    sprite.userData.currentOpacity += (targetOpacity - sprite.userData.currentOpacity) * deltaTime * speed;
    sprite.material.opacity = sprite.userData.currentOpacity;
  });
  
  if (plexusLines && plexusPoints.length > 1) {
    const positions = plexusLines.geometry.attributes.position.array;
    let index = 0;
    
    for (let i = 0; i < plexusPoints.length; i++) {
      for (let j = i + 1; j < plexusPoints.length; j++) {
        const p1 = plexusPoints[i].position;
        const p2 = plexusPoints[j].position;
        const distance = p1.distanceTo(p2);
        
        if (distance < 10) {
          positions[index++] = p1.x;
          positions[index++] = p1.y;
          positions[index++] = p1.z;
          positions[index++] = p2.x;
          positions[index++] = p2.y;
          positions[index++] = p2.z;
        }
      }
    }
    
    plexusLines.geometry.attributes.position.needsUpdate = true;
    
    const lineOpacity = (isHoveringLogo || isHoveringButtons) ? defaultSettings.plexus.lineOpacity : 0.1;
    plexusLines.material.opacity += (lineOpacity - plexusLines.material.opacity) * deltaTime * speed;
  }
}

// ============ HOVER EFFECTS ============
window.onHoverStart = function() {
  isHoveringButtons = true;
};

window.onHoverEnd = function() {
  isHoveringButtons = false;
};

// ============ SMOOTH CAMERA MOVEMENT ============
window.playPath = function(pathNumber) {
  if (isAnimating) return;
  
  const targetPos = paths[pathNumber];
  if (!targetPos) return;
  
  document.querySelectorAll('.glass-btn').forEach((btn, index) => {
    btn.classList.toggle('active', index + 1 === pathNumber);
  });
  
  isAnimating = true;
  animationComplete = false;
  
  const startPos = camera.position.clone();
  const endPos = new THREE.Vector3(targetPos.x, targetPos.y, targetPos.z);
  
  const startTime = performance.now();
  const duration = 10000; // 10 seconds smooth movement
  
  function animatePath() {
    if (!isAnimating) return;
    
    const elapsed = performance.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Smooth easing
    const easedProgress = easeInOutCubic(progress);
    
    camera.position.lerpVectors(startPos, endPos, easedProgress);
    camera.lookAt(logo.position);
    
    if (progress < 1) {
      requestAnimationFrame(animatePath);
    } else {
      isAnimating = false;
      animationComplete = true;
      setTimeout(() => {
        const backBtn = document.getElementById('backBtn');
        if (backBtn) {
          backBtn.classList.add('show');
        }
        document.querySelectorAll('.glass-btn').forEach(btn => btn.classList.remove('active'));
      }, 500);
    }
  }
  
  animatePath();
};

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// ============ SMOOTH RETURN TO START ============
window.resetCamera = function() {
  if (isAnimating) return;
  
  isAnimating = true;
  animationComplete = false;
  
  const backBtn = document.getElementById('backBtn');
  if (backBtn) {
    backBtn.classList.remove('show');
  }
  
  const startPos = camera.position.clone();
  const endPos = new THREE.Vector3(startPosition.x, startPosition.y, startPosition.z);
  
  const startTime = performance.now();
  const duration = 12000; // 12 seconds smooth return
  
  function animateReturn() {
    if (!isAnimating) return;
    
    const elapsed = performance.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    const easedProgress = easeInOutCubic(progress);
    
    camera.position.lerpVectors(startPos, endPos, easedProgress);
    
    // Maintain proper look direction during return
    const h = startPosition.lookHorizontal;
    const v = startPosition.lookVertical;
    const direction = new THREE.Vector3();
    direction.x = Math.sin(h) * Math.cos(v);
    direction.y = Math.sin(v);
    direction.z = Math.cos(h) * Math.cos(v);
    const target = new THREE.Vector3().copy(camera.position).add(direction);
    camera.lookAt(target);
    
    if (progress < 1) {
      requestAnimationFrame(animateReturn);
    } else {
      isAnimating = false;
      animationComplete = true;
      document.querySelectorAll('.glass-btn').forEach(btn => btn.classList.remove('active'));
    }
  }
  
  animateReturn();
};

function updateHoverEffects(deltaTime) {
  const speed = 2.0;
  const isHovering = isHoveringLogo || isHoveringButtons;
  
  if (logoMaterials.length > 0) {
    const targetIntensity = isHovering ? 3.0 : 0.0;
    logoMaterials.forEach((mat, i) => {
      if (i === 3 && mat.emissive) {
        mat.emissiveIntensity += (targetIntensity - mat.emissiveIntensity) * speed * deltaTime;
      }
    });
  }
  
  if (logoLight) {
    const target = isHovering ? 1.2 : 0.3;
    logoLight.intensity += (target - logoLight.intensity) * speed * deltaTime;
  }
  
  if (mountainMaterials.length > 0) {
    mountainMaterials.forEach(mat => {
      if (mat.color) {
        if (isHovering) {
          const current = mat.color.r;
          mat.color.setRGB(
            current + (0.45 - current) * speed * deltaTime * 0.3,
            current + (0.55 - current) * speed * deltaTime * 0.3,
            current + (0.65 - current) * speed * deltaTime * 0.3
          );
        } else {
          mat.color.multiplyScalar(0.995);
        }
        mat.needsUpdate = true;
      }
    });
  }
  
  if (bloomPass) {
    const target = isHovering ? 0.5 : 0.2;
    bloomPass.strength += (target - bloomPass.strength) * speed * deltaTime;
  }
}

function setupEventListeners() {
  document.addEventListener('mousemove', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    checkLogoHover();
  });
  
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
  });
  
  document.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'r') resetCamera();
  });
}

function checkLogoHover() {
  if (!logo) return;
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(logo, true);
  isHoveringLogo = intersects.length > 0;
  document.body.style.cursor = isHoveringLogo ? 'pointer' : 'default';
}

let lastTime = 0;
function animate(currentTime = 0) {
  requestAnimationFrame(animate);
  
  const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.1);
  lastTime = currentTime;
  
  if (logo) {
    logo.position.y = defaultSettings.logo.y + Math.sin(currentTime * 0.0008) * 0.05;
  }
  
  updateHoverEffects(deltaTime);
  updatePlexus(currentTime, deltaTime);
  
  composer.render();
}

init();
