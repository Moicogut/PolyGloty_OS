import test from "node:test";
import assert from "node:assert/strict";
import { UserUsageLimiter } from "../lib/limiter.js";
import { validateChatPayload, ValidationError } from "../lib/validator.js";

test("TAREA 6: Límites por minuto, cuota diaria (30 min) y validación de entrada", async () => {
  // 1. Limiter: Límite por minuto (máx 3 turnos en test)
  const limiter = new UserUsageLimiter({
    maxTurnsPerMinute: 3,
    maxDailySeconds: 60, // 60 segundos para simular agotamiento diario en test
  });

  const user = "alumno-limiter-test";
  const now = Date.now();

  // Primeros 3 turnos permitidos
  assert.equal(limiter.checkAndTrackTurn(user, 10, now).allowed, true);
  assert.equal(limiter.checkAndTrackTurn(user, 10, now).allowed, true);
  assert.equal(limiter.checkAndTrackTurn(user, 10, now).allowed, true);

  // El 4to turno dentro del mismo minuto debe ser bloqueado por spam
  const minuteBlocked = limiter.checkAndTrackTurn(user, 10, now);
  assert.equal(minuteBlocked.allowed, false);
  assert.equal(minuteBlocked.reason, "minute_limit");
  assert.ok(minuteBlocked.message.includes("espera") || minuteBlocked.message.includes("rápido"));

  // 2. Limiter: Límite diario (30 min / segundos máximos)
  const userDaily = "alumno-daily-test";
  // Simular turnos hasta consumir la cuota de práctica diaria
  limiter.checkAndTrackTurn(userDaily, 25, now);
  limiter.checkAndTrackTurn(userDaily, 25, now + 70_000); // minuto siguiente
  limiter.checkAndTrackTurn(userDaily, 20, now + 140_000); // cuota de 60s excedida (70s)

  const dailyBlocked = limiter.checkAndTrackTurn(userDaily, 15, now + 200_000);
  assert.equal(dailyBlocked.allowed, false);
  assert.equal(dailyBlocked.reason, "daily_limit");
  assert.ok(dailyBlocked.message.includes("Llegaste al límite de hoy"));
  assert.ok(dailyBlocked.message.includes("Vuelve mañana"));
  assert.ok(dailyBlocked.resetTime);

  // 3. Validator: Tamaño y tipo de entrada de texto
  assert.throws(
    () => validateChatPayload({}),
    /El campo 'messages' debe ser un arreglo no vacío/
  );

  assert.throws(
    () => validateChatPayload({ messages: [{ role: "user", parts: [{ text: "a".repeat(2500) }] }] }),
    /excede el límite máximo de 2000 caracteres/
  );

  // 4. Validator: Tamaño y tipo de entrada de audio (máximo 5 MB)
  assert.throws(
    () => validateChatPayload({
      messages: [{ role: "user", parts: [{ text: "Hello" }] }],
      audio: 12345, // tipo inválido
    }),
    /El campo 'audio' debe ser una cadena/
  );

  // 5. Payload válido pasa sin errores
  const valid = validateChatPayload({
    messages: [{ role: "user", parts: [{ text: "Good morning Alex!" }] }],
    lang: "en",
    level: "B1",
    mission: "cafe",
  });
  assert.equal(valid.messages.length, 1);
  assert.equal(valid.lang, "en");
});
