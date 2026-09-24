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

export function woodFloorTexture(colors = ['#c68a55', '#cf9560', '#bf8250', '#d39b67'], repeat = [4, 4]) {
  return canvasTexture(
    256,
    (ctx, s) => {
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
    repeat,
  );
}

export function tileTexture(repeat = [2, 12]) {
  return canvasTexture(
    128,
    (ctx, s) => {
      ctx.fillStyle = '#3d3f42';
      ctx.fillRect(0, 0, s, s);
      ctx.fillStyle = '#46494c';
      ctx.fillRect(4, 4, s / 2 - 8, s - 8);
      ctx.fillRect(s / 2 + 4, 4, s / 2 - 8, s - 8);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(s / 2 - 2, 0, 4, s);
      ctx.fillRect(0, 0, s, 3);
    },
    repeat,
  );
}

/** Oude poolkaart (zoals boven de ladekast). */
export function mapTexture() {
  const c = document.createElement('canvas');
  c.width = 192;
  c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#f1ede3';
  ctx.fillRect(0, 0, 192, 256);
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 3;
  ctx.strokeRect(8, 8, 176, 240);
  ctx.lineWidth = 1;
  for (let r = 20; r < 90; r += 16) {
    ctx.beginPath();
    ctx.arc(96, 140, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (let a = 0; a < 12; a++) {
    ctx.beginPath();
    ctx.moveTo(96, 140);
    ctx.lineTo(96 + Math.cos((a * Math.PI) / 6) * 90, 140 + Math.sin((a * Math.PI) / 6) * 90);
    ctx.stroke();
  }
  ctx.fillStyle = '#7a8a8c';
  ctx.beginPath();
  ctx.moveTo(60, 110);
  ctx.bezierCurveTo(80, 90, 130, 100, 140, 130);
  ctx.bezierCurveTo(130, 170, 90, 180, 70, 160);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#333';
  ctx.font = 'bold 13px serif';
  ctx.textAlign = 'center';
  ctx.fillText('NORTH POLAR CHART', 96, 30);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Zwart letterbord met witte letters. */
export function letterboardTexture(lines) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 200;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#c9a15a';
  ctx.fillRect(0, 0, 256, 200);
  ctx.fillStyle = '#161616';
  ctx.fillRect(10, 10, 236, 180);
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  for (let y = 14; y < 190; y += 6) {
    ctx.beginPath();
    ctx.moveTo(10, y);
    ctx.lineTo(246, y);
    ctx.stroke();
  }
  ctx.fillStyle = '#f4f4f4';
  ctx.font = 'bold 26px monospace';
  ctx.textAlign = 'center';
  lines.forEach((l, i) => ctx.fillText(l, 128, 48 + i * 38));
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
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

/** Geschilderd portret van Puck (voor schilderijen en de tv). */
export function puckPortraitTexture(bg = '#f2b457') {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 192;
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 256, 192);
  drawPuckHead(ctx, 128, 104, 1);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Tekent een eenvoudige Puck-kop (zijaanzicht) op een canvas. */
export function drawPuckHead(ctx, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  // lijf + rode staart
  ctx.fillStyle = '#d7263d';
  ctx.beginPath();
  ctx.moveTo(-40, 60);
  ctx.lineTo(-75, 95);
  ctx.lineTo(-50, 100);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#8f969c';
  ctx.beginPath();
  ctx.ellipse(-10, 45, 45, 55, -0.3, 0, Math.PI * 2);
  ctx.fill();
  // rode spikkels
  ctx.fillStyle = '#ef6b57';
  [[5, 60], [15, 72], [-2, 80], [20, 55]].forEach(([px, py]) => {
    ctx.beginPath();
    ctx.ellipse(px, py, 5, 3, 0.3, 0, Math.PI * 2);
    ctx.fill();
  });
  // kop
  ctx.fillStyle = '#b3b9be';
  ctx.beginPath();
  ctx.arc(10, -20, 42, 0, Math.PI * 2);
  ctx.fill();
  // wit oogvlak
  ctx.fillStyle = '#f5f2ec';
  ctx.beginPath();
  ctx.ellipse(26, -22, 20, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  // oog
  ctx.fillStyle = '#f3dc7a';
  ctx.beginPath();
  ctx.arc(26, -24, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.arc(27, -24, 4, 0, Math.PI * 2);
  ctx.fill();
  // snavel
  ctx.fillStyle = '#1d1d1f';
  ctx.beginPath();
  ctx.moveTo(40, -18);
  ctx.quadraticCurveTo(78, -18, 66, 16);
  ctx.quadraticCurveTo(58, 2, 42, 4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
