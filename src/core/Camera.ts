import * as THREE from 'three';
import { HOME_POSITION } from '../utils/constants';

export class CameraController {
  camera: THREE.PerspectiveCamera;
  
  constructor() {
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.setPosition(HOME_POSITION);
  }

  setPosition(pos: typeof HOME_POSITION): void {
    this.camera.position.set(pos.x, pos.y, pos.z);
    this.setLookDirection(pos.h, pos.v);
  }

  setLookDirection(horizontal: number, vertical: number): void {
    const direction = new THREE.Vector3();
    direction.x = Math.sin(horizontal) * Math.cos(vertical);
    direction.y = Math.sin(vertical);
    direction.z = Math.cos(horizontal) * Math.cos(vertical);
    
    const target = new THREE.Vector3(
      this.camera.position.x + direction.x,
      this.camera.position.y + direction.y,
      this.camera.position.z + direction.z
    );
    this.camera.lookAt(target);
  }

  updatePosition(x: number, y: number, z: number, h: number, v: number): void {
    this.camera.position.set(x, y, z);
    this.setLookDirection(h, v);
  }
}
