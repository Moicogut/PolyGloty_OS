import test from "node:test";
import assert from "node:assert/strict";
import {
  adaptMissionForLevel,
  LEVEL_RULES,
  buildPedagogicalSystemInstruction,
  repairAndGuaranteePedagogicalResponse,
  GEMINI_PEDAGOGICAL_SCHEMA
} from "../lib/pedagogicalAgent.js";

test("adaptMissionForLevel adapta la misión cliente para A1 sin sobrecarga cognitiva", () => {
  const baseMission = {
    id: "cliente",
    title: "Reunión con cliente",
    scene: "Eres un cliente internacional. El alumno presenta una propuesta.",
    objectives: ["Saludar y presentar la propuesta", "Explicar plazo y costo", "Acordar el siguiente paso"],
  };

  const a1 = adaptMissionForLevel(baseMission, "A1", "en");
  assert.equal(a1.id, "cliente");
  assert.match(a1.scene, /recepción/i);
  assert.ok(!a1.scene.includes("presenta y defiende una propuesta"));
  assert.equal(a1.objectives[0], "Saludar y dar la bienvenida al cliente");
  assert.equal(a1.objectives[2], "Ofrecer una bebida (agua o café)");

  const b2 = adaptMissionForLevel(baseMission, "B2", "en");
  assert.match(b2.scene, /propuesta técnica/i);
});

test("LEVEL_RULES define restricciones estrictas para A1", () => {
  const r = LEVEL_RULES.A1;
  assert.equal(r.maxSentences, 1);
  assert.equal(r.maxWordsPerSentence, 8);
  assert.match(r.promptDirective, /PRINCIPIANTE A1/);
});

test("buildPedagogicalSystemInstruction incorpora reglas de nivel y doble rol", () => {
  const instr = buildPedagogicalSystemInstruction({
    lang: "en",
    level: "A1",
    mission: { id: "cliente", title: "Reunión con cliente", scene: "x", objectives: [] },
  });

  assert.match(instr, /Alex/);
  assert.match(instr, /A1/);
  assert.match(instr, /FACILITADOR PEDAGÓGICO/);
  assert.match(instr, /TECHO LÉXICO/);
});

test("repairAndGuaranteePedagogicalResponse garantiza que translation NUNCA sea vacía", () => {
  const incomplete = {
    reply: "Hello! Nice to meet you. Are you ready for our conversation?",
    translation: "", // Vacía como ocurrió en el bug del usuario
  };

  const res = repairAndGuaranteePedagogicalResponse(incomplete, "", "Hello", "A1", "en");
  assert.ok(res.translation.length > 0);
  assert.match(res.translation, /Mucho gusto/i);
});

test("repairAndGuaranteePedagogicalResponse detecta desajuste auxiliar de 'Yes, I do'", () => {
  const data = {
    reply: "Great! Let's get started.",
    translation: "¡Genial! Empecemos.",
    facilitator: null,
  };

  const res = repairAndGuaranteePedagogicalResponse(data, "", "Yes, I do", "A1", "en");
  assert.ok(res.facilitator);
  assert.equal(res.facilitator.correctForm, "Yes, I am.");
  assert.equal(res.facilitator.nativeAlternative, "Sure, all set!");
  assert.equal(res.facilitator.competencyFocus, "grammar");
  assert.match(res.facilitator.userAnalysis, /To Be/i);
  assert.ok(res.facilitator.encouragement.length > 0);
  assert.match(res.facilitator.repetitionPrompt, /Yes, I am ready/i);
});

test("GEMINI_PEDAGOGICAL_SCHEMA define las propiedades requeridas", () => {
  assert.equal(GEMINI_PEDAGOGICAL_SCHEMA.type, "OBJECT");
  assert.ok(GEMINI_PEDAGOGICAL_SCHEMA.required.includes("reply"));
  assert.ok(GEMINI_PEDAGOGICAL_SCHEMA.required.includes("translation"));
  assert.ok(GEMINI_PEDAGOGICAL_SCHEMA.required.includes("facilitator"));
  assert.ok(GEMINI_PEDAGOGICAL_SCHEMA.properties.facilitator.required.includes("encouragement"));
});

test("Escenario E2E de capturas de usuario: A1 en reunión con cliente + 'Yes, I do'", () => {
  // 1. Simulación de respuesta cruda de Gemini que omitió traducción y facilitador
  const rawFromGeminiWithoutTranslation = JSON.stringify({
    reply: "Hello! Nice to meet you too. Are you ready to practice?",
    vocabulary: [{ word: "ready", translation: "listo" }],
    competencyScores: { grammar: 70, vocabulary: 75, fluency: 80, comprehension: 85 },
  });

  const parsed = JSON.parse(rawFromGeminiWithoutTranslation);
  const guaranteed = repairAndGuaranteePedagogicalResponse(parsed, rawFromGeminiWithoutTranslation, "Yes, I do", "A1", "en");

  // Garantía 1: Traducción NUNCA vacía
  assert.ok(guaranteed.translation && guaranteed.translation.length > 0);

  // Garantía 2: Recuadro del facilitador con diagnóstico y alternativas nativas
  assert.ok(guaranteed.facilitator);
  assert.equal(guaranteed.facilitator.correctForm, "Yes, I am.");
  assert.equal(guaranteed.facilitator.nativeAlternative, "Sure, all set!");
  assert.match(guaranteed.facilitator.userAnalysis, /To Be/i);
  assert.ok(guaranteed.facilitator.encouragement.includes("!"), "Debe tener mensaje motivador");
  assert.ok(guaranteed.facilitator.repetitionPrompt.includes("Yes, I am ready"), "Debe invitar a repetir en voz alta");
});
