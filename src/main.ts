import './ui/styles.css';
import * as THREE from 'three';
import { CameraController } from './core/Camera';
import { RendererController } from './core/Renderer';
import { SceneManager } from './core/Scene';
import { LightsController } from './core/Lights';
import { LogoModel } from './models/Logo';
import { MountainsModel } from './models/Mountains';
import { PlexusEffect } from './effects/Plexus';
import { PathSystem } from './paths/PathSystem';
import { UIManager } from './ui/UIManager';
import { updateLoadingStatus, setButtonsVisible, showBackButton } from './utils/helpers';
import { ANIMATION } from './utils/constants';

class App {
  private scene: THREE.Scene;
  private camera: CameraController;
  private renderer: RendererController;
  private lights: LightsController;
  private mountains: MountainsModel;
  private logo: LogoModel;
  private plexus: PlexusEffect;
  private paths: PathSystem;
  private ui: UIManager;
  private isAnimating = false;

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xffffff);
    this.scene.fog = new THREE.FogExp2(0xffffff, 0.01);
    
    this.camera = new CameraController();
    const container = document.getElementById('canvas-container')!;
    this.renderer = new RendererController(container, this.camera.camera, this.scene);
    this.lights = new LightsController(this.scene);
    
    this.mountains = new MountainsModel(this.scene);
    this.logo = new LogoModel(this.scene);
    this.plexus = new PlexusEffect(this.scene);
    this.paths = new PathSystem(this.camera, this.logo);
    this.ui = new UIManager();
    
    this.setupEventListeners();
    this.initSequence();
    this.animate();
  }

  private async initSequence(): Promise<void> {
    updateLoadingStatus('Setting up...');
    
    await this.mountains.load();
    await this.logo.load();
    this.plexus.init();
    
    setTimeout(() => {
      const loader = document.getElementById('loader');
      loader?.classList.add('opacity-0');
      
      setTimeout(() => {
        loader?.remove();
        const welcome = document.getElementById('welcome-overlay');
        setTimeout(() => {
          welcome?.classList.add('opacity-0');
          setTimeout(() => welcome?.remove(), 1500);
        }, ANIMATION.welcomeDelay);
      }, ANIMATION.loaderDelay);
    }, 500);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => {
      this.camera.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.camera.updateProjectionMatrix();
      this.renderer.resize();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key.toLowerCase() === 'r') {
        this.paths.resetToHome();
      }
    });

    // UI event handlers
    document.getElementById('back-btn')?.addEventListener('click', () => {
      this.paths.resetToHome();
    });

    // Path buttons
    for (let i = 1; i <= 4; i++) {
      const btn = document.getElementById(`path-btn-${i}`);
      btn?.addEventListener('click', () => {
        if (!this.isAnimating) {
          this.paths.travelTo(i);
        }
      });
    }
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);
    
    if (this.logo.mesh) {
      this.logo.mesh.position.y = 2.0 + Math.sin(Date.now() * 0.0008) * 0.05;
    }
    
    this.plexus.update();
    this.renderer.render();
  };
}

// Initialize app
new App();
