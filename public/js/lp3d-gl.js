// Low-poly 3D met de grafische kaart (WebGL), zonder bibliotheek. Gebruikt de modellen van Lp3D.
// Licht: een warme hoofdlamp linksboven, koel neonlicht van rechts, licht van de lucht en een glanzend randje.
// Elk model krijgt een donkere omlijning (de achterkant iets groter getekend) en een zachte schaduw op de grond.
// Lp3DGL.teken(canvas, model, o) tekent live op een WebGL-canvas, Lp3DGL.bak(model, b, h, o) geeft een vaste tekening.
const Lp3DGL = (() => {
  const VS = `
attribute vec3 p; attribute vec3 n; attribute vec3 c; attribute vec2 e;
uniform mat3 R; uniform vec4 P; uniform float lijn;
varying vec3 vN; varying vec3 vC; varying vec2 vE; varying float vY;
void main() {
  vec3 q = R * (p + n * lijn);
  vN = R * n; vC = c; vE = e; vY = p.y;
  gl_Position = vec4(q.x * P.x + P.z, q.y * P.y + P.w, -q.z * 0.03, 1.0);
}`;
  const FS = `
precision mediump float;
varying vec3 vN; varying vec3 vC; varying vec2 vE; varying float vY;
uniform vec3 neon; uniform float aoH; uniform vec4 lijnKleur;
void main() {
  if (lijnKleur.a > 0.0) { gl_FragColor = lijnKleur; return; }
  vec3 N = normalize(vN);
  vec3 c = pow(vC, vec3(2.2));
  if (vE.x > 0.0) { gl_FragColor = vec4(pow(c * (1.0 + 0.4 * vE.x) + 0.08, vec3(1.0 / 2.2)), 1.0); return; }
  vec3 L1 = normalize(vec3(-0.55, 0.75, 0.65));
  vec3 L2 = normalize(vec3(0.8, 0.15, 0.2));
  vec3 hemi = mix(vec3(0.03, 0.03, 0.07), vec3(0.2, 0.23, 0.34), N.y * 0.5 + 0.5);
  float d1 = max(dot(N, L1), 0.0);
  float d2 = max(dot(N, L2), 0.0);
  vec3 kleur = c * (hemi + d1 * vec3(1.05, 0.98, 0.9) * 1.5 + d2 * pow(neon, vec3(2.2)) * 0.45);
  float gl = mix(0.18, 0.9, vE.y);
  float spec = pow(max(dot(N, normalize(L1 + vec3(0.0, 0.0, 1.0))), 0.0), mix(18.0, 60.0, vE.y)) * gl;
  float rim = pow(1.0 - max(N.z, 0.0), 3.0) * 0.55;
  float ao = mix(0.55, 1.0, smoothstep(0.0, aoH, vY));
  kleur = kleur * ao + spec * vec3(1.0, 0.97, 0.9) + rim * pow(neon, vec3(2.2));
  gl_FragColor = vec4(pow(kleur, vec3(1.0 / 2.2)), 1.0);
}`;
  // Zachte schaduw op de grond en gloed van lampjes: punten met een zachte rand.
  const VS2 = `
attribute vec3 p; attribute vec4 c; attribute float r;
uniform mat3 R; uniform vec4 P; uniform float px;
varying vec4 vC;
void main() {
  vec3 q = R * p;
  vC = c;
  gl_PointSize = r * px;
  gl_Position = vec4(q.x * P.x + P.z, q.y * P.y + P.w, -q.z * 0.03 - 0.02, 1.0);
}`;
  const FS2 = `
precision mediump float;
varying vec4 vC;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  if (d > 1.0) discard;
  gl_FragColor = vec4(vC.rgb, vC.a * pow(1.0 - d, 2.0));
}`;

  const staat = new WeakMap();
  function maakGl(canvas) {
    let s = staat.get(canvas);
    if (s) return s;
    const gl = canvas.getContext('webgl', { antialias: true, alpha: true, premultipliedAlpha: false, preserveDrawingBuffer: true });
    if (!gl) return null;
    const prog = (vs, fs) => {
      const p = gl.createProgram();
      for (const [t, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) {
        const sh = gl.createShader(t);
        gl.shaderSource(sh, src);
        gl.compileShader(sh);
        if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
        gl.attachShader(p, sh);
      }
      gl.linkProgram(p);
      return p;
    };
    s = { gl, p1: prog(VS, FS), p2: prog(VS2, FS2), modellen: new WeakMap() };
    staat.set(canvas, s);
    return s;
  }

  const lin = v => v / 255;
  // De buffers van een model: elk vlakje apart (scherpe facetten), plus gladde normalen voor de omlijning.
  function buffers(s, m) {
    let b = s.modellen.get(m);
    if (b) return b;
    const { gl } = s;
    const glad = m.v.map(() => [0, 0, 0]);
    const fn = m.f.map(f => {
      const [A, B, C] = f.i.map(i => m.v[i]);
      const u = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], v = [C[0] - A[0], C[1] - A[1], C[2] - A[2]];
      const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
      const l = Math.hypot(...n) || 1;
      for (const i of f.i) for (let k = 0; k < 3; k++) glad[i][k] += n[k];
      return n.map(x => x / l);
    });
    for (const g of glad) { const l = Math.hypot(...g) || 1; for (let k = 0; k < 3; k++) g[k] /= l; }
    const vlak = [], rand = [];
    m.f.forEach((f, j) => {
      for (const i of f.i) {
        const p = m.v[i];
        vlak.push(p[0], p[1], p[2], ...fn[j], lin(f.kleur[0]), lin(f.kleur[1]), lin(f.kleur[2]), f.licht ? 1 : 0, f.metaal || 0);
        if (f.lijn) rand.push(p[0], p[1], p[2], ...glad[i], 0, 0, 0, 0, 0);
      }
    });
    const maak = arr => { const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arr), gl.STATIC_DRAW); return buf; };
    const punten = [];
    let minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9;
    for (const p of m.v) { minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]); minZ = Math.min(minZ, p[2]); maxZ = Math.max(maxZ, p[2]); }
    const breed = Math.min(maxX - minX, 6) * 0.9;
    punten.push(0, 0.01, (minZ + maxZ) / 4, 0.02, 0.03, 0.08, 0.55, breed);
    for (const g of m.gloed) punten.push(g.p[0], g.p[1], g.p[2], lin(g.kleur[0]), lin(g.kleur[1]), lin(g.kleur[2]), 0.55, g.r * 2);
    b = { vlak: maak(vlak), nVlak: vlak.length / 11, rand: maak(rand), nRand: rand.length / 11, punten: maak(punten), nPunten: punten.length / 8, hoog: Math.max(...m.v.map(p => p[1])) };
    s.modellen.set(m, b);
    return b;
  }

  function attrib(gl, prog, naam, n, stap, off) {
    const a = gl.getAttribLocation(prog, naam);
    if (a < 0) return;
    gl.enableVertexAttribArray(a);
    gl.vertexAttribPointer(a, n, gl.FLOAT, false, stap * 4, off * 4);
  }

  // o.draai, o.kantel: hoe je kijkt. o.schaal: pixels per eenheid. (o.x, o.y): waar de voeten staan, in pixels.
  // o.neon: kleur van het randlicht. o.lijn: dikte van de omlijning in pixels.
  function teken(canvas, m, o = {}) {
    const s = maakGl(canvas);
    if (!s) return false;
    const { gl } = s;
    const b = buffers(s, m);
    const W = canvas.width, H = canvas.height;
    gl.viewport(0, 0, W, H);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    const cy = Math.cos(o.draai || 0), sy = Math.sin(o.draai || 0);
    const cp = Math.cos(o.kantel ?? 0.2), sp = Math.sin(o.kantel ?? 0.2);
    // Kolom per kolom (WebGL): eerst draaien rond y, dan kantelen rond x.
    const R = [cy, sy * sp, -sy * cp, 0, cp, sp, sy, -cy * sp, cy * cp];
    const sc = o.schaal || 20;
    const P = [(2 * sc) / W, (2 * sc) / H, (2 * (o.x ?? W / 2)) / W - 1, 1 - (2 * (o.y ?? H * 0.92)) / H];
    const neon = (o.neon || '#4cc9ff').match(/\w\w/g).map(h => parseInt(h, 16) / 255);

    // Schaduw op de grond.
    gl.useProgram(s.p2);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.disable(gl.DEPTH_TEST);
    gl.uniformMatrix3fv(gl.getUniformLocation(s.p2, 'R'), false, R);
    gl.uniform4fv(gl.getUniformLocation(s.p2, 'P'), P);
    gl.uniform1f(gl.getUniformLocation(s.p2, 'px'), sc);
    gl.bindBuffer(gl.ARRAY_BUFFER, b.punten);
    attrib(gl, s.p2, 'p', 3, 8, 0);
    attrib(gl, s.p2, 'c', 4, 8, 3);
    attrib(gl, s.p2, 'r', 1, 8, 7);
    gl.drawArrays(gl.POINTS, 0, 1);

    // Het model: eerst de omlijning (achterkant, iets groter), dan de vlakjes.
    gl.useProgram(s.p1);
    gl.disable(gl.BLEND);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    const u = n => gl.getUniformLocation(s.p1, n);
    gl.uniformMatrix3fv(u('R'), false, R);
    gl.uniform4fv(u('P'), P);
    gl.uniform3fv(u('neon'), neon);
    gl.uniform1f(u('aoH'), b.hoog * 0.25);
    const lijn = (o.lijn ?? 2) / sc;
    if (lijn > 0) {
      gl.cullFace(gl.FRONT);
      gl.uniform1f(u('lijn'), lijn);
      gl.uniform4fv(u('lijnKleur'), [0.03, 0.05, 0.11, 1]);
      gl.bindBuffer(gl.ARRAY_BUFFER, b.rand);
      attrib(gl, s.p1, 'p', 3, 11, 0);
      attrib(gl, s.p1, 'n', 3, 11, 3);
      attrib(gl, s.p1, 'c', 3, 11, 6);
      attrib(gl, s.p1, 'e', 2, 11, 9);
      gl.drawArrays(gl.TRIANGLES, 0, b.nRand);
    }
    gl.cullFace(gl.BACK);
    gl.uniform1f(u('lijn'), 0);
    gl.uniform4fv(u('lijnKleur'), [0, 0, 0, 0]);
    gl.bindBuffer(gl.ARRAY_BUFFER, b.vlak);
    attrib(gl, s.p1, 'p', 3, 11, 0);
    attrib(gl, s.p1, 'n', 3, 11, 3);
    attrib(gl, s.p1, 'c', 3, 11, 6);
    attrib(gl, s.p1, 'e', 2, 11, 9);
    gl.drawArrays(gl.TRIANGLES, 0, b.nVlak);
    gl.disable(gl.CULL_FACE);

    // Gloed van lampjes en kristallen (achter het lijf verstopt door de diepte).
    if (b.nPunten > 1) {
      gl.useProgram(s.p2);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
      gl.depthMask(false);
      gl.bindBuffer(gl.ARRAY_BUFFER, b.punten);
      attrib(gl, s.p2, 'p', 3, 8, 0);
      attrib(gl, s.p2, 'c', 4, 8, 3);
      attrib(gl, s.p2, 'r', 1, 8, 7);
      gl.drawArrays(gl.POINTS, 1, b.nPunten - 1);
      gl.depthMask(true);
    }
    gl.disable(gl.BLEND);
    return true;
  }

  // Een vaste tekening (voor de spellen): één gedeeld WebGL-canvas, gekopieerd naar een gewoon canvas.
  let werk = null;
  function bak(m, b, h, o = {}) {
    if (!werk) werk = document.createElement('canvas');
    werk.width = b;
    werk.height = h;
    const hoog = o.hoog || 10;
    const sc = (h * 0.86) / hoog;
    const c = document.createElement('canvas');
    c.width = b;
    c.height = h;
    if (teken(werk, m, { draai: 0.4, ...o, schaal: sc, x: b / 2, y: h * 0.95, lijn: o.lijn ?? Math.max(1.2, h / 110) })) c.getContext('2d').drawImage(werk, 0, 0);
    return c;
  }

  return { teken, bak };
})();
if (typeof window !== 'undefined') window.Lp3DGL = Lp3DGL;
