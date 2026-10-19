import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { openStore } from "../lib/store.js";
import { runTool, buildSession, snapshot, MISSIONS, levelOf } from "../lib/tutor.js";

const mk = () => openStore(path.join(fs.mkdtempSync(path.join(os.tmpdir(), "pv-")), "s.json"));
const T = Date.parse("2026-10-18T12:00:00");

test("add_card crea tarjeta, da XP y evita duplicados", () => {
  const s = mk();
  const r = runTool(s, "add_card", { front: "你好", back: "hola", pinyin: "nǐ hǎo" }, { lang: "zh" }, T);
  assert.equal(r.fx.xp, 5);
  assert.equal(s.data.cards.length, 1);
  assert.equal(runTool(s, "add_card", { front: "你好", back: "hola" }, { lang: "zh" }, T).output.duplicate, true);
  assert.equal(s.data.cards.length, 1);
});

test("mission_progress: objetivos, repetición y misión completa con insignia", () => {
  const s = mk();
  const ctx = { lang: "en", mission: "cafe", done: [] };
  const a = runTool(s, "mission_progress", { objective_index: 0 }, ctx, T);
  assert.equal(a.fx.xp, 30);
  assert.equal(runTool(s, "mission_progress", { objective_index: 0 }, { ...ctx, done: [0] }, T).output.already, true);
  const last = runTool(s, "mission_progress", { objective_index: 2 }, { ...ctx, done: [0, 1] }, T);
  assert.equal(last.fx.missionDone, true);
  assert.equal(last.fx.xp, 90);
  assert.equal(s.data.profile.badges.length, 1);
  assert.equal(runTool(s, "mission_progress", { objective_index: 9 }, ctx, T).output.ok, false);
});

test("racha: días consecutivos suman y un salto la reinicia", () => {
  const s = mk();
  runTool(s, "add_card", { front: "a", back: "b" }, { lang: "en" }, T);
  runTool(s, "add_card", { front: "c", back: "d" }, { lang: "en" }, T + 86_400_000);
  assert.equal(s.data.profile.streak, 2);
  runTool(s, "add_card", { front: "e", back: "f" }, { lang: "en" }, T + 4 * 86_400_000);
  assert.equal(s.data.profile.streak, 1);
});

test("los errores registrados alimentan las instrucciones del siguiente tutor", () => {
  const s = mk();
  runTool(s, "log_error", { category: "tone", said: "mā (madre)", better: "mǎ (caballo)" }, { lang: "zh" }, T);
  const cfg = buildSession({ lang: "zh", level: "HSK1", missionId: "cafe", state: s.data, model: "m", voice: "marin", now: T });
  assert.match(cfg.instructions, /tone/);
  assert.match(cfg.instructions, /tonos/);
  assert.equal(cfg.tools.length, 3);
  assert.equal(cfg.audio.output.voice, "marin");
});

test("buildSession valida idioma y nivel", () => {
  const s = mk();
  assert.throws(() => buildSession({ lang: "xx", level: "A1", missionId: "cafe", state: s.data, model: "m", voice: "v" }));
  const cfg = buildSession({ lang: "en", level: "ZZ", missionId: "nope", state: s.data, model: "m", voice: "v", now: T });
  assert.match(cfg.instructions, /A1/);
});

test("snapshot, misiones y nivel", () => {
  const s = mk();
  const snap = snapshot(s, "en", T);
  assert.equal(snap.level, 1);
  assert.equal(snap.quests.length, 3);
  assert.ok(MISSIONS.every((m) => m.id && m.title));
  assert.equal(levelOf(300), 3);
});
