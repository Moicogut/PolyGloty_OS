import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = http.createServer();
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address();
      srv.close((err) => (err ? reject(err) : resolve(port)));
    });
  });
}

async function start(env) {
  // copia aislada del proyecto para no tocar data/state.json real
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pvsrv-"));
  fs.cpSync(root, dir, { recursive: true, filter: (s) => !s.includes("node_modules") && !s.endsWith("state.json") && !s.endsWith(".env") });
  const port = await getFreePort();
  const p = spawn("node", ["server.js"], { cwd: dir, env: { ...process.env, PORT: String(port), HOST: "127.0.0.1", NODE_ENV: "development", ...env }, stdio: "ignore" });
  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/state`);
      if (res.ok) break;
    } catch {
      await wait(100);
    }
  }
  return { base: `http://127.0.0.1:${port}`, host: `127.0.0.1:${port}`, stop: () => p.kill() };
}
const J = (base, p, body, headers = {}) => fetch(base + p, { method: "POST", headers: { "Content-Type": "application/json", Origin: base, ...headers }, body: JSON.stringify(body ?? {}) });

test("flujo completo: tarjetas, repaso, tonos, XP y misiones", async () => {
  const s = await start({ OPENAI_API_KEY: "" });
  try {
    let st = await (await fetch(`${s.base}/api/state?lang=zh`)).json();
    assert.equal(st.hasKey, false);
    assert.equal(st.missions.length >= 6, true);

    const t = await (await J(s.base, "/api/tool", { name: "add_card", args: { front: "你好", back: "hola", pinyin: "nǐ hǎo" }, lang: "zh", mission: "cafe", done: [] })).json();
    assert.equal(t.fx.xp, 5);

    const due = await (await fetch(`${s.base}/api/cards/due?lang=zh`)).json();
    assert.equal(due.length, 1);
    assert.equal(due[0].preview.length, 4);

    const g = await (await J(s.base, "/api/cards/grade", { id: due[0].id, grade: 2 })).json();
    assert.equal(g.card.interval, 1);
    assert.equal((await (await fetch(`${s.base}/api/cards/due`)).json()).length, 0);

    const d = await (await J(s.base, "/api/drill", { score: 92, text: "你好", expected: "nǐ hǎo", cardId: due[0].id })).json();
    assert.equal(d.xp, 20);
    assert.equal(d.suggestedGrade, 3);

    const m = await (await J(s.base, "/api/tool", { name: "mission_progress", args: { objective_index: 1 }, lang: "en", mission: "cafe", done: [0, 2] })).json();
    assert.equal(m.fx.missionDone, true);

    st = await (await fetch(`${s.base}/api/state?lang=zh`)).json();
    assert.equal(st.xp, 5 + 3 + 20 + 30 + 60 + 0 + 0);
    assert.equal(st.badges.length, 1);
    assert.equal(st.streak, 1);
  } finally { s.stop(); }
});

test("seguridad: origen ajeno, ruta fuera de public y sin clave", async () => {
  const s = await start({ OPENAI_API_KEY: "" });
  try {
    assert.equal((await J(s.base, "/api/turn", {}, { Origin: "http://evil.example" })).status, 403);
    assert.equal((await J(s.base, "/api/turn", {}, { Origin: `http://${s.host}` })).status, 200);
    const r = await fetch(`${s.base}/..%2Fserver.js`);
    assert.ok([403, 404].includes(r.status));
    const x = await fetch(`${s.base}/api/session?lang=en`, { method: "POST", headers: { "Content-Type": "application/sdp", Origin: s.base }, body: "v=0" });
    assert.equal(x.status, 503);
    assert.equal((await fetch(s.base + "/")).status, 200);
    assert.equal((await fetch(s.base + "/tone.js")).status, 200);
  } finally { s.stop(); }
});

test("/api/session envía SDP y configuración de sesión a OpenAI (servidor simulado)", async () => {
  let seen = null;
  const mock = http.createServer(async (req, res) => {
    const chunks = []; for await (const c of req) chunks.push(c);
    seen = { url: req.url, auth: req.headers.authorization, ct: req.headers["content-type"], body: Buffer.concat(chunks).toString() };
    res.writeHead(201, { "Content-Type": "application/sdp" }); res.end("v=0\r\nanswer");
  });
  await new Promise((r) => mock.listen(0, "127.0.0.1", r));
  const s = await start({ OPENAI_API_KEY: "sk-test", OPENAI_BASE_URL: `http://127.0.0.1:${mock.address().port}`, REALTIME_MODEL: "modelo-x" });
  try {
    const r = await fetch(`${s.base}/api/session?lang=zh&level=HSK2&mission=cliente`, { method: "POST", headers: { "Content-Type": "application/sdp", Origin: s.base }, body: "v=0\r\noffer" });
    assert.equal(r.status, 200);
    assert.equal(await r.text(), "v=0\r\nanswer");
    assert.equal(seen.url, "/v1/realtime/calls");
    assert.equal(seen.auth, "Bearer sk-test");
    assert.match(seen.ct, /multipart\/form-data/);
    assert.match(seen.body, /name="sdp"/);
    assert.match(seen.body, /v=0\r\noffer/);
    assert.match(seen.body, /"model":"modelo-x"/);
    assert.match(seen.body, /"name":"mission_progress"/);
    assert.match(seen.body, /HSK2/);
  } finally { s.stop(); mock.close(); }
});

test("validación defensiva: rechaza payloads inválidos en endpoints", async () => {
  const s = await start({ OPENAI_API_KEY: "" });
  try {
    // /api/cards/grade con grade fuera de rango o tipo erróneo
    const r1 = await J(s.base, "/api/cards/grade", { id: "c1", grade: 99 });
    assert.equal(r1.status, 400);
    const j1 = await r1.json();
    assert.match(j1.error, /grade/);

    const r2 = await J(s.base, "/api/cards/grade", { id: "", grade: 2 });
    assert.equal(r2.status, 400);

    // /api/drill con score inválido o NaN
    const r3 = await J(s.base, "/api/drill", { score: "no-numero" });
    assert.equal(r3.status, 400);
    const j3 = await r3.json();
    assert.match(j3.error, /score/);

    // /api/tool con herramienta no permitida
    const r4 = await J(s.base, "/api/tool", { name: "herramienta_maliciosa" });
    assert.equal(r4.status, 400);
    const j4 = await r4.json();
    assert.match(j4.error, /Herramienta no permitida/);
  } finally { s.stop(); }
});

test("multi-tenancy: aislamiento de estado por usuario/tenant", async () => {
  const s = await start({ OPENAI_API_KEY: "" });
  try {
    const userA = { "x-user-id": "alumno_alpha" };
    const userB = { "x-user-id": "alumno_beta" };

    // Usuario A crea una tarjeta
    await J(s.base, "/api/tool", { name: "add_card", args: { front: "apple", back: "manzana" }, lang: "en" }, userA);

    // Usuario A debe ver su tarjeta
    const cardsA = await (await fetch(`${s.base}/api/cards?lang=en`, { headers: userA })).json();
    assert.equal(cardsA.length, 1);
    assert.equal(cardsA[0].front, "apple");

    // Usuario B NO debe ver la tarjeta de A
    const cardsB = await (await fetch(`${s.base}/api/cards?lang=en`, { headers: userB })).json();
    assert.equal(cardsB.length, 0);

    // Sumar turnos para B no altera los de A
    await J(s.base, "/api/turn", {}, userB);
    const stateA = await (await fetch(`${s.base}/api/state`, { headers: userA })).json();
    const stateB = await (await fetch(`${s.base}/api/state`, { headers: userB })).json();

    assert.equal(stateA.daily.turns, 0);
    assert.equal(stateB.daily.turns, 1);
    assert.equal(stateA.tenantId, "alumno_alpha");
    assert.equal(stateB.tenantId, "alumno_beta");
  } finally { s.stop(); }
});

test("rate limiting: bloquea solicitudes excesivas a /api/session con 429", async () => {
  // Configura un límite bajo de 2 solicitudes para probar el disparo del limiter
  const s = await start({ OPENAI_API_KEY: "sk-test", MAX_SESSIONS_PER_MIN: "2" });
  try {
    const postSession = () => fetch(`${s.base}/api/session?lang=en`, {
      method: "POST",
      headers: { "Content-Type": "application/sdp", Origin: s.base },
      body: "v=0",
    });

    const r1 = await postSession();
    const r2 = await postSession();
    const r3 = await postSession();

    // Las dos primeras pasan hacia OpenAI (o fallan por mock/red, pero no 429)
    assert.notEqual(r1.status, 429);
    assert.notEqual(r2.status, 429);

    // La tercera excede el límite y es rechazada inmediatamente con 429
    assert.equal(r3.status, 429);
    const body3 = await r3.json();
    assert.match(body3.error, /Límite de solicitudes/);
    assert.ok(r3.headers.has("retry-after"));
  } finally { s.stop(); }
});

test("GET /health responde 200 con ok: true sin tocar base de datos", async () => {
  const s = await start({});
  try {
    const res = await fetch(`${s.base}/health`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.ok, true);
    assert.equal(data.status, "ok");
    assert.equal(data.service, "polyglot-voice");
    assert.equal(typeof data.uptimeSeconds, "number");
  } finally { s.stop(); }
});



