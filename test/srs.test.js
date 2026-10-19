import test from "node:test";
import assert from "node:assert/strict";
import { newCard, schedule, dueQueue, preview, fmtInterval, gradeFromTone, forecast, DAY } from "../lib/srs.js";

const T0 = 1_700_000_000_000;
const card = () => newCard({ lang: "en", front: "borrow", back: "pedir prestado" }, T0);

test("una tarjeta nueva está vencida", () => {
  assert.equal(dueQueue([card()], T0).length, 1);
});

test("Otra vez reprograma a 10 minutos y baja la facilidad", () => {
  const c = schedule(card(), 0, T0);
  assert.equal(c.due - T0, 600_000);
  assert.equal(c.lapses, 1);
  assert.ok(c.ease < 2.5);
});

test("secuencia Bien: 1 d, 3 d... luego crece con la facilidad", () => {
  let c = schedule(card(), 2, T0);
  assert.equal(c.interval, 1);
  c = schedule(c, 2, T0 + DAY);
  assert.equal(c.interval, 6);
  c = schedule(c, 2, T0 + 7 * DAY);
  assert.equal(c.interval, Math.round(6 * 2.5));
});

test("Fácil aumenta la facilidad; Difícil la reduce con piso 1.3", () => {
  assert.ok(schedule(card(), 3, T0).ease > 2.5);
  let c = card();
  for (let i = 0; i < 30; i++) c = schedule({ ...c, reps: 3, interval: 10 }, 1, T0);
  assert.ok(c.ease >= 1.3);
});

test("el intervalo previsto es monótono con la calificación", () => {
  const c = schedule(schedule(card(), 2, T0), 2, T0 + DAY);
  const due = [1, 2, 3].map((g) => schedule(c, g, T0).due);
  assert.ok(due[0] <= due[1] && due[1] <= due[2]);
  assert.equal(preview(card(), T0).length, 4);
});

test("calificación inválida lanza error", () => {
  assert.throws(() => schedule(card(), 5), RangeError);
});

test("cola: ordena por vencimiento y respeta el límite", () => {
  const a = { ...card(), id: "a", due: T0 - 2 * DAY }, b = { ...card(), id: "b", due: T0 - DAY }, c = { ...card(), id: "c", due: T0 + DAY };
  assert.deepEqual(dueQueue([c, b, a], T0, 1).map((x) => x.id), ["a"]);
  assert.deepEqual(dueQueue([c, b, a], T0).map((x) => x.id), ["a", "b"]);
});

test("formato de intervalos y sugerencia desde tonos", () => {
  assert.equal(fmtInterval(600_000), "10 min");
  assert.equal(fmtInterval(3 * DAY), "3 d");
  assert.deepEqual([40, 60, 80, 95].map(gradeFromTone), [0, 1, 2, 3]);
});

test("pronóstico agrupa por día", () => {
  const cs = [{ due: T0 - DAY }, { due: T0 + 1.5 * DAY }, { due: T0 + 40 * DAY }];
  assert.deepEqual(forecast(cs, T0, 3), [1, 1, 0]);
});
