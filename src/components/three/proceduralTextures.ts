import * as THREE from 'three';

function hash2d(x: number, y: number, seed: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453123;
  return n - Math.floor(n);
}

function smoothNoise(x: number, y: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash2d(ix, iy, seed);
  const b = hash2d(ix + 1, iy, seed);
  const c = hash2d(ix, iy + 1, seed);
  const d = hash2d(ix + 1, iy + 1, seed);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

function fbm(x: number, y: number, seed: number): number {
  let val = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < 4; i++) {
    val += amp * smoothNoise(x * freq, y * freq, seed + i * 13);
    freq *= 2.05;
    amp *= 0.5;
  }
  return val;
}

export function createPlanetTexture(
  bodyId: string,
  maxAnisotropy: number = 4
): THREE.CanvasTexture {
  const w = 512;
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(w, h);
  const data = img.data;

  for (let py = 0; py < h; py++) {
    const v = py / h;
    const lat = (v - 0.5) * Math.PI;
    const absLat = Math.abs(v - 0.5) * 2;
    for (let px = 0; px < w; px++) {
      const u = px / w;
      const idx = (py * w + px) * 4;
      let r = 128;
      let g = 128;
      let b = 128;

      if (bodyId === 'leo' || bodyId === 'geo' || bodyId === 'earth') {
        const n = fbm(u * 6, v * 3.5, 11);
        const clouds = fbm(u * 9 + 4, v * 5, 29);
        if (absLat > 0.86 - n * 0.08) {
          r = 225; g = 236; b = 246;
        } else if (n > 0.52) {
          // Continents
          const elev = (n - 0.52) / 0.48;
          r = Math.round(52 + elev * 85);
          g = Math.round(108 + elev * 45);
          b = Math.round(62 + elev * 20);
        } else {
          // Oceans
          const depth = n / 0.52;
          r = Math.round(14 + depth * 18);
          g = Math.round(48 + depth * 52);
          b = Math.round(115 + depth * 65);
        }
        if (clouds > 0.6) {
          const cAlpha = Math.min(0.75, (clouds - 0.6) * 2.1);
          r = Math.round(r * (1 - cAlpha) + 240 * cAlpha);
          g = Math.round(g * (1 - cAlpha) + 246 * cAlpha);
          b = Math.round(b * (1 - cAlpha) + 255 * cAlpha);
        }
      } else if (bodyId === 'mars') {
        const n = fbm(u * 7, v * 4, 43);
        const fine = fbm(u * 18, v * 10, 71);
        if (absLat > 0.89 - n * 0.05) {
          r = 230; g = 215; b = 205;
        } else {
          r = Math.round(145 + n * 75 + fine * 18);
          g = Math.round(65 + n * 42 + fine * 12);
          b = Math.round(40 + n * 28);
        }
      } else if (bodyId === 'venus') {
        const bands = Math.sin(v * 18 + fbm(u * 5, v * 4, 17) * 3.5) * 0.5 + 0.5;
        r = Math.round(195 + bands * 42);
        g = Math.round(158 + bands * 45);
        b = Math.round(88 + bands * 35);
      } else if (bodyId === 'jupiter') {
        const swirl = fbm(u * 8, v * 6, 97) * 0.14;
        const band = Math.sin((v + swirl) * 28) * 0.5 + 0.5;
        const storm = Math.hypot((u - 0.62) * 2.2, (v - 0.62) * 4.5);
        if (storm < 0.18) {
          r = 198; g = 92; b = 62;
        } else {
          r = Math.round(162 + band * 68);
          g = Math.round(126 + band * 64);
          b = Math.round(92 + band * 52);
        }
      } else if (bodyId === 'sun') {
        const gran = fbm(u * 14, v * 8, 101);
        r = 255;
        g = Math.round(175 + gran * 70);
        b = Math.round(45 + gran * 75);
      } else {
        // Moon / Ceres cratered regolith
        const n = fbm(u * 10, v * 6, 53);
        const craters = Math.abs(Math.sin(u * 30 + n * 5) * Math.cos(v * 18 + n * 4));
        const shade = 0.55 + n * 0.35 - (craters > 0.85 ? 0.2 : 0);
        r = Math.round(155 * shade);
        g = Math.round(158 * shade);
        b = Math.round(166 * shade);
      }

      const poleShade = 1 - Math.pow(Math.abs(Math.sin(lat)), 6) * 0.12;
      data[idx] = Math.min(255, Math.max(0, Math.round(r * poleShade)));
      data[idx + 1] = Math.min(255, Math.max(0, Math.round(g * poleShade)));
      data[idx + 2] = Math.min(255, Math.max(0, Math.round(b * poleShade)));
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createSolarPanelTexture(maxAnisotropy: number = 4): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0c1e42';
  ctx.fillRect(0, 0, 256, 256);

  // Photovoltaic cell grid
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.45;
  for (let x = 0; x <= 256; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 256);
    ctx.stroke();
  }
  for (let y = 0; y <= 256; y += 16) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();
  }

  // Fine silver busbars
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 0.75;
  ctx.globalAlpha = 0.3;
  for (let x = 16; x < 256; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 256);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createMliFoilBumpTexture(maxAnisotropy: number = 4): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(256, 256);

  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 256; x++) {
      const n = fbm(x * 0.08, y * 0.08, 19);
      const crinkle = Math.abs(Math.sin(x * 0.14 + n * 5) * Math.cos(y * 0.14 - n * 4));
      const v = Math.round(90 + crinkle * 155);
      const i = (y * 256 + x) * 4;
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAnisotropy;
  return tex;
}
