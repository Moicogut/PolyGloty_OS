import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { openStore } from "../lib/store.js";
import {
  startProficiencySession,
  evaluatePhaseA,
  evaluateWrittenHeuristic,
  evaluateOralTurn,
  finalizeProficiencyAudit,
  verifyCertificate,
} from "../lib/proficiencyAuditor.js";

test("Proficiency Auditor: elegibilidad de Placement vs Exit Exam", () => {
  // Placement test siempre es accesible
  const placement = startProficiencySession({
    testType: "placement",
    lang: "en",
    userCredits: 0,
    proficiencyUnlocked: false,
  });
  assert.equal(placement.ok, true);
  assert.equal(placement.eligible, true);
  assert.equal(placement.testType, "placement");
  assert.ok(placement.phaseA.questions.length >= 6);

  // Exit Exam bloqueado con menos de 36 créditos
  const blockedExit = startProficiencySession({
    testType: "certification_exit",
    lang: "en",
    level: "A1",
    userCredits: 12,
    proficiencyUnlocked: false,
  });
  assert.equal(blockedExit.ok, false);
  assert.equal(blockedExit.eligible, false);
  assert.match(blockedExit.error, /36 créditos/);

  // Exit Exam permitido con 36 créditos o proficiencyUnlocked = true
  const allowedExit = startProficiencySession({
    testType: "certification_exit",
    lang: "en",
    level: "A1",
    userCredits: 36,
    proficiencyUnlocked: true,
  });
  assert.equal(allowedExit.ok, true);
  assert.equal(allowedExit.eligible, true);
  assert.equal(allowedExit.targetLevel, "A1");
  assert.ok(allowedExit.phaseA.questions.length >= 6);
});

test("Proficiency Auditor: Fase A - Evaluación de precisión estructural CAT Cloze", () => {
  // Simular respuestas correctas para preguntas A1 de Placement
  const evalResult = evaluatePhaseA({
    testType: "placement",
    lang: "en",
    answers: [0, 1, 2, 0, 1, 1], // Todas correctas según PLACEMENT_QUESTIONS.en
  });

  assert.equal(evalResult.totalQuestions, 6);
  assert.equal(evalResult.correctCount, 6);
  assert.equal(evalResult.phaseAScore, 100);
  assert.equal(evalResult.itemResults.length, 6);
  assert.equal(evalResult.itemResults[0].isCorrect, true);

  // Simular respuestas con fallos
  const partialResult = evaluatePhaseA({
    testType: "placement",
    lang: "en",
    answers: [0, 99, 2, 99, 1, 99], // 3 correctas de 6
  });
  assert.equal(partialResult.correctCount, 3);
  assert.equal(partialResult.phaseAScore, 50);
});

test("Proficiency Auditor: Fase B - Rúbrica CEFR para producción escrita", () => {
  // Texto modelo de calidad para A1
  const goodText = "Dear Reception, I am writing to confirm my arrival at 6:00 PM for room reservation. Could I please have a quiet room with a double bed? Also, is breakfast included in the room price? Thank you very much for your kind help.";
  const result = evaluateWrittenHeuristic(goodText, "A1", "en");

  assert.ok(result.wordCount >= 35);
  assert.ok(result.ttr >= 0.65, `TTR esperado >= 0.65, recibido: ${result.ttr}`);
  assert.ok(result.overallWrittenScore >= 75, `Score esperado >= 75, recibido: ${result.overallWrittenScore}`);
  assert.ok(result.grammarScore >= 70);

  // Texto deficiente / muy corto
  const badText = "hello i want coffee";
  const badResult = evaluateWrittenHeuristic(badText, "A1", "en");
  assert.ok(badResult.overallWrittenScore <= 50);
  assert.ok(badResult.errors.length > 0);
});

test("Proficiency Auditor: Fase C - Evaluación de turnos orales y métricas de fluidez", () => {
  const oralEval = evaluateOralTurn({
    questionId: "oral-a1-1",
    userTranscript: "Hello, my name is Alex. I am from Mexico City and I work as a graphic designer.",
    latencyMs: 950,
    audioDurationMs: 6000,
    level: "A1",
  });

  assert.ok(oralEval.wordCount >= 10);
  assert.ok(oralEval.fluencyScore >= 75);
  assert.ok(oralEval.turnScore >= 75);
  assert.match(oralEval.feedback, /fluida/i);
});

test("Proficiency Auditor: Consolidación, certificado SHA-256 y promoción de nivel", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "polyglot-audit-test-"));
  const storeFile = path.join(tmpDir, "test_state.json");
  const store = openStore(storeFile);
  store.data.profile = { level: "A1", credits: 36, proficiencyUnlocked: true };

  const finalResult = finalizeProficiencyAudit({
    sessionId: "test-sess-100",
    testType: "certification_exit",
    lang: "en",
    targetLevel: "A1",
    candidateName: "Carlos Alumno",
    userId: "usr-42",
    phaseAResult: { phaseAScore: 90 },
    phaseBResult: { overallWrittenScore: 85, grammarScore: 85, vocabularyScore: 85, cohesionScore: 85, wordCount: 50 },
    phaseCResult: { overallSpokenScore: 80, fluencyScore: 80, pragmaticScore: 80, turns: [] },
    writtenText: "Dear Reception, I am confirming my booking for tonight. Thank you.",
    store,
  });

  assert.equal(finalResult.ok, true);
  assert.equal(finalResult.passed, true);
  assert.ok(finalResult.overallScore >= 80);
  assert.equal(finalResult.promotedLevel, "A2", "Debe promoverse de A1 a A2");
  assert.ok(finalResult.certificate);
  assert.match(finalResult.certificate.code, /^POLY-A1-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  assert.ok(finalResult.certificate.verificationHash.length === 64);

  // Verificar persistencia en store
  assert.equal(store.data.profile.level, "A2");
  assert.equal(store.data.profile.credits, 0); // Créditos reseteados para el nuevo nivel
  assert.equal(store.data.proficiencyAudits.length, 1);
  assert.equal(store.data.profile.certificates.length, 1);

  // Verificar consulta pública de certificado
  const check = verifyCertificate(finalResult.certificate.code, store);
  assert.equal(check.ok, true);
  assert.equal(check.valid, true);
  assert.equal(check.certificate.candidateName, "Carlos Alumno");
  assert.equal(check.certificate.level, "A1");

  // Código inexistente
  const badCheck = verifyCertificate("POLY-FAKE-0000", store);
  assert.equal(badCheck.valid, false);

  fs.rmSync(tmpDir, { recursive: true, force: true });
});
