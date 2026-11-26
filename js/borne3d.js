// O'javana kiosk, interactive 3D scene driven by scroll.
// Geometry follows the real kiosk photos: portrait 23,8" screen tilted back, white module
// with ticket printer (left) and payment reader (right), black side terminal, single column, square base.
import * as T from './three-bundle.js';

const sec = document.getElementById('solution');
const stage = document.getElementById('b3-stage');
const canvas = document.getElementById('b3-canvas');
const chapters = [].slice.call(document.querySelectorAll('.b3-ch'));
const labels = [].slice.call(document.querySelectorAll('.b3-label'));
const steps = [].slice.call(document.querySelectorAll('.b3-steps li'));
const specEl = document.getElementById('b3-spec');
const clockEl = document.getElementById('b3-clock');
const cta = document.querySelector('.b3-cta');
const hint = document.querySelector('.b3-hint');
const N = chapters.length;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

function webglOK() { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } }
if (!sec || !canvas || reduce || !webglOK()) {
  document.documentElement.classList.add('no3d');
} else {
  document.documentElement.classList.add('has3d');
  init();
}

function init() {
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;

  const scene = new T.Scene();
  const pmrem = new T.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new T.RoomEnvironment(), 0.04).texture;

  const camera = new T.PerspectiveCamera(30, 1, 0.05, 50);

  // Lights
  scene.add(new T.HemisphereLight(0xdfeeea, 0x0c1112, 0.55));
  const key = new T.DirectionalLight(0xffffff, 2.2);
  key.position.set(2.5, 4, 3);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -1.2; key.shadow.camera.right = 1.2; key.shadow.camera.top = 2; key.shadow.camera.bottom = -0.5;
  key.shadow.radius = 6; key.shadow.bias = -0.0005;
  scene.add(key);
  const rim = new T.DirectionalLight(0x7fd1c8, 1.4); rim.position.set(-3, 2.2, -2.5); scene.add(rim);
  const warm = new T.PointLight(0xf2a541, 0, 3, 2); warm.position.set(0.25, 0.95, 0.5); scene.add(warm);

  // Floor: soft glow disc + shadow catcher
  const glowTex = radialTex(['rgba(255,255,255,0.22)', 'rgba(255,255,255,0.05)', 'rgba(255,255,255,0)']);
  const glow = new T.Mesh(new T.PlaneGeometry(3.4, 3.4), new T.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false }));
  glow.rotation.x = -Math.PI / 2; glow.position.y = 0.001; scene.add(glow);
  const floor = new T.Mesh(new T.PlaneGeometry(6, 6), new T.ShadowMaterial({ opacity: 0.45 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

  // Materials
  const white = new T.MeshPhysicalMaterial({ color: 0xf0f1ef, roughness: 0.38, metalness: 0, clearcoat: 0.35, clearcoatRoughness: 0.4 });
  const grey = new T.MeshStandardMaterial({ color: 0xd9dcda, roughness: 0.5 });
  const black = new T.MeshPhysicalMaterial({ color: 0x0d0f10, roughness: 0.28, clearcoat: 0.6 });
  const glass = new T.MeshPhysicalMaterial({ color: 0x101415, roughness: 0.08, metalness: 0, clearcoat: 1 });

  const kiosk = new T.Group(); scene.add(kiosk);
  const parts = {};
  function box(w, h, d, r, mat, parent) {
    const m = new T.Mesh(new T.RoundedBoxGeometry(w, h, d, 4, r), mat);
    m.castShadow = true; m.receiveShadow = true; (parent || kiosk).add(m); return m;
  }

  // Base and column
  parts.base = new T.Group(); kiosk.add(parts.base);
  box(0.46, 0.016, 0.46, 0.006, white, parts.base).position.y = 0.008;
  parts.column = new T.Group(); kiosk.add(parts.column);
  box(0.12, 0.86, 0.09, 0.012, white, parts.column).position.y = 0.016 + 0.43;

  // Module: printer + payment reader
  parts.module = new T.Group(); parts.module.position.set(0, 0.97, 0.012); kiosk.add(parts.module);
  box(0.36, 0.19, 0.15, 0.016, white, parts.module);
  const printerPanel = box(0.13, 0.14, 0.006, 0.004, grey, parts.module); printerPanel.position.set(-0.088, -0.005, 0.075);
  const slot = new T.Mesh(new T.PlaneGeometry(0.085, 0.006), new T.MeshBasicMaterial({ color: 0x1a1d1e }));
  slot.position.set(-0.088, 0.045, 0.0786); parts.module.add(slot);
  const reader = box(0.105, 0.15, 0.012, 0.005, black, parts.module); reader.position.set(0.085, -0.003, 0.076);
  const ledMat = new T.MeshBasicMaterial({ color: 0xff3b2f, toneMapped: false });
  const led = new T.Mesh(new T.PlaneGeometry(0.07, 0.007), ledMat); led.position.set(0.085, 0.012, 0.0826); parts.module.add(led);
  const blue = new T.Mesh(new T.CircleGeometry(0.004, 16), new T.MeshBasicMaterial({ color: 0x3d7bff, toneMapped: false }));
  blue.position.set(0.085, -0.055, 0.0826); parts.module.add(blue);
  const nfc = new T.Mesh(new T.PlaneGeometry(0.05, 0.03), new T.MeshBasicMaterial({ map: nfcTex(), transparent: true, toneMapped: false }));
  nfc.position.set(0.085, 0.048, 0.0826); parts.module.add(nfc);
  const logo = new T.Mesh(new T.PlaneGeometry(0.11, 0.022), new T.MeshBasicMaterial({ map: logoTex(), transparent: true }));
  logo.position.set(0, 0.083, 0.0762); parts.module.add(logo);

  // Ticket (slides out of the printer slot)
  const ticketTex = ticketTexture();
  const ticket = new T.Mesh(new T.PlaneGeometry(0.075, 0.16), new T.MeshStandardMaterial({ map: ticketTex, roughness: 0.9, side: T.DoubleSide }));
  const ticketPivot = new T.Group(); ticketPivot.position.set(-0.088, 0.045, 0.079); parts.module.add(ticketPivot);
  ticket.geometry.translate(0, -0.08, 0); ticketPivot.add(ticket); ticket.scale.y = 0.001;

  // Screen, tilted back
  parts.screen = new T.Group(); parts.screen.position.set(0, 1.065, 0.0); kiosk.add(parts.screen);
  const tilt = new T.Group(); tilt.rotation.x = -0.1; parts.screen.add(tilt);
  const bezel = box(0.37, 0.63, 0.05, 0.02, white, tilt); bezel.position.y = 0.315;
  const glassFace = box(0.335, 0.585, 0.004, 0.003, glass, tilt); glassFace.position.set(0, 0.318, 0.0255);
  const scr = document.createElement('canvas'); scr.width = 640; scr.height = 1120;
  const sctx = scr.getContext('2d');
  const scrTex = new T.CanvasTexture(scr); scrTex.colorSpace = T.SRGBColorSpace; scrTex.anisotropy = 8;
  const display = new T.Mesh(new T.PlaneGeometry(0.32, 0.56), new T.MeshBasicMaterial({ map: scrTex, toneMapped: false }));
  display.position.set(0, 0.318, 0.0281); tilt.add(display);

  // Black side terminal on a bracket (right side)
  parts.side = new T.Group(); parts.side.position.set(0.25, 1.17, 0.0); kiosk.add(parts.side);
  box(0.05, 0.03, 0.03, 0.006, grey, parts.side).position.set(-0.04, 0, 0);
  const term = box(0.085, 0.165, 0.022, 0.008, black, parts.side); term.position.set(0.012, 0, 0.012); term.rotation.y = -0.25;
  const tscreen = new T.Mesh(new T.PlaneGeometry(0.062, 0.07), new T.MeshBasicMaterial({ color: 0x1d2a2b, toneMapped: false }));
  tscreen.position.set(0.0145, 0.03, 0.0236); tscreen.rotation.y = -0.25; parts.side.add(tscreen);
  const tsMat = tscreen.material;

  // Exploded-view anchors (for HTML labels)
  const anchors = [
    new T.Vector3(0.19, 1.45, 0.03),   // screen
    new T.Vector3(0.14, 0.97, 0.08),   // payment reader
    new T.Vector3(-0.15, 1.0, 0.08),   // printer
    new T.Vector3(0.0, 0.45, 0.06),    // column + base
    new T.Vector3(0.31, 1.2, 0.03)     // side terminal
  ];
  const anchorParents = [parts.screen, parts.module, parts.module, parts.column, parts.side];
  const anchorLocal = anchors.map((a, i) => anchorParents[i].worldToLocal(a.clone()));

  // ---------- Screen UI (drawn on canvas) ----------
  const icons = {};
  const ICON = window.OJ_ICON || {};
  Object.keys(ICON).forEach(k => {
    const svg = ICON[k].replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="208" ');
    const im = new Image(); im.onload = () => { icons[k] = im; lastScreen = -1; };
    im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
  const TEAL = '#1e5b5a', RED = '#d6362e', INK = '#0f1a1a', MUTE = '#5d6b6a', TILE = '#eef0ee';
  function rr(x, y, w, h, r, fill, stroke) { sctx.beginPath(); sctx.roundRect(x, y, w, h, r); if (fill) { sctx.fillStyle = fill; sctx.fill(); } if (stroke) { sctx.lineWidth = 6; sctx.strokeStyle = stroke; sctx.stroke(); } }
  function txt(s, x, y, size, color, weight, align) { sctx.font = (weight || 600) + ' ' + size + 'px Inter, system-ui, sans-serif'; sctx.fillStyle = color || INK; sctx.textAlign = align || 'left'; sctx.fillText(s, x, y); }
  function header(title, sub) {
    sctx.fillStyle = '#fff'; sctx.fillRect(0, 0, 640, 1120);
    sctx.fillStyle = TEAL; sctx.fillRect(0, 0, 640, 96);
    txt("o'javana", 40, 62, 38, '#fff', 800);
    txt('FR · DE · EN', 600, 60, 22, '#cfe5e2', 600, 'right');
    txt(title, 40, 180, 52, INK, 800);
    if (sub) txt(sub, 40, 226, 26, MUTE, 500);
  }
  function tile(x, y, w, h, name, on) {
    rr(x, y, w, h, 22, on ? '#d9ecea' : TILE, on ? TEAL : null);
    if (icons[name]) sctx.drawImage(icons[name], x + w * 0.12, y + 14, w * 0.76, w * 0.76 * 0.8125);
    txt(name, x + w / 2, y + h - 22, 26, INK, 700, 'center');
  }
  function footer(left, right, btn) {
    sctx.fillStyle = '#e3e6e4'; sctx.fillRect(40, 950, 560, 2);
    txt(left, 40, 1020, 30, INK, 700);
    if (btn) { rr(380, 975, 220, 72, 16, RED); txt(right, 490, 1022, 28, '#fff', 700, 'center'); }
    else txt(right, 600, 1020, 30, INK, 700, 'right');
  }
  const SCREENS = [
    function welcome() {
      const g = sctx.createLinearGradient(0, 0, 0, 1120); g.addColorStop(0, '#163b3a'); g.addColorStop(1, '#0c1112');
      sctx.fillStyle = g; sctx.fillRect(0, 0, 640, 1120);
      if (icons.Cheese) sctx.drawImage(icons.Cheese, 120, 250, 400, 325);
      txt("o'javana", 320, 140, 46, '#fff', 800, 'center');
      txt('Bienvenue', 320, 700, 64, '#fff', 800, 'center');
      txt('Touchez l’écran pour commander', 320, 760, 28, '#cfe5e2', 500, 'center');
      rr(150, 880, 340, 96, 48, RED); txt('Commencer', 320, 940, 34, '#fff', 700, 'center');
    },
    function burgers() {
      header('Burgers', 'Touchez un produit');
      const names = ['Classic', 'Cheese', 'Chicken', 'Veggie', 'Kebab', 'Wrap'];
      names.forEach((n, i) => tile(40 + (i % 3) * 190, 270 + Math.floor(i / 3) * 320, 170, 296, n, n === 'Cheese'));
      footer('Panier', 'CHF —');
    },
    function custom() {
      header('Cheese burger', 'Personnalisez');
      if (icons.Cheese) sctx.drawImage(icons.Cheese, 200, 250, 240, 195);
      const rows = [['Oignons', 'Retiré', true], ['Sauce à part', 'Ajouté', false], ['Taille XL', '+', false]];
      rows.forEach((r, i) => {
        const y = 490 + i * 130; rr(40, y, 560, 104, 20, TILE);
        txt(r[0], 74, y + 64, 32, r[2] ? MUTE : INK, 600);
        if (r[2]) { sctx.fillStyle = MUTE; sctx.fillRect(74, y + 52, sctx.measureText(r[0]).width, 3); }
        if (r[1] === '+') txt('+', 566, y + 66, 40, TEAL, 700, 'right');
        else { rr(430, y + 28, 140, 50, 25, TEAL); txt(r[1], 500, y + 63, 24, '#fff', 700, 'center'); }
      });
      footer('Sans oignons', 'Valider', true);
    },
    function upsell() {
      header('Vous aimerez aussi', 'Suggestion pour votre commande');
      [['Frites', 1], ['Boisson', 1], ['Dessert', 0], ['Sauce', 0]].forEach((t, i) => tile(40 + (i % 2) * 290, 270 + Math.floor(i / 2) * 330, 270, 306, t[0], !!t[1]));
      footer('Menu complet', 'Ajouter', true);
    },
    function pay() {
      header('Paiement', 'Choisissez votre moyen de paiement');
      [['TWINT', 1], ['Apple Pay', 0], ['Google Pay', 0], ['Carte', 0]].forEach((c, i) => {
        const x = 40 + (i % 2) * 290, y = 290 + Math.floor(i / 2) * 150;
        rr(x, y, 270, 124, 20, c[1] ? INK : TILE); txt(c[0], x + 135, y + 74, 32, c[1] ? '#fff' : INK, 800, 'center');
      });
      txt('Approchez votre téléphone', 320, 700, 32, INK, 700, 'center');
      txt('ou votre carte du lecteur', 320, 744, 32, INK, 700, 'center');
      sctx.save(); sctx.translate(320, 850); sctx.strokeStyle = TEAL; sctx.lineWidth = 8; sctx.lineCap = 'round';
      for (let i = 1; i <= 3; i++) { sctx.beginPath(); sctx.arc(-40, 0, i * 26, -0.7, 0.7); sctx.stroke(); }
      sctx.restore();
      footer('Total', 'CHF —');
    },
    function sent() {
      header('Merci !', 'Votre commande part en cuisine');
      rr(120, 300, 400, 400, 200, '#d9ecea');
      sctx.strokeStyle = TEAL; sctx.lineWidth = 26; sctx.lineCap = 'round'; sctx.lineJoin = 'round';
      sctx.beginPath(); sctx.moveTo(220, 505); sctx.lineTo(295, 580); sctx.lineTo(430, 420); sctx.stroke();
      txt('Commande n° 42', 320, 800, 52, INK, 800, 'center');
      txt('Prenez votre ticket', 320, 856, 30, MUTE, 500, 'center');
      footer('Ticket imprimé', '✓');
    }
  ];
  // chapter -> screen
  const CH_SCREEN = [0, 1, 2, 3, 4, 5, 0, 0];
  let lastScreen = -1;
  function drawScreen(i) {
    if (i === lastScreen) return; lastScreen = i;
    sctx.save(); SCREENS[i](); sctx.restore(); scrTex.needsUpdate = true;
  }

  // ---------- Keyframes: one per chapter ----------
  // cam: camera position, tgt: look-at, ry: kiosk rotation, ex: explode amount
  const K = [
    { cam: [1.7, 1.15, 3.0], tgt: [0, 0.86, 0], ry: -0.6, ex: 0 },
    { cam: [0.55, 1.36, 2.75], tgt: [0, 1.17, 0], ry: -0.15, ex: 0 },
    { cam: [0.15, 1.36, 2.6], tgt: [0, 1.19, 0], ry: 0.12, ex: 0 },
    { cam: [-0.4, 1.34, 2.7], tgt: [0, 1.17, 0], ry: 0.2, ex: 0 },
    { cam: [1.1, 1.16, 2.25], tgt: [0.07, 1.06, 0], ry: 0.55, ex: 0 },
    { cam: [-0.75, 1.0, 1.85], tgt: [-0.05, 0.9, 0], ry: -0.35, ex: 0 },
    { cam: [2.1, 1.15, 3.3], tgt: [0, 0.92, 0], ry: 0.6, ex: 1 },
    { cam: [0.0, 1.0, 3.6], tgt: [0, 0.86, 0], ry: 0, ex: 0 }
  ];
  const BG = [['#0f1414','#1d3533'],['#0f2f2d','#1f5652'],['#174744','#2c7a74'],['#7a3a17','#c0682c'],['#16120f','#3a2a20'],['#1c3a2b','#2f6a4c'],['#0f1414','#22302f'],['#6b4a14','#c98a2e']];
  const BGc = BG.map(pair => pair.map(h => new T.Color(h)));
  const cA = new T.Color(), cB = new T.Color();
  const specHTML = chapters.map(c => { const d = c.querySelector('dl'); return d ? d.innerHTML : ''; });
  let lastCh = -1;
  const v3 = (a) => new T.Vector3(a[0], a[1], a[2]);
  K.forEach(k => { k.camV = v3(k.cam); k.tgtV = v3(k.tgt); });
  const smooth = (x) => x * x * (3 - 2 * x);
  const curCam = K[0].camV.clone(), curTgt = K[0].tgtV.clone();
  let curRy = K[0].ry, curEx = 0, spin = 0;

  // ---------- Layout ----------
  let W = 1, H = 1, mobile = false;
  function resize() {
    W = stage.clientWidth; H = stage.clientHeight; mobile = W < 900;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    // Desktop: push the kiosk to the right half so text sits on the left
    if (mobile) camera.setViewOffset(W, H, 0, -H * 0.05, W, H); else camera.clearViewOffset();
    camera.fov = mobile ? 36 : 30;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize); resize();

  function progress() {
    const r = sec.getBoundingClientRect(), span = sec.offsetHeight - window.innerHeight;
    return Math.min(1, Math.max(0, -r.top / Math.max(1, span)));
  }

  const tmp = new T.Vector3();
  let visible = true;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; }, { rootMargin: '200px 0px' }).observe(sec);
  const clock = new T.Clock();

  function frame() {
    requestAnimationFrame(frame);
    if (!visible) return;
    const t = clock.getElapsedTime();
    const p = progress();
    const f = p * (N - 1);              // continuous chapter position
    const i0 = Math.min(N - 2, Math.floor(f)), a = smooth(Math.min(1, Math.max(0, (f - i0 - 0.25) / 0.5)));
    const A = K[i0], B = K[i0 + 1];
    // targets
    const camT = tmp.copy(A.camV).lerp(B.camV, a);
    if (mobile) { camT.x *= 1.55; camT.z *= 1.55; }
    curCam.lerp(camT, 0.09);
    curTgt.lerp(A.tgtV.clone().lerp(B.tgtV, a), 0.09);
    const ry = A.ry + (B.ry - A.ry) * a;
    const finale = Math.max(0, f - (N - 2)); // last chapter: slow turntable
    spin += (finale > 0.4 ? 0.0035 : 0) ; if (finale <= 0.4) spin *= 0.95;
    curRy += (ry + spin + Math.sin(t * 0.5) * 0.02 - curRy) * 0.08;
    const ex = A.ex + (B.ex - A.ex) * a; curEx += (ex - curEx) * 0.1;

    camera.position.copy(curCam); camera.lookAt(curTgt);
    kiosk.rotation.y = curRy;
    // exploded view
    parts.screen.position.y = 1.065 + curEx * 0.22;
    parts.side.position.set(0.25 + curEx * 0.2, 1.17 + curEx * 0.22, 0);
    parts.module.position.set(0, 0.97 + curEx * 0.1, 0.012 + curEx * 0.06);
    parts.base.position.y = -curEx * 0.08;

    // chapter-driven details
    const ch = Math.round(f);
    drawScreen(CH_SCREEN[ch]);
    const payOn = Math.max(0, 1 - Math.abs(f - 4) * 1.6);
    ledMat.color.setRGB(1, 0.23 + 0.2 * Math.sin(t * 6) * payOn, 0.18);
    warm.intensity = payOn * 1.4;
    tsMat.color.set(payOn > 0.3 ? 0x2f8582 : 0x1d2a2b);
    const tk = Math.min(1, Math.max(0, (f - 4.55) / 0.4));
    ticket.scale.y = Math.max(0.001, tk);
    ticketPivot.rotation.x = -0.35 * tk;
    ticket.visible = f > 4.5 && f < 6.4;

    renderer.render(scene, camera);

    // Stage colours, interpolated between chapters
    cA.copy(BGc[i0][0]).lerp(BGc[i0 + 1][0], a); cB.copy(BGc[i0][1]).lerp(BGc[i0 + 1][1], a);
    sec.style.setProperty('--b3bg', '#' + cA.getHexString()); sec.style.setProperty('--b3hi', '#' + cB.getHexString());
    // HTML: chapters, step list, specs, clock, labels
    chapters.forEach((c, k) => {
      const d = Math.abs(f - k), o = Math.max(0, 1 - d * 2.2);
      c.style.opacity = o.toFixed(3);
      c.style.transform = 'translateY(' + ((k - f) * 30).toFixed(1) + 'px)';
      c.style.visibility = o > 0.01 ? 'visible' : 'hidden';
    });
    if (ch !== lastCh) {
      lastCh = ch;
      steps.forEach(li => li.classList.toggle('on', +li.dataset.k === ch));
      if (specEl) specEl.innerHTML = specHTML[ch];
      cta.classList.toggle('on', ch === N - 1);
    }
    const mins = Math.min(30, Math.round(20 + p * 10));
    clockEl.textContent = '12:' + mins;
    hint.style.opacity = p > 0.02 ? 0 : 1;
    const sr = sec.getBoundingClientRect(); const hc = document.getElementById('clock'); if (hc) hc.style.visibility = (sr.top < 60 && sr.bottom > 60) ? 'hidden' : '';
    const exOn = curEx > 0.6;
    labels.forEach((l, k) => {
      if (!exOn) { l.classList.remove('on'); return; }
      const w = anchorParents[k].localToWorld(anchorLocal[k].clone()).project(camera);
      const left = k === 2 ? -(l.offsetWidth + 32) : 0;
      l.style.transform = 'translate(' + ((w.x * 0.5 + 0.5) * W + left).toFixed(1) + 'px,' + ((-w.y * 0.5 + 0.5) * H).toFixed(1) + 'px)';
      l.classList.toggle('l', k === 2);
      l.classList.add('on');
    });
  }
  drawScreen(0);
  requestAnimationFrame(frame);

  // Click a step to jump to its chapter
  steps.forEach(li => li.addEventListener('click', () => {
    const k = +li.dataset.k, span = sec.offsetHeight - window.innerHeight;
    window.scrollTo({ top: sec.getBoundingClientRect().top + window.scrollY + span * k / (N - 1), behavior: 'smooth' });
  }));
}

// ---------- small textures ----------
function radialTex(stops) {
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
  const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
  stops.forEach((s, i) => g.addColorStop(i / (stops.length - 1), s));
  x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
}
function logoTex() {
  const c = document.createElement('canvas'); c.width = 400; c.height = 80; const x = c.getContext('2d');
  x.fillStyle = '#2a3233'; x.font = '800 54px Archivo, Inter, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText("o'javana", 200, 42);
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8; return t;
}
function nfcTex() {
  const c = document.createElement('canvas'); c.width = 200; c.height = 120; const x = c.getContext('2d');
  x.strokeStyle = '#e8eeee'; x.lineWidth = 9; x.lineCap = 'round';
  for (let i = 1; i <= 4; i++) { x.beginPath(); x.arc(60, 60, i * 20, -0.75, 0.75); x.stroke(); }
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
}
function ticketTexture() {
  const c = document.createElement('canvas'); c.width = 240; c.height = 416; const x = c.getContext('2d');
  x.fillStyle = '#fbfbf8'; x.fillRect(0, 0, 240, 416);
  x.fillStyle = '#222'; x.textAlign = 'center';
  x.font = '700 26px Inter, sans-serif'; x.fillText("o'javana", 120, 300);
  x.font = '800 70px Inter, sans-serif'; x.fillText('42', 120, 220);
  x.font = '500 20px Inter, sans-serif'; x.fillText('Commande n°', 120, 140);
  x.fillRect(30, 330, 180, 2); x.fillRect(30, 350, 140, 2); x.fillRect(30, 370, 160, 2);
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.flipY = true; return t;
}
