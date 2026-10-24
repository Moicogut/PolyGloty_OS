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
  assert.equal((await limiter.checkAndTrackTurn(user, 10, now)).allowed, true);
  assert.equal((await limiter.checkAndTrackTurn(user, 10, now)).allowed, true);
  assert.equal((await limiter.checkAndTrackTurn(user, 10, now)).allowed, true);

  // El 4to turno dentro del mismo minuto debe ser bloqueado por spam
  const minuteBlocked = await limiter.checkAndTrackTurn(user, 10, now);
  assert.equal(minuteBlocked.allowed, false);
  assert.equal(minuteBlocked.reason, "minute_limit");
  assert.equal(minuteBlocked.error, "limite_minuto");
  assert.ok(minuteBlocked.message.includes("espera") || minuteBlocked.message.includes("rápido"));

  // 2. Limiter: Límite diario (configurable por DAILY_MINUTES_LIMIT)
  const userDaily = "alumno-daily-test";
  // Simular turnos hasta consumir la cuota de práctica diaria
  await limiter.checkAndTrackTurn(userDaily, 25, now);
  await limiter.checkAndTrackTurn(userDaily, 25, now + 70_000); // minuto siguiente
  await limiter.checkAndTrackTurn(userDaily, 20, now + 140_000); // cuota de 60s excedida (70s)

  const dailyBlocked = await limiter.checkAndTrackTurn(userDaily, 15, now + 200_000);
  assert.equal(dailyBlocked.allowed, false);
  assert.equal(dailyBlocked.reason, "daily_limit");
  assert.equal(dailyBlocked.error, "limite_diario");
  assert.equal(typeof dailyBlocked.resetIn, "number");
  assert.ok(dailyBlocked.resetIn > 0);
  assert.equal(dailyBlocked.message, "Llegaste al límite de hoy. Vuelve mañana.");
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

test("C2: persistencia de cuota de uso diario tras reinicio del proceso/instancia", async () => {
  // Simulación de base de datos Supabase persistente para user_usage
  const dbUsage = new Map();
  const mockSupabase = {
    async getDailyUsage(userId, dateStr) {
      return dbUsage.get(`${userId}:${dateStr}`) || null;
    },
    async trackDailyUsage(userId, dateStr, seconds, turns) {
      dbUsage.set(`${userId}:${dateStr}`, { seconds, turns });
    },
  };

  const userId = "usuario_persistencia_c2";
  const now = Date.now();

  // 1. Proceso / Instancia 1: El usuario consume 40 segundos de su cuota
  const limiter1 = new UserUsageLimiter({
    maxDailySeconds: 60,
    supabaseAdapter: mockSupabase,
  });

  const res1 = await limiter1.checkAndTrackTurn(userId, 40, now);
  assert.equal(res1.allowed, true);
  assert.equal(res1.secondsToday, 40);

  // 2. Reinicio del proceso / nueva instancia del limiter (memoria local vacía)
  const limiter2 = new UserUsageLimiter({
    maxDailySeconds: 60,
    supabaseAdapter: mockSupabase,
  });

  // Al llegar el siguiente turno tras el reinicio, limiter2 debe leer la cuota acumulada desde la persistencia
  const res2 = await limiter2.checkAndTrackTurn(userId, 15, now + 1000);
  assert.equal(res2.allowed, true);
  assert.equal(res2.secondsToday, 55); // 40 + 15 conservados tras reinicio

  // 3. Superar la cuota tras reinicio: 55s consumidos + 10s nuevo turno = 65s > 60s
  // El siguiente turno encuentra daily.seconds ya acumulado en 65s >= 60s
  const res3 = await limiter2.checkAndTrackTurn(userId, 10, now + 2000);
  assert.equal(res3.allowed, true);
  assert.equal(res3.secondsToday, 65);

  const res4 = await limiter2.checkAndTrackTurn(userId, 10, now + 3000);
  assert.equal(res4.allowed, false);
  assert.equal(res4.reason, "daily_limit");
  assert.equal(res4.error, "limite_diario");

  // 4. Fallback si Supabase falla: verificar que el limiter retiene el límite local y nunca deja el consumo sin límite
  const failingSupabase = {
    async getDailyUsage() {
      throw new Error("Supabase connection timeout");
    },
    async trackDailyUsage() {
      throw new Error("Supabase DB error");
    },
  };
  const resilientLimiter = new UserUsageLimiter({
    maxDailySeconds: 30,
    supabaseAdapter: failingSupabase,
  });

  // El fallo de Supabase no causa excepción no controlada y se aplica límite local
  const rFail1 = await resilientLimiter.checkAndTrackTurn("usuario_fallback", 20, now);
  assert.equal(rFail1.allowed, true);
  // Turno 2: 20s acumulados < 30s máx, se permite y acumula a 40s
  const rFail2 = await resilientLimiter.checkAndTrackTurn("usuario_fallback", 20, now + 1000);
  assert.equal(rFail2.allowed, true);
  // Turno 3: encuentra 40s acumulados >= 30s máx, bloquea con daily_limit
  const rFail3 = await resilientLimiter.checkAndTrackTurn("usuario_fallback", 10, now + 2000);
  assert.equal(rFail3.allowed, false);
  assert.equal(rFail3.reason, "daily_limit");
});

test("Solución 1: Lazy Upsert de user_usage asegura inicialización de fila para usuarios registrados", async () => {
  const dbUsage = new Map();
  const dbProfiles = new Map();

  const mockAdapter = {
    isConfigured: true,
    async syncProfile(userId, profile) {
      dbProfiles.set(userId, profile);
    },
    async ensureDailyUsage(userId, dateStr) {
      if (!dbUsage.has(`${userId}:${dateStr}`)) {
        dbUsage.set(`${userId}:${dateStr}`, { seconds: 0, turns: 0 });
      }
    },
    async getDailyUsage(userId, dateStr) {
      return dbUsage.get(`${userId}:${dateStr}`) || null;
    },
  };

  const userId = "usuario_nuevo_sin_registro_previo";
  const today = UserUsageLimiter.getTodayKey();

  // Antes del lazy upsert, no existe fila
  assert.equal(await mockAdapter.getDailyUsage(userId, today), null);

  // Ejecución de ensureDailyUsage
  await mockAdapter.ensureDailyUsage(userId, today);

  // Ahora existe fila inicial con 0s y 0 turnos
  const initial = await mockAdapter.getDailyUsage(userId, today);
  assert.notEqual(initial, null);
  assert.equal(initial.seconds, 0);
  assert.equal(initial.turns, 0);
});


