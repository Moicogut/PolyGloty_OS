// Repaso espaciado (variante de SM-2 con paso de reaprendizaje de 10 minutos).
// Calificaciones: 0 = Otra vez, 1 = Difícil, 2 = Bien, 3 = Fácil.
export const DAY = 86_400_000;
const MIN = 60_000;

export function newCard(fields, now = Date.now()) {
  const { lang, front, back, pinyin = "", example = "" } = fields;
  return {
    id: `c_${now.toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    lang, front, back, pinyin, example,
    ease: 2.5, interval: 0, reps: 0, lapses: 0,
    due: now, created: now, lastGrade: null, toneBest: null,
  };
}

export function schedule(card, grade, now = Date.now()) {
  if (![0, 1, 2, 3].includes(grade)) throw new RangeError("grade debe ser 0, 1, 2 o 3");
  const c = { ...card };
  if (grade === 0) {
    c.lapses += 1; c.reps = 0; c.interval = 0;
    c.ease = Math.max(1.3, c.ease - 0.2);
    c.due = now + 10 * MIN;
  } else {
    let days;
    if (c.reps === 0) days = [0, 1, 1, 3][grade];
    else if (c.reps === 1) days = [0, 3, 6, 9][grade];
    else if (grade === 1) days = c.interval * 1.2;
    else if (grade === 2) days = c.interval * c.ease;
    else days = c.interval * c.ease * 1.3;
    if (grade === 1) c.ease = Math.max(1.3, c.ease - 0.15);
    if (grade === 3) c.ease += 0.15;
    c.reps += 1;
    c.interval = Math.max(1, Math.round(days));
    c.due = now + c.interval * DAY;
  }
  c.lastGrade = grade;
  return c;
}

export const isDue = (c, now = Date.now()) => c.due <= now;

export function dueQueue(cards, now = Date.now(), limit = 30) {
  return cards.filter((c) => isDue(c, now)).sort((a, b) => a.due - b.due).slice(0, limit);
}

export function preview(card, now = Date.now()) {
  return [0, 1, 2, 3].map((g) => fmtInterval(schedule(card, g, now).due - now));
}

export function fmtInterval(ms) {
  if (ms < 60 * MIN) return `${Math.max(1, Math.round(ms / MIN))} min`;
  if (ms < DAY) return `${Math.round(ms / (60 * MIN))} h`;
  const d = Math.round(ms / DAY);
  return d < 30 ? `${d} d` : `${(d / 30).toFixed(1)} m`;
}

// Calificación sugerida a partir de un puntaje de tonos (0–100).
export const gradeFromTone = (score) => (score < 50 ? 0 : score < 70 ? 1 : score < 85 ? 2 : 3);

// Cuántas tarjetas vencen cada uno de los próximos `days` días (hoy incluye atrasadas).
export function forecast(cards, now = Date.now(), days = 7) {
  const out = Array(days).fill(0);
  for (const c of cards) {
    const i = Math.max(0, Math.floor((c.due - now) / DAY));
    if (i < days) out[i] += 1;
  }
  return out;
}
