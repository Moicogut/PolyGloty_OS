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
