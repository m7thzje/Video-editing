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

/** Gedetailleerd holo-ruilkaartje: "Vuurdraak, 150 HP". Geeft een canvas terug. */
export function vuurdraakCardCanvas() {
  const W = 250;
  const H = 350;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  const round = (x, y, w, h, r) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };
  // Gele rand en oranje vuurkaart
  ctx.fillStyle = '#f5cf3a';
  round(0, 0, W, H, 14);
  ctx.fill();
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#f7a35c');
  bg.addColorStop(1, '#e8663a');
  ctx.fillStyle = bg;
  round(10, 10, W - 20, H - 20, 8);
  ctx.fill();
  // Kop: naam + HP + vuursymbool
  ctx.fillStyle = '#3b1d10';
  ctx.font = 'bold 20px Georgia, serif';
  ctx.fillText('Vuurdraak', 20, 36);
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('150 HP', 150, 35);
  const flameIcon = (x, y, r) => {
    ctx.fillStyle = '#d7263d';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd36b';
    ctx.beginPath();
    ctx.moveTo(x, y - r * 0.7);
    ctx.quadraticCurveTo(x + r * 0.6, y, x, y + r * 0.6);
    ctx.quadraticCurveTo(x - r * 0.6, y, x, y - r * 0.7);
    ctx.fill();
  };
  flameIcon(222, 30, 10);
  // Plaatje: holografische achtergrond met een draak
  const artX = 20;
  const artY = 48;
  const artW = W - 40;
  const artH = 130;
  const holo = ctx.createLinearGradient(artX, artY, artX + artW, artY + artH);
  holo.addColorStop(0, '#fff3a0');
  holo.addColorStop(0.3, '#ffb35c');
  holo.addColorStop(0.55, '#ff7a59');
  holo.addColorStop(0.8, '#ffd36b');
  holo.addColorStop(1, '#fff7c9');
  ctx.fillStyle = holo;
  ctx.fillRect(artX, artY, artW, artH);
  ctx.strokeStyle = '#c9a15a';
  ctx.lineWidth = 4;
  ctx.strokeRect(artX, artY, artW, artH);
  // Holo-sterretjes
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  for (let i = 0; i < 18; i++) {
    const x = artX + ((i * 53) % artW);
    const y = artY + ((i * 37) % artH);
    ctx.beginPath();
    ctx.arc(x, y, 1.5 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }
  // De draak: vleugels, lijf, kop, staart met vlam
  ctx.save();
  ctx.translate(artX + artW / 2, artY + artH / 2 + 10);
  ctx.fillStyle = '#2f7e8a';
  ctx.beginPath();
  ctx.moveTo(-5, -10);
  ctx.lineTo(-70, -55);
  ctx.lineTo(-55, -15);
  ctx.lineTo(-75, -10);
  ctx.lineTo(-20, 10);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(10, -10);
  ctx.lineTo(70, -58);
  ctx.lineTo(58, -18);
  ctx.lineTo(78, -12);
  ctx.lineTo(25, 10);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f08a2c';
  ctx.beginPath();
  ctx.ellipse(0, 12, 26, 34, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffd99a';
  ctx.beginPath();
  ctx.ellipse(4, 20, 14, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f08a2c';
  ctx.beginPath();
  ctx.ellipse(18, -30, 16, 12, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(22, -34, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.arc(23, -34, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#f08a2c';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(-20, 35);
  ctx.quadraticCurveTo(-55, 50, -60, 20);
  ctx.stroke();
  ctx.fillStyle = '#ff4b1f';
  ctx.beginPath();
  ctx.moveTo(-60, 22);
  ctx.quadraticCurveTo(-72, 5, -62, -8);
  ctx.quadraticCurveTo(-54, 6, -60, 22);
  ctx.fill();
  // Vuurspuwen
  const fire = ctx.createLinearGradient(30, -30, 90, -40);
  fire.addColorStop(0, '#ffe066');
  fire.addColorStop(1, 'rgba(255,80,30,0)');
  ctx.fillStyle = fire;
  ctx.beginPath();
  ctx.moveTo(30, -28);
  ctx.lineTo(95, -50);
  ctx.lineTo(95, -15);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // Info-balkje
  ctx.fillStyle = '#f5cf3a';
  ctx.fillRect(28, 182, W - 56, 14);
  ctx.fillStyle = '#3b1d10';
  ctx.font = 'italic 9px sans-serif';
  ctx.fillText('Vuur-papegaaimonster. Lengte: 1,7 m. Gewicht: 90 kg', 34, 192);
  // Aanvallen
  ctx.font = 'bold 15px sans-serif';
  flameIcon(30, 222, 7);
  flameIcon(46, 222, 7);
  ctx.fillStyle = '#3b1d10';
  ctx.fillText('Vuurspin', 60, 227);
  ctx.fillText('120', 196, 227);
  ctx.font = '10px sans-serif';
  ctx.fillText('Gooi 2 energie af van deze kaart.', 26, 244);
  ctx.font = 'bold 15px sans-serif';
  flameIcon(30, 270, 7);
  ctx.fillStyle = '#3b1d10';
  ctx.fillText('Koekjeskracht', 45, 275);
  ctx.fillText('40', 204, 275);
  ctx.font = '10px sans-serif';
  ctx.fillText('"Mag ik een koekje?" Genees 20 HP.', 26, 292);
  // Voet: zwakte/weerstand
  ctx.strokeStyle = '#3b1d10';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(22, 305);
  ctx.lineTo(W - 22, 305);
  ctx.stroke();
  ctx.font = '10px sans-serif';
  ctx.fillText('zwakte: 💧 ×2    weerstand: 🌰 -20    terugtrek: ★★★', 22, 322);
  ctx.font = 'bold 9px sans-serif';
  ctx.fillText('4/102 ★  ZELDZAAM  •  Puck-editie 2026', 60, 338);
  // Hologlans
  const shine = ctx.createLinearGradient(0, 0, W, H);
  shine.addColorStop(0.35, 'rgba(255,255,255,0)');
  shine.addColorStop(0.5, 'rgba(255,255,255,0.35)');
  shine.addColorStop(0.65, 'rgba(255,255,255,0)');
  ctx.fillStyle = shine;
  round(0, 0, W, H, 14);
  ctx.fill();
  return c;
}

export function vuurdraakCardTexture() {
  const t = new THREE.CanvasTexture(vuurdraakCardCanvas());
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Lichtgrijze baksteen (plint van de flat). */
export function greyBrickTexture(repeat = [8, 3]) {
  return canvasTexture(
    128,
    (ctx, s) => {
      ctx.fillStyle = '#b9b7b1';
      ctx.fillRect(0, 0, s, s);
      const bh = 16;
      for (let r = 0; r < s / bh; r++) {
        const off = r % 2 ? 16 : 0;
        for (let x = -32; x < s; x += 32) {
          const shade = 190 + ((r * 7 + x) % 5) * 6;
          ctx.fillStyle = `rgb(${shade},${shade - 2},${shade - 8})`;
          ctx.fillRect(x + off + 1, r * bh + 1, 30, bh - 2);
        }
      }
    },
    repeat,
  );
}

/** Grijze betonnen stoeptegels. */
export function pavingTexture(repeat = [12, 3]) {
  return canvasTexture(
    128,
    (ctx, s) => {
      ctx.fillStyle = '#8f9091';
      ctx.fillRect(0, 0, s, s);
      for (let y = 0; y < s; y += 32) {
        for (let x = 0; x < s; x += 32) {
          const v = 150 + ((x * 3 + y * 5) % 7) * 5;
          ctx.fillStyle = `rgb(${v},${v},${v + 3})`;
          ctx.fillRect(x + 1, y + 1, 30, 30);
        }
      }
    },
    repeat,
  );
}

/** Rode klinkers. */
export function redBrickPavingTexture(repeat = [2, 6]) {
  return canvasTexture(
    64,
    (ctx, s) => {
      ctx.fillStyle = '#6e3a2e';
      ctx.fillRect(0, 0, s, s);
      for (let y = 0; y < s; y += 8) {
        for (let x = (y / 8) % 2 ? -8 : 0; x < s; x += 16) {
          ctx.fillStyle = (x + y) % 3 ? '#9b4e3c' : '#8a4535';
          ctx.fillRect(x + 1, y + 1, 14, 6);
        }
      }
    },
    repeat,
  );
}

/** Grindtegels (terrazzo). */
export function terrazzoTexture(repeat = [1, 6]) {
  return canvasTexture(
    64,
    (ctx, s) => {
      ctx.fillStyle = '#cfc9bd';
      ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < 260; i++) {
        const v = 150 + ((i * 37) % 90);
        ctx.fillStyle = `rgb(${v},${v - 6},${v - 14})`;
        ctx.fillRect((i * 29) % s, (i * 53) % s, 2, 2);
      }
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fillRect(0, 0, s, 1);
    },
    repeat,
  );
}

/** Rijen brievenbussen in de hal. */
export function mailboxTexture() {
  return canvasTexture(
    128,
    (ctx, s) => {
      ctx.fillStyle = '#e7e1d6';
      ctx.fillRect(0, 0, s, s);
      for (let y = 8; y < s - 8; y += 12) {
        for (let x = 6; x < s - 6; x += 20) {
          ctx.fillStyle = '#3a2e27';
          ctx.fillRect(x, y, 17, 10);
          ctx.fillStyle = '#c9a15a';
          ctx.fillRect(x + 6, y + 4, 5, 1);
        }
      }
    },
    [1, 1],
  );
}
