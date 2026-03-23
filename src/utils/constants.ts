export const HOME_POSITION = {
  x: -0.51,
  y: 2.14,
  z: 10.47,
  h: 179.4 * (Math.PI / 180),
  v: -5.3 * (Math.PI / 180)
};

export const PATHS = {
  1: {
    start: { ...HOME_POSITION },
    end: { 
      x: -2.77, y: 2.64, z: 1.57,
      h: 179.4 * (Math.PI / 180),
      v: -5.3 * (Math.PI / 180)
    }
  },
  2: {
    start: { ...HOME_POSITION },
    end: { 
      x: -0.66, y: 2.14, z: 10.35,
      h: 179.4 * (Math.PI / 180),
      v: -5.3 * (Math.PI / 180)
    }
  },
  3: {
    start: { ...HOME_POSITION },
    end: { 
      x: -5.87, y: 2.14, z: 13.47,
      h: 179.4 * (Math.PI / 180),
      v: -5.3 * (Math.PI / 180)
    }
  },
  4: {
    start: { ...HOME_POSITION },
    end: { 
      x: -0.61, y: 5.15, z: -7.06,
      h: 179.4 * (Math.PI / 180),
      v: -5.3 * (Math.PI / 180)
    }
  }
};

export const SETTINGS = {
  mountains: {
    position: { x: -7.9, y: 4.9, z: 3.5 },
    scale: { x: 0.8, y: 1.9, z: 1.0 },
    uniformScale: 30,
    rotation: { x: 0, y: 133, z: 0 }
  },
  logo: {
    position: { x: -0.6, y: 2.0, z: 8.2 },
    scale: { x: 1.0, y: 1.0, z: 0.9 },
    uniformScale: 0.8,
    rotation: { x: 0, y: 0, z: 2 },
    material: {
      metalness: 0.8,
      roughness: 0.2,
      clearCoat: 0.8,
      glowIntensity: 0.0
    }
  },
  plexus: {
    count: 15,
    radius: 8,
    size: 0.05,
    lineOpacity: 0.4,
    changeSpeed: 200
  }
};

export const ANIMATION = {
  pathDuration: 10000,
  returnDuration: 12000,
  welcomeDelay: 3000,
  loaderDelay: 1000
};
