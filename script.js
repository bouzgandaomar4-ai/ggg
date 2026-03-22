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
let ambientLight, mainLight, rimLight, logoLight;
let bloomPass;

// Plexus
let plexusGroup = null;
let plexusPoints = [];
let plexusLines = null;

// Camera animation
let isAnimating = false;
let currentAnimation = null;
let targetCameraPosition = null;
let targetLookAt = null;

// Starting position
const startPosition = {
  x: -0.51,
  y: 2.14,
  z: 10.47
};

const startLookAt = {
  x: -0.6,
  y: 2.0,
  z: 8.2
};

// Paths with both position AND lookAt targets
const paths = {
  1: { 
    position: { x: -2.77, y: 2.64, z: 1.57 },
    lookAt: { x: -0.6, y: 2.0, z: 8.2 }
  },
  2: { 
    position: { x: -0.66, y: 2.14, z: 10.35 },
    lookAt: { x: -0.6, y: 2.0, z: 8.2 }
  },
  3: { 
    position: { x: -5.87, y: 2.14, z: 13.47 },
    lookAt: { x: -0.6, y: 2.0, z: 8.2 }
  },
  4: { 
    position: { x: -0.61, y: 5.15, z: -7.06 },
    lookAt: { x: -0.6, y: 2.0, z: 8.2 }
  }
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

// ============ 3D BUTTONS (Fixed to Logo) ============
let buttonGroup = null;
let pathButtons = [];

function create3DButtons() {
  buttonGroup = new THREE.Group();
  
  const buttonPositions = [
    { x: -1.2, y: 1.8, z: 9.5, label: 'PATH 01', angle: -0.8 },
    { x: 0.2, y: 1.5, z: 9.5, label: 'PATH 02', angle: -0.3 },
    { x: -1.2, y: 2.2, z: 9.5, label: 'PATH 03', angle: -0.8 },
    { x: 0.2, y: 2.5, z: 9.5, label: 'PATH 04', angle: -0.3 }
  ];
  
  buttonPositions.forEach((pos, index) => {
    // Create canvas texture for button
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    
    // Draw glass button style
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Glow effect
    ctx.strokeStyle = '#00eaff';
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
    
    // Text
    ctx.fillStyle = '#00eaff';
    ctx.font = 'Bold 28px "Courier New"';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#00eaff';
    ctx.fillText(pos.label, canvas.width/2, canvas.height/2);
    
    // Add small number
    ctx.font = '16px monospace';
    ctx.fillStyle = 'rgba(0, 234, 255, 0.7)';
    ctx.fillText(`${index + 1}`, canvas.width - 30, 30);
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      transparent: true,
      opacity: 0.85,
      emissive: new THREE.Color(0x00eaff),
      emissiveIntensity: 0.1,
      side: THREE.DoubleSide
    });
    
    const geometry = new THREE.PlaneGeometry(1.2, 0.6);
    const buttonMesh = new THREE.Mesh(geometry, material);
    buttonMesh.position.set(pos.x, pos.y, pos.z);
    buttonMesh.rotation.y = pos.angle;
    buttonMesh.userData = { pathIndex: index + 1, originalScale: 1 };
    
    // Add hover detection
    buttonMesh.userData.isButton = true;
    
    buttonGroup.add(buttonMesh);
    pathButtons.push(buttonMesh);
  });
  
  scene.add(buttonGroup);
}

function updateButtonsHover() {
  if (!pathButtons.length) return;
  
  raycaster.setFromCamera(mouse, camera);
  let isHovering = false;
  
  pathButtons.forEach(button => {
    const intersects = raycaster.intersectObject(button, true);
    const isHovered = intersects.length > 0;
    
    if (isHovered) {
      isHovering = true;
      button.material.emissiveIntensity += (0.5 - button.material.emissiveIntensity) * 0.2;
      button.scale.setScalar(1.05);
      document.body.style.cursor = 'pointer';
    } else {
      button.material.emissiveIntensity += (0.1 - button.material.emissiveIntensity) * 0.2;
      button.scale.setScalar(1);
    }
  });
  
  if (!isHovering && !isHoveringLogo) {
    document.body.style.cursor = 'default';
  }
}

// ============ SMOOTH CAMERA MOVEMENT ALONG PATH ============
function smoothCameraTo(targetPos, targetLook, duration = 8000) {
  if (isAnimating) return;
  
  isAnimating = true;
  
  const startPos = camera.position.clone();
  const startLook = getCameraLookAt();
  const endPos = new THREE.Vector3(targetPos.x, targetPos.y, targetPos.z);
  const endLook = new THREE.Vector3(targetLook.x, targetLook.y, targetLook.z);
  
  const startTime = performance.now();
  
  function animateCamera(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Smooth cubic easing
    const easeProgress = progress < 0.5 
      ? 4 * progress * progress * progress 
      : 1 - Math.pow(-2 * progress + 2, 3) / 2;
    
    // Interpolate position
    camera.position.lerpVectors(startPos, endPos, easeProgress);
    
    // Interpolate lookAt
    const currentLook = new THREE.Vector3().lerpVectors(startLook, endLook, easeProgress);
    camera.lookAt(currentLook);
    
    if (progress < 1) {
      requestAnimationFrame(animateCamera);
    } else {
      // Ensure final position is exact
      camera.position.copy(endPos);
      camera.lookAt(endLook);
      isAnimating = false;
      
      // Show back button after animation completes
      const backBtn = document.getElementById('backBtn');
      if (backBtn) {
        backBtn.classList.add('show');
      }
      
      // Reset button active states
      document.querySelectorAll('.glass-btn').forEach(btn => btn.classList.remove('active'));
    }
  }
  
  requestAnimationFrame(animateCamera);
}

function getCameraLookAt() {
  // Get what the camera is currently looking at
  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);
  return camera.position.clone().add(direction);
}

function resetToStart() {
  if (isAnimating) return;
  
  isAnimating = true;
  
  const startPos = camera.position.clone();
  const startLook = getCameraLookAt();
  const endPos = new THREE.Vector3(startPosition.x, startPosition.y, startPosition.z);
  const endLook = new THREE.Vector3(startLookAt.x, startLookAt.y, startLookAt.z);
  
  const startTime = performance.now();
  const duration = 10000; // 10 seconds smooth return
  
  function animateReturn(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    const easeProgress = progress < 0.5 
      ? 4 * progress * progress * progress 
      : 1 - Math.pow(-2 * progress + 2, 3) / 2;
    
    camera.position.lerpVectors(startPos, endPos, easeProgress);
    
    const currentLook = new THREE.Vector3().lerpVectors(startLook, endLook, easeProgress);
    camera.lookAt(currentLook);
    
    if (progress < 1) {
      requestAnimationFrame(animateReturn);
    } else {
      camera.position.copy(endPos);
      camera.lookAt(endLook);
      isAnimating = false;
      
      const backBtn = document.getElementById('backBtn');
      if (backBtn) {
        backBtn.classList.remove('show');
      }
    }
  }
  
  requestAnimationFrame(animateReturn);
}

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
    create3DButtons(); // Create 3D buttons attached to scene
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
  camera.lookAt(startLookAt.x, startLookAt.y, startLookAt.z);
  
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
  const targetOpacity = (isHoveringLogo) ? 0.8 : 0.3;
  
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
    
    const lineOpacity = isHoveringLogo ? defaultSettings.plexus.lineOpacity : 0.1;
    plexusLines.material.opacity += (lineOpacity - plexusLines.material.opacity) * deltaTime * speed;
  }
}

// ============ GLOBAL FUNCTIONS FOR HTML BUTTONS ============
window.playPath = function(pathNumber) {
  const path = paths[pathNumber];
  if (path && !isAnimating) {
    smoothCameraTo(path.position, path.lookAt, 8000);
  }
};

window.resetCamera = function() {
  resetToStart();
};

// ============ HOVER EFFECTS ============
function updateHoverEffects(deltaTime) {
  const speed = 2.0;
  const isHovering = isHoveringLogo;
  
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
    updateButtonsHover();
  });
  
  // Click handler for 3D buttons
  document.addEventListener('click', (e) => {
    if (isAnimating) return;
    
    updateButtonsHover();
    for (let button of pathButtons) {
      const intersects = raycaster.intersectObject(button, true);
      if (intersects.length > 0) {
        const pathIndex = button.userData.pathIndex;
        if (pathIndex) {
          window.playPath(pathIndex);
        }
        break;
      }
    }
  });
  
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
  });
  
  document.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'r') resetToStart();
  });
}

function checkLogoHover() {
  if (!logo) return;
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(logo, true);
  isHoveringLogo = intersects.length > 0;
}

let lastTime = 0;
function animate(currentTime = 0) {
  requestAnimationFrame(animate);
  
  const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.1);
  lastTime = currentTime;
  
  if (logo) {
    logo.position.y = defaultSettings.logo.y + Math.sin(currentTime * 0.0008) * 0.05;
  }
  
  // Make buttons float with logo
  if (buttonGroup) {
    buttonGroup.position.copy(logo ? logo.position : new THREE.Vector3(-0.6, 2.0, 8.2));
    buttonGroup.position.y += Math.sin(currentTime * 0.001) * 0.03;
  }
  
  updateHoverEffects(deltaTime);
  updatePlexus(currentTime, deltaTime);
  
  composer.render();
}

init();
