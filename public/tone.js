// Análisis de tonos del mandarín: seguimiento de tono fundamental (YIN),
// segmentación en sílabas y comparación con contornos modelo.
// Módulo isomórfico: funciona en el navegador y en Node (para pruebas).

const TARGET_SR = 16000;

export function downsample(x, sr, target = TARGET_SR) {
  const f = Math.max(1, Math.floor(sr / target));
  if (f === 1) return { x, sr };
  const n = Math.floor(x.length / f);
  const y = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let k = 0; k < f; k++) s += x[i * f + k];
    y[i] = s / f;
  }
  return { x: y, sr: sr / f };
}

// YIN sobre una ventana; devuelve f0 en Hz o 0 si no hay sonoridad.
export function yin(buf, sr, { fmin = 70, fmax = 400, thr = 0.15 } = {}) {
  const tauMin = Math.floor(sr / fmax);
  const tauMax = Math.min(Math.ceil(sr / fmin), (buf.length >> 1) - 1);
  const W = buf.length - tauMax;
  if (W <= 0 || tauMin < 2) return 0;
  const d = new Float32Array(tauMax + 1);
  for (let tau = 1; tau <= tauMax; tau++) {
    let s = 0;
    for (let j = 0; j < W; j++) { const v = buf[j] - buf[j + tau]; s += v * v; }
    d[tau] = s;
  }
  const cm = new Float32Array(tauMax + 1);
  cm[0] = 1;
  let run = 0;
  for (let tau = 1; tau <= tauMax; tau++) {
    run += d[tau];
    cm[tau] = run > 0 ? (d[tau] * tau) / run : 1;
  }
  let tau = -1;
  for (let t = tauMin; t <= tauMax; t++) {
    if (cm[t] < thr) {
      while (t + 1 <= tauMax && cm[t + 1] < cm[t]) t++;
      tau = t;
      break;
    }
  }
  if (tau < 0) return 0;
  // interpolación parabólica
  const a = cm[tau - 1], b = cm[tau], c = cm[Math.min(tau + 1, tauMax)];
  const den = a - 2 * b + c;
  const shift = den !== 0 ? (a - c) / (2 * den) : 0;
  return sr / (tau + shift);
}

// Pista de tono: arreglos por trama de f0 (Hz, 0 = sin sonoridad) y rms.
export function pitchTrack(x0, sr0, { frame = 0.05, hop = 0.01, fmin = 70, fmax = 400, thr = 0.15 } = {}) {
  const { x, sr } = downsample(x0, sr0);
  const N = Math.round(frame * sr), H = Math.round(hop * sr);
  const f0 = [], rms = [];
  for (let s = 0; s + N <= x.length; s += H) {
    const w = x.subarray(s, s + N);
    let e = 0;
    for (let i = 0; i < N; i++) e += w[i] * w[i];
    rms.push(Math.sqrt(e / N));
    f0.push(0);
  }
  const maxRms = Math.max(0, ...rms);
  const gate = Math.max(0.004, 0.08 * maxRms);
  for (let k = 0, s = 0; k < rms.length; k++, s += H) {
    if (rms[k] >= gate) f0[k] = yin(x.subarray(s, s + N), sr, { fmin, fmax, thr });
  }
  return { f0, rms, hop: hop };
}

const median = (a) => {
  const s = [...a].sort((p, q) => p - q);
  return s.length ? s[s.length >> 1] : 0;
};

// Segmentos sonoros contiguos (se puentean huecos cortos).
function voicedSegments(f0, gapMax = 3, minLen = 8) {
  const segs = [];
  let start = -1, last = -1;
  for (let i = 0; i < f0.length; i++) {
    if (f0[i] > 0) {
      if (start < 0) start = i;
      else if (i - last > gapMax + 1) { segs.push([start, last]); start = i; }
      last = i;
    }
  }
  if (start >= 0) segs.push([start, last]);
  return segs.filter(([a, b]) => b - a + 1 >= minLen);
}

// Ajusta los segmentos al número esperado de sílabas.
function fitSegments(segs, n, rms) {
  segs = segs.map((s) => [...s]);
  while (segs.length > n) {
    let bi = 0, bg = Infinity;
    for (let i = 0; i < segs.length - 1; i++) {
      const g = segs[i + 1][0] - segs[i][1];
      if (g < bg) { bg = g; bi = i; }
    }
    segs.splice(bi, 2, [segs[bi][0], segs[bi + 1][1]]);
  }
  while (segs.length < n) {
    let li = 0, ll = 0;
    segs.forEach(([a, b], i) => { if (b - a > ll) { ll = b - a; li = i; } });
    const [a, b] = segs[li];
    if (b - a + 1 < 16) return null;
    const lo = a + Math.floor(0.3 * (b - a)), hi = a + Math.ceil(0.7 * (b - a));
    let m = lo;
    for (let i = lo; i <= hi; i++) if (rms[i] < rms[m]) m = i;
    segs.splice(li, 1, [a, m], [m + 1, b]);
  }
  return segs;
}

const lerpResample = (arr, n) => {
  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    const p = (i * (arr.length - 1)) / (n - 1), a = Math.floor(p), b = Math.min(arr.length - 1, a + 1);
    out[i] = arr[a] + (arr[b] - arr[a]) * (p - a);
  }
  return out;
};

// Contornos modelo en semitonos (se les resta la media). 12 puntos.
const PTS = 12;
const centered = (f) => {
  const v = Array.from({ length: PTS }, (_, i) => f(i / (PTS - 1)));
  const m = v.reduce((s, q) => s + q, 0) / PTS;
  return v.map((q) => q - m);
};
export const TEMPLATES = {
  1: centered(() => 0),
  2: centered((u) => -3.5 + 7 * u),
  3: centered((u) => (u < 0.4 ? -1.5 - 2.5 * (u / 0.4) : -4 + 6 * ((u - 0.4) / 0.6))),
  "3h": centered((u) => -1 - 2 * u), // tercer tono "a medias" (no final): bajo y ligeramente descendente
  4: centered((u) => 4 - 8 * u),
  5: centered(() => 0),
};

const rmse = (a, b) => Math.sqrt(a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0) / a.length);
const sim = (r) => Math.max(0, Math.min(100, Math.round(100 * (1 - r / 3.5))));

// Extrae el contorno (semitonos, media cero) de un segmento.
function contourOf(f0, [a, b], ref) {
  const trim = Math.floor((b - a + 1) * 0.1);
  const seg = f0.slice(a + trim, b - trim + 1);
  let st = seg.map((v) => (v > 0 ? 12 * Math.log2(v / ref) : NaN));
  // corrige saltos de octava respecto del punto sonoro previo
  let prev = NaN;
  st = st.map((v) => {
    if (Number.isNaN(v)) return v;
    if (!Number.isNaN(prev)) {
      while (v - prev > 6) v -= 12;
      while (v - prev < -6) v += 12;
    }
    prev = v;
    return v;
  });
  const known = st.map((v, i) => [i, v]).filter(([, v]) => !Number.isNaN(v));
  if (known.length < 4) return null;
  const filled = st.map((v, i) => {
    if (!Number.isNaN(v)) return v;
    const l = [...known].reverse().find(([k]) => k < i), r = known.find(([k]) => k > i);
    if (l && r) return l[1] + ((r[1] - l[1]) * (i - l[0])) / (r[0] - l[0]);
    return (l || r)[1];
  });
  const sm = filled.map((_, i) => {
    const w = filled.slice(Math.max(0, i - 1), i + 2);
    return w.reduce((s, q) => s + q, 0) / w.length;
  });
  const rs = lerpResample(sm, PTS);
  const m = rs.reduce((s, q) => s + q, 0) / PTS;
  return rs.map((q) => q - m);
}

// Tonos esperados a partir de pinyin con marcas (nǐ hǎo) o números (ni3 hao3).
// Aplica la regla 3+3 → 2+3 y 不 + tono 4 → bú.
export function parseTones(pinyin) {
  const marks = { "\u0304": 1, "\u0301": 2, "\u030C": 3, "\u0300": 4 };
  const syl = pinyin.trim().split(/[\s'’-]+/).filter(Boolean);
  const tones = syl.map((s) => {
    const dig = s.match(/[1-5]$/);
    if (dig) return Number(dig[0]);
    for (const ch of s.normalize("NFD")) if (marks[ch]) return marks[ch];
    return 5;
  });
  for (let i = 0; i < tones.length - 1; i++) if (tones[i] === 3 && tones[i + 1] === 3) tones[i] = 2;
  syl.forEach((s, i) => {
    if (s.normalize("NFC").toLowerCase().startsWith("bu") && tones[i] === 4 && tones[i + 1] === 4) tones[i] = 2;
  });
  return { syllables: syl, tones };
}

// Analiza una grabación. expected: arreglo de tonos (1–5), uno por sílaba.
export function analyze(samples, sr, expected) {
  const n = expected.length;
  const { f0, rms } = pitchTrack(samples, sr);
  const voiced = f0.filter((v) => v > 0);
  if (voiced.length < 8) return { ok: false, reason: "No se detectó voz suficiente. Habla más cerca del micrófono." };
  const ref = median(voiced);
  const segs = fitSegments(voicedSegments(f0), n, rms);
  if (!segs || segs.length !== n) return { ok: false, reason: `No pude separar ${n} sílaba(s). Pronuncia con una pausa breve entre sílabas.` };
  const syllables = segs.map((seg, i) => {
    const c = contourOf(f0, seg, ref);
    const e = expected[i];
    if (!c) return { expected: e, heard: null, score: 0, pass: false, contour: null, template: TEMPLATES[e] };
    const tplKey = e === 3 && i < n - 1 ? "3h" : e;
    const cand = [1, 2, 3, 4].map((t) => [t, rmse(c, TEMPLATES[t === 3 && i < n - 1 ? "3h" : t])]);
    cand.sort((p, q) => p[1] - q[1]);
    const heard = cand[0][0];
    const score = e === 5 ? sim(Math.max(0, rmse(c, TEMPLATES[5]) - 1)) : sim(rmse(c, TEMPLATES[tplKey]));
    return {
      expected: e, heard: e === 5 ? 5 : heard, score,
      pass: e === 5 ? score >= 60 : heard === e,
      contour: c, template: TEMPLATES[tplKey],
    };
  });
  const overall = Math.round(syllables.reduce((s, q) => s + q.score, 0) / n);
  return { ok: true, overall, syllables, f0, hop: 0.01 };
}
