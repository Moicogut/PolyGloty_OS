// Rate limiter en memoria con ventana deslizante (Sliding Window Counter).
// Protege los endpoints críticos y costosos (p. ej. OpenAI Realtime SDP) contra abusos o ataques DoS.

export class RateLimiter {
  constructor({ windowMs = 60_000, maxRequests = 10 } = {}) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.hits = new Map(); // key -> timestamps[]

    // Limpieza periódica para evitar fugas de memoria
    this.cleanupInterval = setInterval(() => this.cleanup(), Math.max(30_000, windowMs));
    if (this.cleanupInterval.unref) this.cleanupInterval.unref();
  }

  isAllowed(key, now = Date.now()) {
    const threshold = now - this.windowMs;
    let list = this.hits.get(key) || [];
    list = list.filter((t) => t > threshold);

    if (list.length >= this.maxRequests) {
      const oldest = list[0];
      const resetInMs = Math.max(1000, this.windowMs - (now - oldest));
      return { allowed: false, resetInSeconds: Math.ceil(resetInMs / 1000), count: list.length };
    }

    list.push(now);
    this.hits.set(key, list);
    return { allowed: true, remaining: this.maxRequests - list.length, count: list.length };
  }

  cleanup(now = Date.now()) {
    const threshold = now - this.windowMs;
    for (const [key, list] of this.hits.entries()) {
      const active = list.filter((t) => t > threshold);
      if (active.length === 0) {
        this.hits.delete(key);
      } else {
        this.hits.set(key, active);
      }
    }
  }

  reset() {
    this.hits.clear();
  }

  destroy() {
    clearInterval(this.cleanupInterval);
  }
}

/**
 * Limitador de Uso por Usuario / Alumno.
 * - Limite por minuto (máx 15 turnos/minuto para evitar spam o loops de IA).
 * - Límite por día: 30 minutos de conversación activa (aprox. 60 turnos estimados o 1800 segundos).
 */
export class UserUsageLimiter {
  constructor({
    maxTurnsPerMinute = 15,
    maxDailySeconds = Number(process.env.DAILY_MINUTES_LIMIT || 30) * 60,
    supabaseAdapter = null,
  } = {}) {
    this.maxTurnsPerMinute = maxTurnsPerMinute;
    this.maxDailySeconds = maxDailySeconds;
    this.supabaseAdapter = supabaseAdapter;
    this.userMinuteHits = new Map(); // userId -> timestamps[]
    this.userDailyUsage = new Map();  // userId -> { date: 'YYYY-MM-DD', turns: N, seconds: S }
  }

  static getTodayKey(now = Date.now()) {
    return new Date(now).toISOString().slice(0, 10);
  }

  static getSecondsUntilMidnight(now = Date.now()) {
    const d = new Date(now);
    const tomorrow = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    return Math.max(1, Math.ceil((tomorrow.getTime() - now) / 1000));
  }

  static getTimeUntilMidnight(now = Date.now()) {
    const diffSeconds = UserUsageLimiter.getSecondsUntilMidnight(now);
    const hours = Math.floor(diffSeconds / 3600);
    const minutes = Math.floor((diffSeconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }

  async checkAndTrackTurn(userId, estimatedTurnSeconds = 30, now = Date.now()) {
    const uid = userId || "default";
    const today = UserUsageLimiter.getTodayKey(now);

    // 1. Validar límite por minuto (ventana deslizante)
    const oneMinuteAgo = now - 60_000;
    let minuteHits = this.userMinuteHits.get(uid) || [];
    minuteHits = minuteHits.filter((t) => t > oneMinuteAgo);

    if (minuteHits.length >= this.maxTurnsPerMinute) {
      const oldest = minuteHits[0];
      const resetIn = Math.ceil(Math.max(1000, 60_000 - (now - oldest)) / 1000);
      return {
        allowed: false,
        reason: "minute_limit",
        error: "limite_minuto",
        message: `Estás enviando mensajes muy rápido. Espera ${resetIn} segundos para continuar.`,
        resetIn,
      };
    }

    // 2. Validar límite diario (configurable por DAILY_MINUTES_LIMIT)
    let daily = this.userDailyUsage.get(uid);
    if (!daily || daily.date !== today) {
      if (this.supabaseAdapter) {
        const fromDb = await this.supabaseAdapter.getDailyUsage(uid, today);
        if (fromDb) {
          daily = { date: today, turns: fromDb.turns, seconds: fromDb.seconds };
        }
      }
      if (!daily || daily.date !== today) {
        daily = { date: today, turns: 0, seconds: 0 };
      }
    }

    if (daily.seconds >= this.maxDailySeconds) {
      const resetIn = UserUsageLimiter.getSecondsUntilMidnight(now);
      const resetTime = UserUsageLimiter.getTimeUntilMidnight(now);
      return {
        allowed: false,
        reason: "daily_limit",
        error: "limite_diario",
        message: "Llegaste al límite de hoy. Vuelve mañana.",
        resetIn,
        resetTime,
      };
    }

    // Registrar turno
    minuteHits.push(now);
    this.userMinuteHits.set(uid, minuteHits);

    const secondsDelta = Math.min(120, Math.max(10, estimatedTurnSeconds));
    daily.turns += 1;
    daily.seconds += secondsDelta;
    this.userDailyUsage.set(uid, daily);

    if (this.supabaseAdapter) {
      this.supabaseAdapter.trackDailyUsage(uid, today, daily.seconds, daily.turns).catch(() => {});
    }

    return {
      allowed: true,
      turnsToday: daily.turns,
      secondsToday: daily.seconds,
      remainingSecondsToday: Math.max(0, this.maxDailySeconds - daily.seconds),
    };
  }
}

