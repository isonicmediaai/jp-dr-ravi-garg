// <brain-canvas> — particle brain / neural network field. Self-contained web component.
// Attributes: mode="hero|viz|ambient", density, hue-shift
import * as THREE from 'https://esm.sh/three@0.160.0';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

const SHAPES = [
  { c: [-0.5, 0.05, 0], r: [0.92, 0.82, 1.16] },   // left hemisphere
  { c: [0.5, 0.05, 0], r: [0.92, 0.82, 1.16] },    // right hemisphere
  { c: [-0.34, -0.6, -1.0], r: [0.5, 0.34, 0.42] },// cerebellum L
  { c: [0.34, -0.6, -1.0], r: [0.5, 0.34, 0.42] }, // cerebellum R
  { c: [0, -0.78, -0.42], r: [0.19, 0.52, 0.24] }, // stem
];

function field(x, y, z) {
  let m = 1e9;
  for (const s of SHAPES) {
    const dx = (x - s.c[0]) / s.r[0], dy = (y - s.c[1]) / s.r[1], dz = (z - s.c[2]) / s.r[2];
    const v = Math.sqrt(dx * dx + dy * dy + dz * dz) - 1;
    m = Math.min(m, v);
  }
  return m;
}

function sampleBrain(count) {
  const pts = new Float32Array(count * 3);
  let i = 0, guard = 0;
  while (i < count && guard < count * 400) {
    guard++;
    const x = (Math.random() * 2 - 1) * 1.65;
    const y = (Math.random() * 2 - 1) * 1.25;
    const z = (Math.random() * 2 - 1) * 1.6;
    const v = field(x, y, z);
    if (Math.abs(v) > 0.022) continue;
    // longitudinal fissure
    if (Math.abs(x) < 0.055 && y > -0.25 && z > -0.7) continue;
    // sulci grooves
    const g = Math.sin(5.6 * y + 3.1 * z + 1.4 * Math.sin(3.0 * x)) * Math.sin(4.2 * x + 2.0 * z);
    if (Math.abs(g) < 0.15) continue;
    // fold displacement along radial direction
    const len = Math.sqrt(x * x + y * y + z * z) || 1;
    const d = 0.035 * Math.sin(7.0 * x) * Math.sin(6.0 * y) * Math.sin(5.0 * z);
    pts[i * 3] = x + (x / len) * d;
    pts[i * 3 + 1] = y + (y / len) * d;
    pts[i * 3 + 2] = z + (z / len) * d;
    i++;
  }
  return pts.subarray(0, i * 3);
}

const VERT = `
attribute vec3 aScatter;
attribute float aSeed;
attribute float aSize;
uniform float uExplode;
uniform float uTime;
uniform float uPix;
varying float vGlow;
varying float vDepth;
void main(){
  float breathe = 1.0 + 0.018 * sin(uTime * 1.1 + aSeed * 6.28);
  vec3 base = position * breathe;
  vec3 scat = aScatter + vec3(
    sin(uTime * 0.6 + aSeed * 12.0),
    cos(uTime * 0.5 + aSeed * 9.0),
    sin(uTime * 0.45 + aSeed * 15.0)
  ) * 0.12 * uExplode;
  float e = uExplode * (0.55 + 0.9 * aSeed);
  vec3 p = mix(base, scat, clamp(e, 0.0, 1.0));
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  // travelling signal wave along the anterior-posterior axis
  float wave = sin(uTime * 2.0 - p.z * 3.2 + aSeed * 2.0);
  vGlow = smoothstep(0.86, 1.0, wave);
  vDepth = clamp((mv.z + 3.0) / 3.0, 0.0, 1.0);
  gl_PointSize = aSize * uPix * (1.0 + vGlow * 1.5) * (8.2 / -mv.z);
  gl_Position = projectionMatrix * mv;
}`;

const FRAG = `
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uOpacity;
varying float vGlow;
varying float vDepth;
void main(){
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv);
  if (d > 0.5) discard;
  float a = smoothstep(0.5, 0.06, d);
  vec3 col = mix(uColorA, uColorB, vGlow * 0.9);
  float alpha = a * uOpacity * (0.55 + 0.45 * vDepth) * (0.75 + 0.55 * vGlow);
  gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
}`;

class BrainCanvas extends HTMLElement {
  connectedCallback() {
    if (this._init) return;
    this._init = true;
    this.style.display = 'block';
    this.style.position = this.style.position || 'relative';
    if (!this.style.height) this.style.height = '100%';
    if (!this.style.width) this.style.width = '100%';
    this.style.overflow = 'hidden';
    this.style.pointerEvents = 'none';
    this.mode = this.getAttribute('mode') || 'hero';
    this._progress = 0;
    this._explode = 0;
    this._mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    this.boot();
  }

  boot() {
    const w = this.clientWidth || 800, h = this.clientHeight || 600;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(1.6, window.devicePixelRatio || 1));
    renderer.setSize(w, h, false);
    const cv = renderer.domElement;
    Object.assign(cv.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'block' });
    this.appendChild(cv);
    this.renderer = renderer;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, w / h, 0.1, 100);
    camera.position.set(0, 0.05, 4.9);
    this.scene = scene; this.camera = camera;

    const group = new THREE.Group();
    scene.add(group);
    this.group = group;

    const dense = parseFloat(this.getAttribute('density') || '1');
    const target = Math.round((window.innerWidth < 720 ? 11000 : 22000) * dense);
    const pos = sampleBrain(target);
    const n = pos.length / 3;

    const scatter = new Float32Array(n * 3);
    const seed = new Float32Array(n);
    const size = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const r = 2.6 + Math.random() * 3.2;
      const th = Math.random() * Math.PI * 2, ph = Math.acos(Math.random() * 2 - 1);
      scatter[i * 3] = r * Math.sin(ph) * Math.cos(th) * 1.25;
      scatter[i * 3 + 1] = r * Math.cos(ph) * 0.7;
      scatter[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th) * 0.9;
      seed[i] = Math.random();
      size[i] = 0.95 + Math.random() * 1.2;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aScatter', new THREE.BufferAttribute(scatter, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));

    this.uniforms = {
      uExplode: { value: 0 },
      uTime: { value: 0 },
      uPix: { value: Math.min(1.6, window.devicePixelRatio || 1) },
      uColorA: { value: new THREE.Color('#0A66FF') },
      uColorB: { value: new THREE.Color('#7FC4FF') },
      uOpacity: { value: parseFloat(this.getAttribute('opacity') || '0.85') },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms, vertexShader: VERT, fragmentShader: FRAG,
      transparent: true, depthWrite: false, blending: THREE.NormalBlending,
    });
    this.points = new THREE.Points(geo, mat);
    group.add(this.points);

    // ---- neural web: line segments between nearby surface points
    const sub = [];
    for (let i = 0; i < n; i += Math.max(1, Math.floor(n / 900))) sub.push([pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]]);
    const segs = [];
    for (let i = 0; i < sub.length && segs.length < 1100; i++) {
      for (let j = i + 1; j < sub.length; j++) {
        const a = sub[i], b = sub[j];
        const dx = a[0] - b[0], dy = a[1] - b[1], dz = a[2] - b[2];
        if (dx * dx + dy * dy + dz * dz < 0.055) { segs.push([a, b]); break; }
      }
    }
    const lp = new Float32Array(segs.length * 6);
    segs.forEach((s, k) => {
      lp[k * 6] = s[0][0]; lp[k * 6 + 1] = s[0][1]; lp[k * 6 + 2] = s[0][2];
      lp[k * 6 + 3] = s[1][0]; lp[k * 6 + 4] = s[1][1]; lp[k * 6 + 5] = s[1][2];
    });
    const lgeo = new THREE.BufferGeometry();
    lgeo.setAttribute('position', new THREE.BufferAttribute(lp, 3));
    this.lines = new THREE.LineSegments(lgeo, new THREE.LineBasicMaterial({
      color: new THREE.Color('#1E88E5'), transparent: true, opacity: 0.24, depthWrite: false,
    }));
    group.add(this.lines);

    // ---- travelling synapse signals
    this.signals = [];
    const SN = 54;
    const sp = new Float32Array(SN * 3);
    const ss = new Float32Array(SN);
    const sz = new Float32Array(SN);
    for (let i = 0; i < SN; i++) {
      const seg = segs[Math.floor(Math.random() * segs.length)] || [[0, 0, 0], [0, 0, 0]];
      this.signals.push({ a: seg[0], b: seg[1], t: Math.random(), v: 0.25 + Math.random() * 0.7, segs });
      ss[i] = Math.random(); sz[i] = 2.6 + Math.random() * 2.4;
    }
    const sgeo = new THREE.BufferGeometry();
    sgeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    sgeo.setAttribute('aScatter', new THREE.BufferAttribute(new Float32Array(SN * 3), 3));
    sgeo.setAttribute('aSeed', new THREE.BufferAttribute(ss, 1));
    sgeo.setAttribute('aSize', new THREE.BufferAttribute(sz, 1));
    this.sigPoints = new THREE.Points(sgeo, new THREE.ShaderMaterial({
      uniforms: {
        uExplode: { value: 0 }, uTime: this.uniforms.uTime, uPix: this.uniforms.uPix,
        uColorA: { value: new THREE.Color('#0A66FF') }, uColorB: { value: new THREE.Color('#0A66FF') },
        uOpacity: { value: 0.95 },
      },
      vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false,
    }));
    group.add(this.sigPoints);

    // ---- ambient glow plate behind the brain
    const cvs = document.createElement('canvas');
    cvs.width = cvs.height = 256;
    const ctx = cvs.getContext('2d');
    const grd = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    grd.addColorStop(0, 'rgba(150,200,255,0.30)');
    grd.addColorStop(0.45, 'rgba(190,222,255,0.12)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, 256, 256);
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(cvs), transparent: true, depthWrite: false, opacity: 0.9,
    }));
    spr.scale.set(4.6, 4.6, 1); spr.position.z = -1.6;
    scene.add(spr);
    this.glow = spr;

    // ---- listeners
    this._onMove = (e) => {
      this._mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
      this._mouse.ty = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', this._onMove, { passive: true });
    this._ro = new ResizeObserver(() => this.resize());
    this._ro.observe(this);
    this._io = new IntersectionObserver((es) => { this._visible = es[0].isIntersecting; }, { rootMargin: '120px' });
    this._io.observe(this);
    this._visible = true;

    this.clock = new THREE.Clock();
    this.loop = this.loop.bind(this);
    this._raf = requestAnimationFrame(this.loop);
    // some embedded/previews pause rAF; keep painting at a low rate so the canvas is never blank
    this._fallbackTimer = setInterval(() => {
      if (performance.now() - (this._lastFrame || 0) > 300) this.loop();
    }, 120);
    this.setAttribute('data-ready', '');
  }

  resize() {
    const w = this.clientWidth, h = this.clientHeight;
    if (!w || !h || !this.renderer) return;
    if (this._lastW === w && this._lastH === h) return;
    this._lastW = w; this._lastH = h;
    cancelAnimationFrame(this._rzRaf);
    this._rzRaf = requestAnimationFrame(() => {
      this.renderer.setSize(w, h, false);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    });
  }

  scrollProgress() {
    const r = this.getBoundingClientRect();
    const vh = window.innerHeight;
    if (this.mode === 'hero') return clamp(-r.top / Math.max(1, vh * 0.9), 0, 1);
    // viz / ambient: 0 entering → 1 leaving
    return clamp((vh - r.top) / Math.max(1, vh + r.height), 0, 1);
  }

  loop() {
    this._raf = requestAnimationFrame(this.loop);
    this._lastFrame = performance.now();
    if (!this._visible) return;
    const dt = Math.min(0.05, this.clock.getDelta());
    const t = this.clock.elapsedTime;
    this.uniforms.uTime.value = t;

    const p = this.scrollProgress();
    let targetExplode = 0;
    if (this.mode === 'hero') targetExplode = Math.pow(p, 1.35) * 1.0;
    else if (this.mode === 'viz') targetExplode = Math.pow(Math.sin(clamp(p, 0, 1) * Math.PI), 1.4);
    else targetExplode = 0;
    this._explode += (targetExplode - this._explode) * Math.min(1, dt * 3.2);
    this.uniforms.uExplode.value = this._explode;
    this.sigPoints.material.uniforms.uExplode.value = this._explode;
    this.lines.material.opacity = 0.24 * (1 - this._explode) + 0.02;
    this.glow.material.opacity = 0.9 * (1 - this._explode * 0.6);

    this._mouse.x += (this._mouse.tx - this._mouse.x) * Math.min(1, dt * 2.4);
    this._mouse.y += (this._mouse.ty - this._mouse.y) * Math.min(1, dt * 2.4);

    this.group.rotation.y += dt * 0.12;
    this.group.rotation.x = -this._mouse.y * 0.22 + 0.06 + Math.sin(t * 0.4) * 0.03 + (this.mode === 'viz' ? p * 0.3 : 0);
    this.group.position.y = Math.sin(t * 0.6) * 0.06;
    this.group.position.x = this._mouse.x * 0.14;

    this.camera.position.z = 4.9 - this._explode * 0.7 + (this.mode === 'viz' ? -p * 0.5 : 0);
    this.camera.lookAt(0, 0, 0);

    // signals
    const arr = this.sigPoints.geometry.attributes.position.array;
    for (let i = 0; i < this.signals.length; i++) {
      const s = this.signals[i];
      s.t += dt * s.v;
      if (s.t > 1) {
        s.t = 0;
        const seg = s.segs[Math.floor(Math.random() * s.segs.length)];
        if (seg) { s.a = seg[0]; s.b = seg[1]; }
      }
      const e = s.t;
      arr[i * 3] = s.a[0] + (s.b[0] - s.a[0]) * e;
      arr[i * 3 + 1] = s.a[1] + (s.b[1] - s.a[1]) * e;
      arr[i * 3 + 2] = s.a[2] + (s.b[2] - s.a[2]) * e;
    }
    this.sigPoints.geometry.attributes.position.needsUpdate = true;

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

if (!customElements.get('brain-canvas')) customElements.define('brain-canvas', BrainCanvas);
