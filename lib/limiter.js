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
