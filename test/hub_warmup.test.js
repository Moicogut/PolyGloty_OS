import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { openStore } from "../lib/store.js";
import { getStudentHubStatus, generateWarmup, completeWarmup } from "../lib/hubService.js";

test("getStudentHubStatus devuelve métricas y retos por usuario", () => {
  const tmpFile = path.join(process.cwd(), "data", `test_hub_${Date.now()}.json`);
  const store = openStore(tmpFile);
  store.data.profile.xp = 140;
  store.data.profile.streak = 4;
  store.data.profile.credits = 12;
  store.data.competencies = { grammar: 80, vocabulary: 75, fluency: 70, comprehension: 85 };

  const status = getStudentHubStatus({ state: store, lang: "en", user: { id: "user_test", email: "test@polyglot.com" } });

  assert.equal(status.user.id, "user_test");
  assert.equal(status.user.credits, 12);
  assert.equal(status.user.streak, 4);
  assert.equal(status.radar.grammar, 80);
  assert.ok(status.challenges.length >= 4);
  assert.ok(status.motivationalQuote.includes("4 días"));
  assert.ok(status.nextLesson);
  assert.equal(status.nextLesson.creditsValue, 2);

  // Limpieza
  try { fs.unlinkSync(tmpFile); } catch {}
});

test("generateWarmup entrega 3 micro-retos pedagógicos", () => {
  const tmpFile = path.join(process.cwd(), "data", `test_warmup_${Date.now()}.json`);
  const store = openStore(tmpFile);

  const warmup = generateWarmup({ state: store, lang: "en", level: "A1", lessonId: "cafe" });

  assert.equal(warmup.ok, true);
  assert.equal(warmup.questions.length, 3);
  assert.ok(warmup.questions[0].options.length >= 2);
  assert.ok(warmup.questions[0].explanation);
  assert.ok(warmup.questions[0].speak);

  // Limpieza
  try { fs.unlinkSync(tmpFile); } catch {}
});

test("completeWarmup acredita +10 XP y marca warmupDone", () => {
  const tmpFile = path.join(process.cwd(), "data", `test_warmup_done_${Date.now()}.json`);
  const store = openStore(tmpFile);
  store.data.profile.xp = 50;

  const res = completeWarmup({ state: store });

  assert.equal(res.ok, true);
  assert.equal(res.xpAwarded, 10);
  assert.equal(res.newTotalXp, 60);
  assert.equal(res.warmupDone, true);
  assert.equal(store.data.daily.warmupDone, true);

  // Limpieza
  try { fs.unlinkSync(tmpFile); } catch {}
});
