import * as THREE from 'three';

// Kleine procedurele canvas-texturen, zodat er geen afbeeldingen geladen hoeven te worden.

function canvasTexture(size, draw, repeat = [1, 1]) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  draw(ctx, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat[0], repeat[1]);
  tex.anisotropy = 4;
  return tex;
}

export function woodFloorTexture() {
  return canvasTexture(
    256,
    (ctx, s) => {
      const colors = ['#c68a55', '#cf9560', '#bf8250', '#d39b67'];
      const plank = s / 4;
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = colors[i % colors.length];
        ctx.fillRect(0, i * plank, s, plank);
        // naden
        ctx.fillStyle = 'rgba(90,50,20,0.35)';
        ctx.fillRect(0, i * plank, s, 2);
        const offset = (i * 97) % s;
        ctx.fillRect(offset, i * plank, 2, plank);
        // subtiele nerf
        ctx.strokeStyle = 'rgba(120,70,30,0.12)';
        for (let k = 0; k < 3; k++) {
          ctx.beginPath();
          const y = i * plank + 8 + k * 18;
          ctx.moveTo(0, y);
          ctx.bezierCurveTo(s * 0.3, y + 4, s * 0.6, y - 4, s, y + 2);
          ctx.stroke();
        }
      }
    },
    [4, 4],
  );
}

export function wallpaperTexture() {
  return canvasTexture(
    128,
    (ctx, s) => {
      ctx.fillStyle = '#f7dfb8';
      ctx.fillRect(0, 0, s, s);
      ctx.fillStyle = 'rgba(232, 150, 110, 0.18)';
      for (let x = 0; x < s; x += 32) ctx.fillRect(x, 0, 10, s);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      for (let y = 16; y < s; y += 32) {
        for (let x = 21; x < s; x += 32) {
          ctx.beginPath();
          ctx.arc(x, y, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    },
    [6, 2],
  );
}

export function rugTexture() {
  return canvasTexture(256, (ctx, s) => {
    ctx.fillStyle = '#d9644a';
    ctx.fillRect(0, 0, s, s);
    const rings = ['#f2b457', '#fbe3c0', '#e0845f', '#f2b457'];
    rings.forEach((c, i) => {
      ctx.strokeStyle = c;
      ctx.lineWidth = 10;
      const m = 20 + i * 26;
      ctx.strokeRect(m, m, s - m * 2, s - m * 2);
    });
    ctx.fillStyle = '#fbe3c0';
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, 16, 0, Math.PI * 2);
    ctx.fill();
  });
}

export function skyTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 2;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#7ec8f2');
  g.addColorStop(0.6, '#bfe6ff');
  g.addColorStop(1, '#fff1d6');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 2, 256);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
