// <brain-anatomy> — anatomically shaped 3D brain.
// Cerebral hemispheres with frontal/temporal/occipital lobes, deep sulci + Sylvian fissure,
// baked crevice shading (vertex colours), cerebellum with folia, brain stem, and
// glowing neurotransmitter molecules. Rotates with the mouse; drag to spin.
import * as THREE from 'https://esm.sh/three@0.160.0';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/* ---------- cerebral hemisphere ---------- */
function hemisphere(sign) {
  // closed ellipsoid per hemisphere (no open medial wall to see through)
  const geo = new THREE.SphereGeometry(1, 200, 150);
  const pos = geo.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const n = new THREE.Vector3();
  const base = new THREE.Color(0xF2E6E4);

  for (let i = 0; i < pos.count; i++) {
    n.fromBufferAttribute(pos, i).normalize();
    const nx = n.x, ny = n.y, nz = n.z, ax = Math.abs(nx);

    // temporal lobe: lateral bulge low and slightly forward
    const temporal = Math.exp(-Math.pow((ny + 0.40) / 0.40, 2) - Math.pow((nz - 0.08) / 0.72, 2)) * Math.pow(ax, 0.55);

    let px = nx * (0.50 + 0.07 * temporal);
    let py = ny * (0.85 + 0.05 * temporal);
    let pz = nz * 1.30;

    // frontal pole tapers, occipital pole flattens
    const front = Math.max(0, pz), back = Math.max(0, -pz);
    px *= 1 - 0.17 * front * front;
    py *= 1 - 0.12 * front * front;
    px *= 1 - 0.06 * back * back;
    pz *= 1 - 0.05 * back * back;

    // inferior surface is flat (it rests on the skull base)
    if (py < -0.46) py = -0.46 + (py + 0.46) * 0.5;
    // superior surface slightly domed toward the vertex
    if (py > 0.62) py = 0.62 + (py - 0.62) * 0.86;

    // ---- sulci: narrow deep valleys from ridged sine layers
    const s1 = Math.sin(9.6 * nz + 3.1 * ny + 2.2 * Math.sin(5.2 * nx) + 1.3 * Math.sin(8.0 * ny));
    const s2 = Math.sin(13.5 * ny - 4.0 * nz + 2.6 * Math.sin(6.5 * nz + 1.2));
    const s3 = Math.sin(19.0 * nx * sign + 5.0 * ny + 1.8 * Math.sin(9.0 * nz));
    const ridged = Math.pow(Math.abs(s1), 0.45) * 0.5
                 + Math.pow(Math.abs(s2), 0.5) * 0.3
                 + Math.pow(Math.abs(s3), 0.6) * 0.2;
    let depth = (ridged - 0.6) * 0.062;

    // ---- Sylvian fissure: deep lateral groove above the temporal lobe
    const line = -0.16 + 0.10 * pz - 0.30 * pz * pz;
    const sylv = Math.exp(-Math.pow((py - line) / 0.055, 2)) * Math.pow(ax, 0.45);
    depth -= 0.085 * sylv;

    // ---- central sulcus: one prominent oblique groove
    const cs = Math.exp(-Math.pow((pz - (0.10 - 0.55 * py)) / 0.06, 2)) * clamp(py + 0.2, 0, 1);
    depth -= 0.05 * cs;

    const len = Math.hypot(px, py, pz) || 1;
    px += (px / len) * depth;
    py += (py / len) * depth;
    pz += (pz / len) * depth;
    px += sign * 0.34;

    pos.setXYZ(i, px, py, pz);

    // baked crevice shading — deeper = darker (cheap AO)
    const shade = clamp(0.5 + (depth + 0.03) * 9.5, 0.32, 1);
    col[i * 3] = base.r * shade;
    col[i * 3 + 1] = base.g * shade;
    col[i * 3 + 2] = base.b * shade;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  return geo;
}

/* ---------- cerebellum ---------- */
function cerebellum() {
  const geo = new THREE.SphereGeometry(1, 120, 90);
  const pos = geo.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const n = new THREE.Vector3();
  const base = new THREE.Color(0xE3D2CF);
  for (let i = 0; i < pos.count; i++) {
    n.fromBufferAttribute(pos, i).normalize();
    // folia: fine horizontal banding
    const folia = Math.pow(Math.abs(Math.sin(60 * n.y + 4 * n.z)), 0.5) - 0.62;
    const d = folia * 0.008;
    let px = n.x * 0.36, py = n.y * 0.24, pz = n.z * 0.32;
    // vermis: shallow midline groove
    const vermis = Math.exp(-Math.pow(px / 0.06, 2)) * 0.022;
    if (py > 0.16) py = 0.16 + (py - 0.16) * 0.5;      // flat top, tucked under the cortex
    px *= 1 - 0.25 * Math.max(0, n.z) * Math.max(0, n.z);
    const len = Math.hypot(px, py, pz) || 1;
    pos.setXYZ(i, px + (px / len) * (d - vermis), py + (py / len) * (d - vermis), pz + (pz / len) * (d - vermis));
    const shade = clamp(0.5 + (d + 0.004) * 32, 0.38, 1);
    col[i * 3] = base.r * shade; col[i * 3 + 1] = base.g * shade; col[i * 3 + 2] = base.b * shade;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  return geo;
}

function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,0.95)');
  g.addColorStop(0.25, 'rgba(150,205,255,0.5)');
  g.addColorStop(1, 'rgba(120,180,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

const CHEMICALS = [
  { name: 'Dopamine', color: 0x7FE3FF },
  { name: 'Serotonin', color: 0xFFFFFF },
  { name: 'GABA', color: 0x1E88E5 },
  { name: 'Acetylcholine', color: 0x9FC7FF },
];

class BrainAnatomy extends HTMLElement {
  connectedCallback() {
    if (this._init) return;
    this._init = true;
    this.style.display = 'block';
    this.style.position = this.style.position || 'relative';
    if (!this.style.width) this.style.width = '100%';
    if (!this.style.height) this.style.height = '100%';
    this.style.overflow = 'hidden';
    this.style.touchAction = 'pan-y';
    this._m = { x: 0, y: 0, tx: 0, ty: 0 };
    this._spin = -1.15;   // accumulated rotation (starts at a 3/4 lateral view)
    this._vel = 0;        // drag inertia
    this._drag = null;
    this.boot();
  }

  boot() {
    const w = this.clientWidth || 800, h = this.clientHeight || 600;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(1.6, window.devicePixelRatio || 1));
    renderer.setSize(w, h, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    Object.assign(renderer.domElement.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'block' });
    this.appendChild(renderer.domElement);
    this.renderer = renderer;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, w / h, 0.1, 100);
    camera.position.set(0, 0.12, 6.2);
    camera.lookAt(0, -0.04, 0);
    this.scene = scene; this.camera = camera;

    const group = new THREE.Group();
    group.rotation.y = this._spin;
    group.rotation.x = -0.06;
    group.scale.setScalar(0.94);
    scene.add(group);
    this.group = group;

    const tissue = new THREE.MeshPhysicalMaterial({
      vertexColors: true, color: 0xFFFFFF, roughness: 0.78, metalness: 0,
      clearcoat: 0.22, clearcoatRoughness: 0.7,
      sheen: 0.55, sheenRoughness: 0.8, sheenColor: new THREE.Color(0xFFD3CB),
      side: THREE.FrontSide,
    });
    const stemMat = new THREE.MeshPhysicalMaterial({ color: 0xE6D6D2, roughness: 0.6, clearcoat: 0.35 });

    const left = new THREE.Mesh(hemisphere(-1), tissue); left.name = 'CerebrumLeft';
    const right = new THREE.Mesh(hemisphere(1), tissue); right.name = 'CerebrumRight';
    group.add(left, right);

    const cb = new THREE.Mesh(cerebellum(1), tissue);
    cb.position.set(0, -0.42, -0.66); cb.rotation.set(0.16, 0, 0); cb.name = 'Cerebellum';
    group.add(cb);

    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.10, 0.34, 32, 4), stemMat);
    stem.position.set(0, -0.58, -0.3); stem.rotation.x = -0.18; stem.name = 'BrainStem';
    group.add(stem);
    const pons = new THREE.Mesh(new THREE.SphereGeometry(0.13, 32, 24), stemMat);
    pons.position.set(0, -0.44, -0.3); pons.scale.set(1, 0.9, 0.85); pons.name = 'Pons';
    group.add(pons);

    // ---- neurotransmitters
    const glow = glowTexture();
    this.molecules = [];
    const chem = new THREE.Group();
    group.add(chem);
    for (let i = 0; i < CHEMICALS.length * 2; i++) {
      const c = CHEMICALS[i % CHEMICALS.length];
      const pts = [];
      const seed = Math.random() * Math.PI * 2;
      for (let k = 0; k < 5; k++) {
        const a = seed + k * 1.2 + Math.random() * 0.4;
        const rad = 0.72 + Math.random() * 0.55;
        pts.push(new THREE.Vector3(Math.cos(a) * rad, Math.sin(a * 0.8) * 0.5 + (Math.random() - 0.5) * 0.2, Math.sin(a) * rad * 1.2));
      }
      const curve = new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.5);
      chem.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(curve.getPoints(150)),
        new THREE.LineBasicMaterial({ color: c.color, transparent: true, opacity: 0.14 })
      ));
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 10), new THREE.MeshBasicMaterial({ color: c.color }));
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: c.color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.8 }));
      halo.scale.set(0.3, 0.3, 1);
      core.add(halo); core.name = c.name;
      chem.add(core);
      this.molecules.push({ core, halo, curve, t: Math.random(), v: 0.05 + Math.random() * 0.07 });
    }

    // ---- lighting: soft studio
    scene.add(new THREE.AmbientLight(0xFFF2EC, 0.45));
    scene.add(new THREE.HemisphereLight(0xFFF6F2, 0x241C24, 0.7));
    const key = new THREE.DirectionalLight(0xFFF3EC, 2.6); key.position.set(1.7, 2.2, 2.6); scene.add(key);
    const fill = new THREE.DirectionalLight(0xBFD9FF, 0.65); fill.position.set(-2.4, 0.5, 1.2); scene.add(fill);
    const rim = new THREE.DirectionalLight(0x2E7DFF, 1.45); rim.position.set(-1.6, 0.9, -2.4); scene.add(rim);
    const under = new THREE.DirectionalLight(0x9FC7FF, 0.4); under.position.set(0.4, -2, -0.8); scene.add(under);

    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: 0x0A66FF, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.42 }));
    halo.scale.set(5.6, 5.6, 1); halo.position.z = -2;
    scene.add(halo);

    // ---- interaction: hover follows the mouse, drag spins with inertia
    this._onMove = (e) => {
      this._m.tx = (e.clientX / window.innerWidth) * 2 - 1;
      this._m.ty = (e.clientY / window.innerHeight) * 2 - 1;
      if (this._drag) {
        this._vel += (e.clientX - this._drag.x) * 0.00035;
        this._pitch = clamp((this._pitch || 0) + (e.clientY - this._drag.y) * 0.0022, -0.5, 0.5);
        this._drag = { x: e.clientX, y: e.clientY };
      }
    };
    window.addEventListener('pointermove', this._onMove, { passive: true });
    this.addEventListener('pointerdown', (e) => { this._drag = { x: e.clientX, y: e.clientY }; this.style.cursor = 'grabbing'; });
    window.addEventListener('pointerup', () => { this._drag = null; this.style.cursor = ''; });

    this._ro = new ResizeObserver(() => this.resize());
    this._ro.observe(this);
    this._io = new IntersectionObserver((es) => { this._visible = es[0].isIntersecting; }, { rootMargin: '140px' });
    this._io.observe(this);
    this._visible = true;

    this.clock = new THREE.Clock();
    this.loop = this.loop.bind(this);
    this._raf = requestAnimationFrame(this.loop);
    this._fallbackTimer = setInterval(() => {
      if (performance.now() - (this._lastFrame || 0) > 300) this.loop();
    }, 120);
    this.setAttribute('data-ready', '');
  }

  resize() {
    const w = this.clientWidth, h = this.clientHeight;
    if (!w || !h || !this.renderer) return;
    if (this._lw === w && this._lh === h) return;
    this._lw = w; this._lh = h;
    cancelAnimationFrame(this._rz);
    this._rz = requestAnimationFrame(() => {
      this.renderer.setSize(w, h, false);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    });
  }

  loop() {
    this._raf = requestAnimationFrame(this.loop);
    this._lastFrame = performance.now();
    if (!this._visible) return;
    const dt = Math.min(0.05, this.clock.getDelta());
    const t = this.clock.elapsedTime;

    this._m.x += (this._m.tx - this._m.x) * Math.min(1, dt * 2.6);
    this._m.y += (this._m.ty - this._m.y) * Math.min(1, dt * 2.6);

    // mouse-led rotation + gentle drift + drag inertia
    this._spin += (this._drag ? 0 : dt * 0.10) + this._vel;
    this._vel *= 0.93;
    const targetY = this._spin + this._m.x * 0.55;
    this.group.rotation.y += (targetY - this.group.rotation.y) * Math.min(1, dt * 4);
    const targetX = (this._pitch || 0) - this._m.y * 0.24 - 0.06 + Math.sin(t * 0.3) * 0.02;
    this.group.rotation.x += (targetX - this.group.rotation.x) * Math.min(1, dt * 4);
    this.group.position.y = Math.sin(t * 0.5) * 0.035;
    this.group.scale.setScalar(0.94 * (1 + Math.sin(t * 1.0) * 0.008));

    for (const m of this.molecules) {
      m.t = (m.t + dt * m.v) % 1;
      m.curve.getPointAt(m.t, m.core.position);
      const p = 0.85 + 0.35 * Math.sin(t * 4 + m.t * 12);
      m.halo.scale.set(0.3 * p, 0.3 * p, 1);
    }

    this.renderer.render(this.scene, this.camera);
  }

  disconnectedCallback() {
    cancelAnimationFrame(this._raf);
    clearInterval(this._fallbackTimer);
    window.removeEventListener('pointermove', this._onMove);
    this._ro && this._ro.disconnect();
    this._io && this._io.disconnect();
    this.renderer && this.renderer.dispose();
  }
}

if (!customElements.get('brain-anatomy')) customElements.define('brain-anatomy', BrainAnatomy);
