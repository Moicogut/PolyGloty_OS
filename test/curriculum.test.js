import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { openStore } from "../lib/store.js";
import {
  CURRICULUM_TREE,
  CURRICULUM_HANDBOOK,
  getCurriculumTreeStatus,
  getHandbookChapter,
  awardLessonCredits,
  TOTAL_LEVEL_CREDITS,
} from "../lib/curriculumData.js";

test("CURRICULUM_TREE define 36 créditos en 3 módulos de 12 créditos por nivel", () => {
  const enA1 = CURRICULUM_TREE.en.A1;
  assert.ok(enA1, "Debe existir nivel A1 para inglés");
  assert.equal(enA1.targetCredits, 36, "A1 debe requerir 36 créditos");
  assert.equal(enA1.modules.length, 3, "Debe tener 3 módulos");

  let totalCredits = 0;
  let totalLessons = 0;

  enA1.modules.forEach((mod, idx) => {
    assert.equal(mod.targetCredits, 12, `Módulo ${idx + 1} debe tener 12 créditos`);
    assert.equal(mod.lessons.length, 6, `Módulo ${idx + 1} debe contener 6 lecciones`);
    mod.lessons.forEach((l) => {
      assert.equal(l.credits, 2, "Cada lección debe otorgar 2 créditos");
      assert.ok(l.code, "Debe tener código canónico de lección");
      assert.ok(l.title, "Debe tener título");
      assert.ok(l.objectives.length >= 3, "Debe tener al menos 3 objetivos Can-Do");
      totalCredits += l.credits;
      totalLessons++;
    });
  });

  assert.equal(totalCredits, 36, "La suma total de créditos de A1 debe ser 36");
  assert.equal(totalLessons, 18, "El total de lecciones de A1 debe ser 18");
});

test("getHandbookChapter entrega la ficha oficial del Polyglot Curriculum Handbook con 5 dimensiones", () => {
  const chapter = getHandbookChapter("en", "A1", "cafe");
  assert.ok(chapter, "Debe devolver el capítulo del handbook");
  assert.equal(chapter.code, "EN-A1-M1-L1");
  assert.equal(chapter.credits, 2);

  // 1. Can-Do
  assert.ok(Array.isArray(chapter.canDoDescriptors), "Debe tener descriptores Can-Do");
  assert.ok(chapter.canDoDescriptors.length >= 3);

  // 2. Grammar Corpus y Mediación Contrastiva
  assert.ok(chapter.grammarCorpus, "Debe incluir corpus gramatical");
  assert.ok(chapter.grammarCorpus.formula, "Debe incluir fórmula");
  assert.ok(Array.isArray(chapter.grammarCorpus.contrast), "Debe incluir contrastes contrastivos");
  assert.ok(chapter.grammarCorpus.contrast.length >= 2, "Debe contrastar vicios fósiles típicos");

  // 3. Colocaciones y Fonética
  assert.ok(Array.isArray(chapter.collocations), "Debe tener colocaciones");
  assert.ok(chapter.collocations.length >= 6);
  assert.ok(chapter.collocations[0].ipa, "Debe incluir transcripción fonética IPA");
  assert.ok(chapter.collocations[0].speak, "Debe incluir frase de síntesis fonética");

  // 4. Diálogo Modelo Anotado
  assert.ok(chapter.dialogueModel, "Debe incluir diálogo modelo");
  assert.ok(chapter.dialogueModel.turns.length >= 4);
  assert.ok(chapter.dialogueModel.turns[0].note, "Debe incluir notas pragmáticas al margen");

  // 5. Tareas y Salida
  assert.ok(chapter.tasks.warmup && chapter.tasks.central && chapter.tasks.homework);
});

test("awardLessonCredits acredita +2 créditos, evita duplicidad y desbloquea suficiencia a los 36 créditos", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "polyglot-curriculum-test-"));
  const tmpFile = path.join(tmpDir, "state.json");
  const store = openStore(tmpFile);

  // 1. Acreditar primera lección
  const r1 = awardLessonCredits({
    state: store,
    lang: "en",
    level: "A1",
    moduleId: "m1",
    lessonId: "cafe",
    score: 88,
    completedObjectives: 3,
  });

  assert.equal(r1.ok, true);
  assert.equal(r1.creditsAwarded, 2, "Debe acreditar 2 créditos nuevos");
  assert.equal(r1.totalLevelCredits, 2);
  assert.equal(r1.isNewCompletion, true);
  assert.equal(r1.proficiencyUnlocked, false);
  assert.equal(store.data.profile.credits, 2);

  // 2. Idempotencia: Repetir la misma lección no debe otorgar créditos duplicados
  const r2 = awardLessonCredits({
    state: store,
    lang: "en",
    level: "A1",
    moduleId: "m1",
    lessonId: "cafe",
    score: 95, // Mejor puntuación
    completedObjectives: 3,
  });

  assert.equal(r2.creditsAwarded, 0, "No debe duplicar créditos en lección ya completada");
  assert.equal(r2.totalLevelCredits, 2);
  assert.equal(r2.isNewCompletion, false);
  assert.equal(store.data.profile.completedLessons.cafe.score, 95, "Debe actualizar la puntuación más alta");

  // 3. Simular acumulación hasta 34 créditos y completar la última para llegar a 36
  store.data.profile.credits = 34;
  const r3 = awardLessonCredits({
    state: store,
    lang: "en",
    level: "A1",
    moduleId: "m3",
    lessonId: "hito_m3",
    score: 92,
    completedObjectives: 3,
  });

  assert.equal(r3.creditsAwarded, 2);
  assert.equal(r3.totalLevelCredits, 36);
  assert.equal(r3.proficiencyUnlocked, true, "Al alcanzar 36 créditos debe desbloquear el examen de suficiencia");
  assert.equal(store.data.profile.proficiencyUnlocked, true);

  // 4. Verificar que getCurriculumTreeStatus refleja el estado real
  const treeStatus = getCurriculumTreeStatus({ state: store, lang: "en", level: "A1" });
  assert.equal(treeStatus.accumulatedCredits, 36);
  assert.equal(treeStatus.levelProgressPercent, 100);
  assert.equal(treeStatus.proficiencyUnlocked, true);

  // Limpieza
  fs.rmSync(tmpDir, { recursive: true, force: true });
});
