// Validador tipado defensivo liviano para endpoints (Node.js nativo sin deps)
// Previene inyecciones de datos no estructurados, NaN y types inesperados.

export class ValidationError extends Error {
  constructor(message, field = "") {
    super(message);
    this.name = "ValidationError";
    this.field = field;
  }
}

export function validateGradePayload(body) {
  if (!body || typeof body !== "object") {
    throw new ValidationError("El cuerpo de la solicitud debe ser un objeto JSON válido");
  }
  const { id, grade } = body;
  if (typeof id !== "string" || !id.trim()) {
    throw new ValidationError("El campo 'id' de la tarjeta es obligatorio y debe ser texto", "id");
  }
  const g = Number(grade);
  if (!Number.isInteger(g) || ![0, 1, 2, 3].includes(g)) {
    throw new ValidationError("El campo 'grade' debe ser un entero entre 0 y 3 (0: Otra vez, 1: Difícil, 2: Bien, 3: Fácil)", "grade");
  }
  return { id: id.trim(), grade: g };
}

export function validateDrillPayload(body) {
  if (!body || typeof body !== "object") {
    throw new ValidationError("El cuerpo de la solicitud debe ser un objeto JSON válido");
  }
  const scoreNum = Number(body.score);
  if (Number.isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100) {
    throw new ValidationError("El campo 'score' debe ser un número entre 0 y 100", "score");
  }
  const text = typeof body.text === "string" ? body.text.slice(0, 120) : "";
  const expected = typeof body.expected === "string" ? body.expected.slice(0, 120) : "";
  const cardId = typeof body.cardId === "string" && body.cardId.trim() ? body.cardId.trim() : null;

  return {
    score: Math.round(scoreNum),
    text,
    expected,
    cardId,
  };
}

export function validateToolPayload(body) {
  if (!body || typeof body !== "object") {
    throw new ValidationError("El cuerpo de la solicitud debe ser un objeto JSON válido");
  }
  const validTools = ["add_card", "log_error", "mission_progress"];
  if (typeof body.name !== "string" || !validTools.includes(body.name)) {
    throw new ValidationError(`Herramienta no permitida. Debe ser una de: ${validTools.join(", ")}`, "name");
  }
  const args = body.args && typeof body.args === "object" ? body.args : {};
  const lang = body.lang === "zh" ? "zh" : "en";
  const mission = typeof body.mission === "string" ? body.mission : null;
  const done = Array.isArray(body.done) ? body.done.filter((x) => Number.isInteger(x)) : [];

  return {
    name: body.name,
    args,
    lang,
    mission,
    done,
  };
}

/**
 * Valida tamaño y tipo de toda entrada de texto y audio antes de enviarla
 * a modelos o servicios externos (Gemini / OpenAI / TTS).
 */
export function validateChatPayload(body) {
  if (!body || typeof body !== "object") {
    throw new ValidationError("El cuerpo de la solicitud debe ser un objeto JSON válido");
  }

  // 1. Validar lista de mensajes
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    throw new ValidationError("El campo 'messages' debe ser un arreglo no vacío de turnos", "messages");
  }

  // Máximo 100 mensajes en historial para evitar desbordes de memoria y cuota
  if (body.messages.length > 100) {
    throw new ValidationError("El historial de conversación no puede superar los 100 turnos", "messages");
  }

  for (const m of body.messages) {
    if (!m || typeof m !== "object") {
      throw new ValidationError("Cada turno de mensaje debe ser un objeto válido", "messages");
    }
    const textPart = m.parts?.[0]?.text ?? m.content ?? "";
    if (typeof textPart !== "string") {
      throw new ValidationError("El contenido del turno debe ser texto", "messages");
    }
    // Máximo 2,000 caracteres por turno individual
    if (textPart.length > 2000) {
      throw new ValidationError("El turno de mensaje excede el límite máximo de 2000 caracteres", "messages");
    }
  }

  // 2. Validar payload opcional de audio base64
  if (body.audio) {
    if (typeof body.audio !== "string") {
      throw new ValidationError("El campo 'audio' debe ser una cadena en formato base64 o data URI", "audio");
    }
    // Límite máximo de audio: 5 MB en base64
    const audioByteLength = Buffer.byteLength(body.audio, "utf8");
    if (audioByteLength > 5 * 1024 * 1024) {
      throw new ValidationError("El fragmento de audio excede el tamaño máximo permitido de 5 MB", "audio");
    }
  }

  return {
    messages: body.messages,
    lang: body.lang === "zh" ? "zh" : "en",
    level: typeof body.level === "string" ? body.level.slice(0, 10) : "A1",
    mission: typeof body.mission === "string" ? body.mission.slice(0, 50) : "cafe",
    sttMs: Number(body.sttMs) || 0,
    audio: body.audio || null,
  };
}

export function validateWarmupGeneratePayload(body) {
  const b = body && typeof body === "object" ? body : {};
  return {
    lang: b.lang === "zh" ? "zh" : "en",
    level: typeof b.level === "string" ? b.level.slice(0, 10) : "A1",
    lessonId: typeof b.lessonId === "string" ? b.lessonId.slice(0, 50) : "cafe",
  };
}

export function validateWarmupCompletePayload(body) {
  const b = body && typeof body === "object" ? body : {};
  return {
    warmupId: typeof b.warmupId === "string" ? b.warmupId.slice(0, 60) : "warmup",
    answers: Array.isArray(b.answers) ? b.answers.slice(0, 10) : [],
  };
}

export function validateCurriculumCompletePayload(body) {
  const b = body && typeof body === "object" ? body : {};
  const score = Number(b.score);
  return {
    lang: b.lang === "zh" ? "zh" : "en",
    level: typeof b.level === "string" ? b.level.slice(0, 10) : "A1",
    moduleId: typeof b.moduleId === "string" ? b.moduleId.slice(0, 20) : "m1",
    lessonId: typeof b.lessonId === "string" ? b.lessonId.slice(0, 50) : "cafe",
    score: Number.isFinite(score) ? Math.min(100, Math.max(0, score)) : 80,
    completedObjectives: Number(b.completedObjectives) || 2,
  };
}

export function validateHandbookQuery(query) {
  const q = query && typeof query === "object" ? query : {};
  return {
    lang: q.lang === "zh" ? "zh" : "en",
    level: typeof q.level === "string" ? q.level.slice(0, 10) : "A1",
    lessonId: typeof q.lessonId === "string" ? q.lessonId.slice(0, 50) : "cafe",
  };
}

export function validateProficiencyStartPayload(body) {
  const b = body && typeof body === "object" ? body : {};
  return {
    testType: b.testType === "placement" ? "placement" : "certification_exit",
    lang: b.lang === "zh" ? "zh" : "en",
    level: typeof b.level === "string" ? b.level.slice(0, 10) : "A1",
    candidateName: typeof b.candidateName === "string" && b.candidateName.trim() ? b.candidateName.trim().slice(0, 80) : "Estudiante Polyglot",
  };
}

export function validateProficiencyPhaseAPayload(body) {
  const b = body && typeof body === "object" ? body : {};
  return {
    testType: b.testType === "placement" ? "placement" : "certification_exit",
    lang: b.lang === "zh" ? "zh" : "en",
    level: typeof b.level === "string" ? b.level.slice(0, 10) : "A1",
    answers: Array.isArray(b.answers) ? b.answers.slice(0, 20) : [],
  };
}

export function validateWrittenSubmissionPayload(body) {
  const b = body && typeof body === "object" ? body : {};
  const text = typeof b.text === "string" ? b.text.trim().slice(0, 3000) : "";
  return {
    text,
    promptId: typeof b.promptId === "string" ? b.promptId.slice(0, 50) : "wp-a1-hotel",
    level: typeof b.level === "string" ? b.level.slice(0, 10) : "A1",
    lang: b.lang === "zh" ? "zh" : "en",
  };
}

export function validateOralTurnPayload(body) {
  const b = body && typeof body === "object" ? body : {};
  return {
    questionId: typeof b.questionId === "string" ? b.questionId.slice(0, 50) : "oral-1",
    userTranscript: typeof b.userTranscript === "string" ? b.userTranscript.trim().slice(0, 1500) : "",
    latencyMs: Number(b.latencyMs) || 1200,
    audioDurationMs: Number(b.audioDurationMs) || 5000,
    level: typeof b.level === "string" ? b.level.slice(0, 10) : "A1",
    lang: b.lang === "zh" ? "zh" : "en",
  };
}

export function validateProficiencyFinalizePayload(body) {
  const b = body && typeof body === "object" ? body : {};
  return {
    sessionId: typeof b.sessionId === "string" ? b.sessionId.slice(0, 80) : `audit-${Date.now()}`,
    testType: b.testType === "placement" ? "placement" : "certification_exit",
    lang: b.lang === "zh" ? "zh" : "en",
    targetLevel: typeof b.targetLevel === "string" ? b.targetLevel.slice(0, 10) : "A1",
    candidateName: typeof b.candidateName === "string" && b.candidateName.trim() ? b.candidateName.trim().slice(0, 80) : "Estudiante Polyglot",
    phaseAResult: b.phaseAResult && typeof b.phaseAResult === "object" ? b.phaseAResult : { phaseAScore: 75 },
    phaseBResult: b.phaseBResult && typeof b.phaseBResult === "object" ? b.phaseBResult : { overallWrittenScore: 75 },
    phaseCResult: b.phaseCResult && typeof b.phaseCResult === "object" ? b.phaseCResult : { overallSpokenScore: 75 },
    writtenText: typeof b.writtenText === "string" ? b.writtenText.slice(0, 3000) : "",
  };
}



