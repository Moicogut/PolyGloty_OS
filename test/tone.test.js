import test from "node:test";
import assert from "node:assert/strict";
import { yin, analyze, parseTones, TEMPLATES } from "../public/tone.js";

const SR = 16000;

// Sintetiza una sílaba: armónicos con f0 siguiendo un contorno en semitonos respecto de `base` Hz.
function syllable(tone, base, dur = 0.35, key = tone) {
  const n = Math.round(dur * SR), out = new Float32Array(n);
  const tpl = TEMPLATES[key];
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1), p = u * (tpl.length - 1), a = Math.floor(p), b = Math.min(tpl.length - 1, a + 1);
    const st = tpl[a] + (tpl[b] - tpl[a]) * (p - a);
    const f = base * 2 ** (st / 12);
    ph += (2 * Math.PI * f) / SR;
    let s = 0;
    for (let k = 1; k <= 5; k++) s += Math.sin(k * ph) / k;
    const env = Math.min(1, i / (0.03 * SR), (n - 1 - i) / (0.03 * SR));
    out[i] = 0.3 * s * env;
  }
  return out;
}
const silence = (d) => new Float32Array(Math.round(d * SR));
const concat = (...a) => { const o = new Float32Array(a.reduce((s, x) => s + x.length, 0)); let k = 0; for (const x of a) { o.set(x, k); k += x.length; } return o; };

test("YIN estima un tono puro de 200 Hz", () => {
  const x = new Float32Array(800).map((_, i) => Math.sin((2 * Math.PI * 200 * i) / SR));
  const f = yin(x, SR);
  assert.ok(Math.abs(f - 200) < 2, `f0=${f}`);
});

test("YIN devuelve 0 con silencio y con ruido", () => {
  assert.equal(yin(new Float32Array(800), SR), 0);
  const noise = new Float32Array(800).map(() => Math.random() * 2 - 1);
  assert.equal(yin(noise, SR), 0);
});

for (const base of [110, 220]) {
  for (const t of [1, 2, 3, 4]) {
    test(`clasifica tono ${t} aislado (voz ${base} Hz)`, () => {
      const r = analyze(syllable(t, base, 0.4), SR, [t]);
      assert.ok(r.ok, r.reason);
      assert.equal(r.syllables[0].heard, t);
      assert.ok(r.syllables[0].score >= 70, `score=${r.syllables[0].score}`);
    });
  }
}

test("detecta tono equivocado (esperado 2, pronunciado 4)", () => {
  const r = analyze(syllable(4, 150, 0.4), SR, [2]);
  assert.ok(r.ok);
  assert.equal(r.syllables[0].pass, false);
  assert.equal(r.syllables[0].heard, 4);
});

test("palabra de dos sílabas con pausa: 谢谢 (4+5) y 老师 (3+1)", () => {
  const w = concat(silence(0.1), syllable(4, 140, 0.3), silence(0.12), syllable(1, 140, 0.3), silence(0.1));
  const r = analyze(w, SR, [4, 1]);
  assert.ok(r.ok, r.reason);
  assert.deepEqual(r.syllables.map((s) => s.heard), [4, 1]);
  const w2 = concat(silence(0.1), syllable(3, 140, 0.3, "3h"), silence(0.12), syllable(1, 140, 0.3), silence(0.1));
  const r2 = analyze(w2, SR, [3, 1]);
  assert.ok(r2.ok, r2.reason);
  assert.equal(r2.syllables[0].pass, true);
});

test("dos sílabas continuas (sin pausa) se separan por mínimo de energía", () => {
  const a = syllable(2, 140, 0.3), b = syllable(4, 140, 0.3);
  const r = analyze(concat(silence(0.1), a, b, silence(0.1)), SR, [2, 4]);
  assert.ok(r.ok, r.reason);
  assert.deepEqual(r.syllables.map((s) => s.heard), [2, 4]);
});

test("rechaza silencio y sílabas insuficientes", () => {
  assert.equal(analyze(silence(1), SR, [1]).ok, false);
  const r = analyze(concat(silence(0.1), syllable(1, 140, 0.1), silence(0.1)), SR, [1, 1, 1]);
  assert.equal(r.ok, false);
});

test("funciona con 48 kHz (submuestreo)", () => {
  const x16 = syllable(2, 140, 0.4);
  const x48 = new Float32Array(x16.length * 3);
  for (let i = 0; i < x48.length; i++) x48[i] = x16[Math.floor(i / 3)];
  const r = analyze(x48, 48000, [2]);
  assert.ok(r.ok, r.reason);
  assert.equal(r.syllables[0].heard, 2);
});

test("parseTones: marcas, números y sandhi 3+3", () => {
  assert.deepEqual(parseTones("nǐ hǎo").tones, [2, 3]);
  assert.deepEqual(parseTones("ni3 hao3").tones, [2, 3]);
  assert.deepEqual(parseTones("xiè xie").tones, [4, 5]);
  assert.deepEqual(parseTones("zhōng guó").tones, [1, 2]);
  assert.deepEqual(parseTones("bù hǎo").tones, [4, 3]);
  assert.deepEqual(parseTones("bú shi").tones.length, 2);
});
