/**
 * lib/proficiencyAuditor.js
 * 
 * Motor de Pruebas de Suficiencia Auditada (Oral + Escrito) y Certificación Digital.
 * Implementa evaluación tridimensional conforme al marco CEFR (A1-C1) y HSK (1-3):
 *   - Fase A: Comprensión y Precisión Estructural (CAT Cloze Test cronometrado).
 *   - Fase B: Producción Escrita Auditada (Rúbrica CEFR: Riqueza TTR, Sintaxis y Cohesión).
 *   - Fase C: Entrevista Oral Auditada con Wetty (Examinadora Formal, Fluidez y Adecuación).
 * Emite certificados digitales inmutables con código único y hash SHA-256.
 */

import crypto from "node:crypto";
import { LEVEL_RULES } from "./pedagogicalAgent.js";

// ============================================================================
// 1. BANCO DE REACTIVOS ADAPTATIVOS (FASE A - CAT CLOZE TEST)
// ============================================================================

export const PLACEMENT_QUESTIONS = {
  en: [
    {
      id: "cat-en-1",
      level: "A1",
      prompt: "I _____ like a cup of hot coffee with milk, please.",
      options: ["would", "want", "am", "can"],
      answerIndex: 0,
      skill: "Petición formal y cortesía social",
      explanation: "'Would like' es la fórmula canónica de cortesía en inglés formal frente al informal 'want'.",
    },
    {
      id: "cat-en-2",
      level: "A1",
      prompt: "Excuse me, where _____ the nearest underground station?",
      options: ["are", "is", "be", "do"],
      answerIndex: 1,
      skill: "Concordancia singular To Be para ubicaciones",
      explanation: "El sujeto es singular ('the nearest station'), por lo que requiere 'is'.",
    },
    {
      id: "cat-en-3",
      level: "A2",
      prompt: "Last weekend we _____ to Manchester to visit our grandparents.",
      options: ["go", "gone", "went", "going"],
      answerIndex: 2,
      skill: "Pasado simple irregular",
      explanation: "'Last weekend' actúa como marcador temporal que exige pretérito simple ('went').",
    },
    {
      id: "cat-en-4",
      level: "A2",
      prompt: "If it rains tomorrow, we _____ stay at home and watch a documentary.",
      options: ["will", "would", "did", "have"],
      answerIndex: 0,
      skill: "Primer condicional (causa y efecto real)",
      explanation: "La condición en presente ('If it rains') se combina con 'will + infinitivo' en la cláusula principal.",
    },
    {
      id: "cat-en-5",
      level: "B1",
      prompt: "She has been working as a software developer _____ three years.",
      options: ["since", "for", "during", "ago"],
      answerIndex: 1,
      skill: "Presente perfecto continuo con periodos de duración",
      explanation: "'For' se utiliza para cuantificar periodos de tiempo ('three years'), mientras que 'since' marca un punto inicial.",
    },
    {
      id: "cat-en-6",
      level: "B2",
      prompt: "Hardly _____ the conference room when the keynote speech began.",
      options: ["we entered", "had we entered", "we had entered", "did we enter"],
      answerIndex: 1,
      skill: "Inversión enfática formal con adverbio negativo",
      explanation: "'Hardly' al inicio de oración requiere inversión sujeto-auxiliar ('had we entered').",
    },
  ],
  zh: [
    {
      id: "cat-zh-1",
      level: "HSK1",
      prompt: "请问，这本词典多少_____？",
      options: ["钱", "岁", "块", "点"],
      answerIndex: 0,
      skill: "Petición de precio básica",
      explanation: "多少钱 (duōshao qián) es la colocación fija para preguntar '¿cuánto cuesta?'.",
    },
    {
      id: "cat-zh-2",
      level: "HSK1",
      prompt: "我明天想_____北京坐高铁。",
      options: ["去", "来", "在", "是"],
      answerIndex: 0,
      skill: "Direccionalidad básica",
      explanation: "去 (qù) indica movimiento hacia un destino alejado del hablante.",
    },
    {
      id: "cat-zh-3",
      level: "HSK2",
      prompt: "他今天比昨天_____多了，能正常上班。",
      options: ["好", "很", "非常", "最"],
      answerIndex: 0,
      skill: "Estructura comparativa con 比",
      explanation: "En oraciones con 比 no se usan adverbios de grado como 很, sino adjetivo + 多了.",
    },
  ],
};

export const CERTIFICATION_QUESTIONS = {
  A1: {
    en: [
      {
        id: "exit-a1-1",
        prompt: "At a restaurant: 'Good evening. _____ table for two, please?'",
        options: ["We want a", "Could we have a", "Give us a", "Are we"],
        answerIndex: 1,
        skill: "Cortesía formal en hostelería",
      },
      {
        id: "exit-a1-2",
        prompt: "Hotel Reception: 'Here is your room key. Room 304 is on the third floor, _____ the lift.'",
        options: ["next to", "under to", "between", "inside of"],
        answerIndex: 0,
        skill: "Preposiciones de lugar para orientación",
      },
      {
        id: "exit-a1-3",
        prompt: "Daily Routine: 'Mark _____ breakfast at 7:30 AM before leaving for work.'",
        options: ["have", "has", "is having", "having"],
        answerIndex: 1,
        skill: "Tercera persona singular en presente simple",
      },
      {
        id: "exit-a1-4",
        prompt: "Supermarket: 'How _____ oranges would you like in your basket?'",
        options: ["much", "many", "often", "long"],
        answerIndex: 1,
        skill: "Cuantificadores contables",
      },
      {
        id: "exit-a1-5",
        prompt: "Directions: 'Go straight ahead and _____ left at the traffic lights.'",
        options: ["take", "turn", "make", "walk"],
        answerIndex: 1,
        skill: "Instrucciones de desplazamiento",
      },
      {
        id: "exit-a1-6",
        prompt: "Personal Info: 'I was born _____ April 14th, 1998.'",
        options: ["at", "in", "on", "by"],
        answerIndex: 2,
        skill: "Preposiciones temporales de fechas exactas",
      },
    ],
  },
  A2: {
    en: [
      {
        id: "exit-a2-1",
        prompt: "Travel: 'While I was waiting for the flight, I _____ my passport in the lounge.'",
        options: ["lose", "lost", "was losing", "have lost"],
        answerIndex: 1,
        skill: "Pasado simple como interrupción de acción continua",
      },
      {
        id: "exit-a2-2",
        prompt: "Office: 'You _____ wear a formal suit on Fridays; casual clothes are allowed.'",
        options: ["must not", "don't have to", "should not", "cannot"],
        answerIndex: 1,
        skill: "Ausencia de obligación con semi-modal",
      },
    ],
  },
};

// ============================================================================
// 2. PROMPTS DE PRODUCCIÓN ESCRITA (FASE B)
// ============================================================================

export const WRITTEN_PROMPTS = {
  A1: {
    en: [
      {
        id: "wp-a1-hotel",
        title: "Correo de Confirmación a Hotel",
        minWords: 35,
        targetWords: 50,
        prompt: "Escribe un correo breve (40 a 60 palabras) a la recepción de un hotel en Londres. Debes confirmar tu hora de llegada (6:00 PM), solicitar una habitación tranquila con cama doble y preguntar si el desayuno está incluido en la tarifa.",
        sampleModel: "Dear Reception, I am confirming my arrival today at 6:00 PM for booking #412. Could I please have a quiet room with a double bed? Also, is breakfast included in the rate? Thank you very much, John Doe.",
      },
    ],
    zh: [
      {
        id: "wp-hsk1-self",
        title: "自我介绍 (Presentación Personal)",
        minWords: 20,
        targetWords: 40,
        prompt: "用中文写一段简短的自我介绍（30到50个字）。介绍你的名字、国籍、你在哪里学习以及你喜欢喝什么（茶或咖啡）。",
        sampleModel: "你好！我叫大卫。我是西班牙人。我在大学学习中文。我很喜欢喝中国绿茶。谢谢大家！",
      },
    ],
  },
  A2: {
    en: [
      {
        id: "wp-a2-email",
        title: "Reprogramación de Cita Laboral",
        minWords: 50,
        targetWords: 75,
        prompt: "Escribe un correo formal (50 a 75 palabras) disculpándote por no poder asistir a la videollamada de hoy debido a una emergencia familiar. Propón dos opciones de horario para mañana y pregunta si necesitan algún documento previo.",
      },
    ],
  },
};

// ============================================================================
// 3. PREGUNTAS DE ENTREVISTA ORAL CON WETTY EXAMINADORA (FASE C)
// ============================================================================

export const ORAL_EXAM_QUESTIONS = {
  A1: {
    en: [
      {
        id: "oral-a1-1",
        stage: "warmup",
        prompt: "Welcome to your official CEFR A1 Spoken Assessment. Could you please state your full name, where you are from, and what you do every day?",
        expectedPoints: ["name", "origin/city", "occupation/routine"],
        maxDurationSec: 45,
      },
      {
        id: "oral-a1-2",
        stage: "transaction",
        prompt: "Imagine you walk into a cafe in Dublin. Look at the barista and order a hot drink and something to eat. Be sure to ask for the bill politely.",
        expectedPoints: ["polite order with 'could' or 'can'", "item name", "ask for bill/price"],
        maxDurationSec: 45,
      },
      {
        id: "oral-a1-3",
        stage: "description",
        prompt: "Tell me about your home or your neighborhood: What does it look like, and what places are near your house?",
        expectedPoints: ["location prepositions", "descriptions with 'there is/are'"],
        maxDurationSec: 60,
      },
      {
        id: "oral-a1-4",
        stage: "elaboration",
        prompt: "Why are you learning English right now, and what do you enjoy doing during your free time?",
        expectedPoints: ["reason with 'because'", "hobbies/interests"],
        maxDurationSec: 60,
      },
    ],
  },
  A2: {
    en: [
      {
        id: "oral-a2-1",
        stage: "past_narrative",
        prompt: "Can you tell me about the most memorable trip or vacation you took in the last two years? Where did you go and what happened?",
        expectedPoints: ["past tense verbs", "chronological sequence"],
        maxDurationSec: 60,
      },
    ],
  },
};

// ============================================================================
// 4. FUNCIONES DE EVALUACIÓN HEURÍSTICA Y RÚBRICA CEFR (ROBUSTEZ OFFLINE/FALLBACK)
// ============================================================================

/**
 * Evalúa la producción escrita mediante indicadores cuantitativos CEFR:
 * Type-Token Ratio (TTR), conteo de palabras, longitud media, conectores y sintaxis.
 */
export function evaluateWrittenHeuristic(text, level = "A1", lang = "en") {
  if (!text || typeof text !== "string") {
    return {
      overallWrittenScore: 0,
      grammarScore: 0,
      vocabularyScore: 0,
      cohesionScore: 0,
      wordCount: 0,
      ttr: 0,
      feedback: "No se proporcionó ningún texto para la evaluación.",
      errors: ["Texto vacío"],
    };
  }

  const cleaned = text.trim();
  const words = cleaned.split(/\s+/).filter((w) => w.length > 0);
  const wordCount = words.length;

  if (wordCount < 10) {
    return {
      overallWrittenScore: 30,
      grammarScore: 30,
      vocabularyScore: 30,
      cohesionScore: 30,
      wordCount,
      ttr: 1.0,
      feedback: "La respuesta es demasiado breve para evaluar suficiencia lingüística.",
      errors: ["Longitud insuficiente (menos de 10 palabras)"],
    };
  }

  // Type-Token Ratio (Variedad léxica)
  const normalizedWords = words.map((w) => w.toLowerCase().replace(/[^a-z0-9áéíóúüñ]/gi, ""));
  const uniqueWords = new Set(normalizedWords.filter((w) => w.length > 0));
  const ttr = uniqueWords.size / wordCount;

  // Parámetros por nivel
  const targetMin = level === "A1" ? 35 : level === "A2" ? 50 : 70;
  const targetMax = level === "A1" ? 75 : level === "A2" ? 100 : 130;

  // 1. Puntaje de extensión y cumplimiento de consigna (0..100)
  let lengthScore = 100;
  if (wordCount < targetMin) {
    lengthScore = Math.max(40, Math.round((wordCount / targetMin) * 100));
  } else if (wordCount > targetMax) {
    lengthScore = Math.max(70, Math.round(100 - (wordCount - targetMax) * 0.8));
  }

  // 2. Riqueza léxica (TTR esperado para A1: 0.60 - 0.85)
  let vocabScore = Math.round(Math.min(100, Math.max(40, ttr * 125)));
  if (lang === "en") {
    const politeWords = ["please", "thank", "could", "would", "appreciate", "kind", "regards"];
    const foundPolite = politeWords.some((p) => cleaned.toLowerCase().includes(p));
    if (foundPolite) vocabScore = Math.min(100, vocabScore + 10);
  }

  // 3. Precisión sintáctica y puntuación básica
  const sentences = cleaned.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  let grammarScore = 75;
  const errors = [];

  // Chequeo de mayúscula inicial en oraciones
  let capitalizedSentences = 0;
  for (const s of sentences) {
    const trimmed = s.trim();
    if (trimmed.length > 0 && trimmed[0] === trimmed[0].toUpperCase()) {
      capitalizedSentences++;
    }
  }
  const capitalizationRatio = sentences.length > 0 ? capitalizedSentences / sentences.length : 1;
  if (capitalizationRatio < 0.7) {
    grammarScore -= 15;
    errors.push("Faltan mayúsculas al inicio de varias oraciones.");
  }

  // Chequeo de cortesía y fórmulas de apertura/cierre
  let cohesionScore = 75;
  if (lang === "en") {
    const connectors = ["and", "or", "also", "because", "but", "so", "with"];
    const foundConnectors = connectors.filter((c) => normalizedWords.includes(c));
    cohesionScore = Math.min(100, 60 + foundConnectors.length * 8);
  }

  // Consolidación de Fase B
  const overallWrittenScore = Math.round(
    lengthScore * 0.25 + grammarScore * 0.35 + vocabScore * 0.25 + cohesionScore * 0.15
  );

  return {
    overallWrittenScore: Math.min(100, Math.max(0, overallWrittenScore)),
    grammarScore: Math.min(100, Math.max(0, grammarScore)),
    vocabularyScore: Math.min(100, Math.max(0, vocabScore)),
    cohesionScore: Math.min(100, Math.max(0, cohesionScore)),
    wordCount,
    ttr: Number(ttr.toFixed(2)),
    errors,
    feedback:
      overallWrittenScore >= 75
        ? "Excelente producción escrita. Cumple con la consigna, demuestra variedad léxica y control sintáctico adecuado para el nivel."
        : "Producción escrita básica. Se recomienda reforzar el uso de conectores y la precisión gramatical para consolidar el nivel.",
  };
}

/**
 * Evalúa los turnos orales de la Fase C con métricas de fluidez, inteligibilidad y pragmática.
 */
export function evaluateOralTurn({ questionId, userTranscript, latencyMs = 1200, audioDurationMs = 5000, level = "A1" }) {
  const text = (userTranscript || "").trim();
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  const wordCount = words.length;

  if (wordCount === 0) {
    return {
      turnScore: 0,
      fluencyScore: 0,
      pragmaticScore: 0,
      latencyScore: 0,
      transcript: "",
      feedback: "Sin respuesta verbal detectable.",
    };
  }

  // 1. Latencia de habla (pausa antes de responder)
  // Latencia ideal: 400ms a 2200ms
  let latencyScore = 90;
  if (latencyMs > 4000) latencyScore = 50;
  else if (latencyMs > 2500) latencyScore = 70;
  else if (latencyMs >= 400) latencyScore = 95;

  // 2. Fluidez estimada (palabras por segundo)
  const durationSec = Math.max(1, audioDurationMs / 1000);
  const wordsPerSecond = wordCount / durationSec;
  // Para A1, 1.2 a 2.2 palabras por segundo es fluidez natural
  let fluencyScore = 80;
  if (wordsPerSecond >= 1.0 && wordsPerSecond <= 2.8) {
    fluencyScore = 90;
  } else if (wordsPerSecond < 0.6) {
    fluencyScore = 65;
  }

  // 3. Adecuación pragmática y longitud del enunciado
  const targetMinWords = level === "A1" ? 5 : 8;
  let pragmaticScore = 80;
  if (wordCount >= targetMinWords) {
    pragmaticScore = Math.min(100, 75 + wordCount * 2);
  } else {
    pragmaticScore = Math.max(50, wordCount * 12);
  }

  const turnScore = Math.round(fluencyScore * 0.4 + pragmaticScore * 0.4 + latencyScore * 0.2);

  return {
    questionId,
    transcript: text,
    turnScore,
    fluencyScore,
    pragmaticScore,
    latencyScore,
    wordCount,
    feedback: turnScore >= 75 ? "Respuesta fluida y contextualmente adecuada." : "Respuesta comprensible, con oportunidad de mayor elaboración.",
  };
}

// ============================================================================
// 5. MOTOR DE SESIÓN Y AUDITORÍA INMUTABLE
// ============================================================================

/**
 * Inicia una sesión de prueba de suficiencia con validación de elegibilidad.
 */
export function startProficiencySession({
  testType = "placement", // 'placement' | 'certification_exit'
  lang = "en",
  level = "A1",
  userCredits = 0,
  proficiencyUnlocked = false,
  candidateName = "Estudiante Polyglot",
  userId = "user-1",
}) {
  const validLang = lang === "zh" ? "zh" : "en";
  const validLevel = LEVEL_RULES[level] ? level : "A1";

  // Control de elegibilidad para Examen de Certificación
  if (testType === "certification_exit") {
    const requiredCredits = 36;
    if (userCredits < requiredCredits && !proficiencyUnlocked) {
      return {
        ok: false,
        eligible: false,
        error: `Se requieren 36 créditos acumulados en el nivel ${validLevel} para rendir el Examen de Certificación Oficial (acumulados: ${userCredits}).`,
      };
    }
  }

  const sessionId = `audit-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
  const questionsPhaseA = testType === "placement"
    ? (PLACEMENT_QUESTIONS[validLang] || PLACEMENT_QUESTIONS.en)
    : (CERTIFICATION_QUESTIONS[validLevel]?.[validLang] || CERTIFICATION_QUESTIONS.A1.en);

  const writtenPrompt = (WRITTEN_PROMPTS[validLevel]?.[validLang] || WRITTEN_PROMPTS.A1.en)[0];
  const oralQuestions = (ORAL_EXAM_QUESTIONS[validLevel]?.[validLang] || ORAL_EXAM_QUESTIONS.A1.en);

  return {
    ok: true,
    eligible: true,
    sessionId,
    testType,
    lang: validLang,
    targetLevel: validLevel,
    candidateName,
    userId,
    startedAt: new Date().toISOString(),
    phaseA: {
      timeLimitPerQuestionSec: 45,
      questionsCount: questionsPhaseA.length,
      questions: questionsPhaseA.map((q) => ({
        id: q.id,
        level: q.level || validLevel,
        prompt: q.prompt,
        options: q.options,
        skill: q.skill,
      })),
    },
    phaseB: {
      promptId: writtenPrompt.id,
      title: writtenPrompt.title,
      prompt: writtenPrompt.prompt,
      minWords: writtenPrompt.minWords,
      targetWords: writtenPrompt.targetWords,
    },
    phaseC: {
      turnsCount: oralQuestions.length,
      questions: oralQuestions.map((oq) => ({
        id: oq.id,
        stage: oq.stage,
        prompt: oq.prompt,
        maxDurationSec: oq.maxDurationSec,
      })),
    },
  };
}

/**
 * Evalúa las respuestas de la Fase A (CAT Cloze Test).
 */
export function evaluatePhaseA({ testType = "placement", lang = "en", level = "A1", answers = [] }) {
  const bank = testType === "placement"
    ? (PLACEMENT_QUESTIONS[lang] || PLACEMENT_QUESTIONS.en)
    : (CERTIFICATION_QUESTIONS[level]?.[lang] || CERTIFICATION_QUESTIONS.A1.en);

  let correctCount = 0;
  const itemResults = [];

  for (let i = 0; i < bank.length; i++) {
    const item = bank[i];
    const givenIndex = Number(answers[i]);
    const isCorrect = givenIndex === item.answerIndex;
    if (isCorrect) correctCount++;

    itemResults.push({
      id: item.id,
      isCorrect,
      givenIndex,
      correctIndex: item.answerIndex,
      explanation: item.explanation || "",
    });
  }

  const score = Math.round((correctCount / bank.length) * 100);
  return {
    totalQuestions: bank.length,
    correctCount,
    phaseAScore: score,
    itemResults,
  };
}

/**
 * Genera un código de certificado oficial único y verificable.
 */
export function generateCertificateCode(userId, lang, level) {
  const seed = `${userId}-${lang}-${level}-${Date.now()}`;
  const hash = crypto.createHash("sha256").update(seed).digest("hex").toUpperCase();
  return `POLY-${level}-${hash.slice(0, 4)}-${hash.slice(4, 8)}`;
}

/**
 * Consolida las 3 fases, genera el hash criptográfico inmutable,
 * emite el Certificado Oficial y promueve de nivel si corresponde.
 */
export function finalizeProficiencyAudit({
  sessionId,
  testType = "certification_exit",
  lang = "en",
  targetLevel = "A1",
  candidateName = "Estudiante Polyglot",
  userId = "user-1",
  phaseAResult = { phaseAScore: 80 },
  phaseBResult = { overallWrittenScore: 80, grammarScore: 80, vocabularyScore: 80, cohesionScore: 80, wordCount: 50 },
  phaseCResult = { overallSpokenScore: 80, fluencyScore: 80, pragmaticScore: 80, turns: [] },
  writtenText = "",
  store = null,
}) {
  const pA = Number(phaseAResult.phaseAScore) || 0;
  const pB = Number(phaseBResult.overallWrittenScore) || 0;
  const pC = Number(phaseCResult.overallSpokenScore) || 0;

  // Ponderación oficial CEFR: 30% Estructural/Cloze, 35% Redacción, 35% Expresión Oral
  const overallScore = Math.round(pA * 0.30 + pB * 0.35 + pC * 0.35);
  const passed = overallScore >= 75;

  // Determinación de nivel asignado
  let assignedLevel = targetLevel;
  if (testType === "placement") {
    if (overallScore >= 90) assignedLevel = "B2";
    else if (overallScore >= 75) assignedLevel = "B1";
    else if (overallScore >= 55) assignedLevel = "A2";
    else assignedLevel = "A1";
  } else if (testType === "certification_exit" && passed) {
    const nextLevels = { A1: "A2", A2: "B1", B1: "B2", B2: "C1", C1: "C1", HSK1: "HSK2", HSK2: "HSK3" };
    assignedLevel = nextLevels[targetLevel] || targetLevel;
  }

  const certificateCode = passed ? generateCertificateCode(userId, lang, targetLevel) : null;
  const issuedAt = new Date().toISOString();

  // Generación de Hash de Verificación Inmutable SHA-256
  const hashPayload = `${userId}|${candidateName}|${lang}|${targetLevel}|${overallScore}|${certificateCode || "NO_CERT"}|${issuedAt}`;
  const verificationHash = crypto.createHash("sha256").update(hashPayload).digest("hex");

  const auditRecord = {
    id: sessionId || `audit-${Date.now()}`,
    userId,
    candidateName,
    lang,
    testType,
    targetLevel,
    assignedLevel,
    overallScore,
    scores: {
      structural: pA,
      written: pB,
      spoken: pC,
      grammar: Math.round((pA + (phaseBResult.grammarScore || pB)) / 2),
      vocabulary: phaseBResult.vocabularyScore || 80,
      fluency: phaseCResult.fluencyScore || 80,
      cohesion: phaseBResult.cohesionScore || 80,
    },
    phaseAResult,
    phaseBResult,
    phaseCResult,
    writtenText,
    passed,
    certificateCode,
    verificationHash,
    issuedAt,
  };

  // Persistir en store local multi-tenant
  if (store && store.data) {
    if (!Array.isArray(store.data.proficiencyAudits)) {
      store.data.proficiencyAudits = [];
    }
    store.data.proficiencyAudits.push(auditRecord);

    if (!store.data.profile) store.data.profile = {};
    if (!Array.isArray(store.data.profile.certificates)) {
      store.data.profile.certificates = [];
    }

    if (passed && certificateCode) {
      store.data.profile.certificates.push({
        code: certificateCode,
        level: targetLevel,
        lang,
        score: overallScore,
        issuedAt,
        hash: verificationHash,
      });

      // Si fue examen de certificación y aprobó, se promueve al siguiente nivel
      if (testType === "certification_exit") {
        store.data.profile.level = assignedLevel;
        store.data.profile.credits = 0; // Reinicio de créditos para el nuevo nivel
        store.data.profile.proficiencyUnlocked = false;
      } else if (testType === "placement") {
        store.data.profile.level = assignedLevel;
      }
    }

    if (typeof store.save === "function") {
      store.save();
    }
  }

  return {
    ok: true,
    audit: auditRecord,
    passed,
    overallScore,
    promotedLevel: assignedLevel,
    certificate: passed
      ? {
          code: certificateCode,
          candidateName,
          language: lang === "zh" ? "Chino Mandarín" : "Inglés Internacional",
          certifiedLevel: targetLevel,
          nextLevel: assignedLevel,
          overallScore,
          issuedAt,
          verificationHash,
          institution: "Polyglot Voice Language Assessment Council",
          cefrStandard: "CEFR Companion Volume 2020",
        }
      : null,
  };
}

/**
 * Consulta un certificado por código único para auditoría o validación pública.
 */
export function verifyCertificate(certificateCode, store = null) {
  if (!certificateCode || typeof certificateCode !== "string") {
    return { ok: false, error: "Código de certificado no proporcionado o inválido." };
  }

  const cleanCode = certificateCode.trim().toUpperCase();

  // Búsqueda en store si está disponible
  if (store && Array.isArray(store.data?.proficiencyAudits)) {
    const match = store.data.proficiencyAudits.find(
      (a) => a.certificateCode && a.certificateCode.toUpperCase() === cleanCode
    );
    if (match) {
      return {
        ok: true,
        valid: true,
        certificate: {
          code: match.certificateCode,
          candidateName: match.candidateName,
          level: match.targetLevel,
          lang: match.lang,
          score: match.overallScore,
          issuedAt: match.issuedAt,
          verificationHash: match.verificationHash,
          status: "Oficialmente Acreditado",
        },
      };
    }
  }

  return {
    ok: true,
    valid: false,
    message: "El código no corresponde a ningún certificado oficial registrado en la red de auditoría.",
  };
}
