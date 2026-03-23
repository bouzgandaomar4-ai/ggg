import { CameraController } from '../core/Camera';
import { LogoModel } from '../models/Logo';
import { PATHS, ANIMATION } from '../utils/constants';
import { easeInOutCubic, setButtonsVisible, showBackButton } from '../utils/helpers';

export class PathSystem {
  private camera: CameraController;
  private logo: LogoModel;
  private isAnimating = false;

  constructor(camera: CameraController, logo: LogoModel) {
    this.camera = camera;
    this.logo = logo;
  }

  travelTo(pathNumber: keyof typeof PATHS): void {
    if (this.isAnimating) return;
    
    const path = PATHS[pathNumber];
    if (!path) return;

    this.isAnimating = true;
    setButtonsVisible(false);
    showBackButton(false);

    const startTime = performance.now();
    
    const animate = (): void => {
      if (!this.isAnimating) return;

      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / ANIMATION.pathDuration, 1);
      const eased = easeInOutCubic(progress);

      // Interpolate position
      const x = path.start.x + (path.end.x - path.start.x) * eased;
      const y = path.start.y + (path.end.y - path.start.y) * eased;
      const z = path.start.z + (path.end.z - path.start.z) * eased;

      // Interpolate look direction
      const h = path.start.h + (path.end.h - path.start.h) * eased;
      const v = path.start.v + (path.end.v - path.start.v) * eased;

      this.camera.updatePosition(x, y, z, h, v);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.isAnimating = false;
        setTimeout(() => showBackButton(true), 500);
      }
    };

    animate();
  }

  resetToHome(): void {
    if (this.isAnimating) return;

    this.isAnimating = true;
    showBackButton(false);

    const startX = this.camera.camera.position.x;
    const startY = this.camera.camera.position.y;
    const startZ = this.camera.camera.position.z;

    const startTime = performance.now();

    const animate = (): void => {
      if (!this.isAnimating) return;

      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / ANIMATION.returnDuration, 1);
      const eased = easeInOutCubic(progress);

      const x = startX + (PATHS[1].start.x - startX) * eased;
      const y = startY + (PATHS[1].start.y - startY) * eased;
      const z = startZ + (PATHS[1].start.z - startZ) * eased;

      const h = PATHS[1].start.h * eased;
      const v = PATHS[1].start.v * eased;

      this.camera.updatePosition(x, y, z, h, v);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.isAnimating = false;
        setButtonsVisible(true);
      }
    };

    animate();
  }
}
