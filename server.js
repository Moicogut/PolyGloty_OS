import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openStore, TenantRepository, sanitizeTenantId } from "./lib/store.js";
import { buildSession, buildGeminiSession, runTool, snapshot, MISSIONS, LANGS, award } from "./lib/tutor.js";
import { schedule, dueQueue, preview, gradeFromTone } from "./lib/srs.js";
import { validateGradePayload, validateDrillPayload, validateToolPayload, validateChatPayload, ValidationError } from "./lib/validator.js";
import { logger } from "./lib/logger.js";
import { RateLimiter, UserUsageLimiter } from "./lib/limiter.js";
import { SupabaseAdapter } from "./lib/supabase.js";

const ROOT = path.dirname(fileURLToPath(import.meta.url));

// Cargador mínimo de .env (sin dependencias)
try {
  for (const line of fs.readFileSync(path.join(ROOT, ".env"), "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch { /* sin .env */ }

const PORT = Number(process.env.PORT || 3000);
const PROVIDER = process.env.VOICE_PROVIDER || (process.env.GEMINI_API_KEY ? "gemini" : "openai");
const VOICE_MODEL = process.env.VOICE_MODEL || (PROVIDER === "gemini" ? (process.env.GEMINI_LIVE_MODEL || "gemini-2.0-flash") : (process.env.REALTIME_MODEL || "gpt-realtime-2.1"));
const VOICE_BACKUP_MODEL = process.env.VOICE_BACKUP_MODEL || (PROVIDER === "gemini" ? "gemini-1.5-flash" : "gpt-realtime");
const MODEL = VOICE_MODEL; // compatibilidad retroactiva
const VOICE = process.env.REALTIME_VOICE || "marin";
const GEMINI_MODEL = VOICE_MODEL.startsWith("models/") ? VOICE_MODEL : `models/${VOICE_MODEL}`;
const repo = new TenantRepository(path.join(ROOT, "data"));
const supabase = new SupabaseAdapter({ tenantRepo: repo });
// Rate limiter: Máximo de solicitudes por minuto por cliente (usa user_id si está autenticado, sino IP)
const sessionLimiter = new RateLimiter({ windowMs: 60_000, maxRequests: Number(process.env.MAX_SESSIONS_PER_MIN || 15) });
// User Usage Limiter: control por minuto (máx 15 turnos) y cuota diaria configurable guardada en Supabase (por defecto 30 minutos)
const DAILY_MINUTES_LIMIT = Number(process.env.DAILY_MINUTES_LIMIT || 30);
const userUsageLimiter = new UserUsageLimiter({
  maxTurnsPerMinute: Number(process.env.MAX_TURNS_PER_MIN || 15),
  maxDailySeconds: DAILY_MINUTES_LIMIT * 60,
  supabaseAdapter: supabase,
});

const getClientIp = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  return typeof forwarded === "string" ? forwarded.split(",")[0].trim() : req.socket?.remoteAddress || "127.0.0.1";
};

const resolveTenantStore = (req, url) => {
  const fromHeader = req.headers["x-user-id"] || req.headers["x-tenant-id"];
  const fromQuery = url?.searchParams?.get("user_id") || url?.searchParams?.get("tenant_id");
  return repo.getStore(fromHeader || fromQuery || "default");
};
const PUB = path.join(ROOT, "public");
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".json": "application/json" };

const send = (res, code, body, type = "application/json", extraHeaders = {}) => {
  res.writeHead(code, { "Content-Type": type, "Cache-Control": "no-store", ...extraHeaders });
  res.end(typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body));
};
const readBody = (req, max = 256 * 1024) => new Promise((resolve, reject) => {
  let n = 0; const chunks = [];
  req.on("data", (c) => { n += c.length; if (n > max) { reject(new Error("cuerpo demasiado grande")); req.destroy(); } else chunks.push(c); });
  req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  req.on("error", reject);
});
const json = async (req) => { const t = await readBody(req); return t ? JSON.parse(t) : {}; };

// Esta app gasta tu clave de API: solo acepta peticiones del mismo origen.
const sameOrigin = (req) => {
  const o = req.headers.origin;
  if (!o) return req.method === "GET";
  try {
    const originHost = new URL(o).host;
    const reqHost = req.headers["x-forwarded-host"] || req.headers.host;
    return originHost === reqHost || originHost === req.headers.host;
  } catch { return false; }
};

const lang = (v) => (v === "zh" ? "zh" : "en");

const routes = {
  "GET /api/state": (req, res, url) => {
    const state = resolveTenantStore(req, url);
    send(res, 200, {
      ...snapshot(state, lang(url.searchParams.get("lang"))),
      missions: MISSIONS,
      langs: LANGS,
      model: PROVIDER === "gemini" ? GEMINI_MODEL : MODEL,
      provider: PROVIDER,
      hasKey: PROVIDER === "gemini" ? Boolean(process.env.GEMINI_API_KEY) : Boolean(process.env.OPENAI_API_KEY),
      tenantId: state.tenantId,
      profile: {
        email: state.data.profile?.email || null,
        isDefault: state.tenantId === "default",
      },
    });
  },

  "POST /api/auth/register": async (req, res, url) => {
    try {
      const b = await json(req);
      const user = await supabase.register(b);
      logger.info("user_registered", { email: user.email, provider: user.provider }, user.id);
      send(res, 200, user);
    } catch (err) {
      send(res, 400, { error: err.message || "No pudimos crear tu cuenta. Intenta nuevamente." });
    }
  },

  "POST /api/auth/login": async (req, res, url) => {
    try {
      const b = await json(req);
      const user = await supabase.login(b);
      logger.info("user_logged_in", { email: user.email, provider: user.provider }, user.id);
      send(res, 200, user);
    } catch (err) {
      send(res, 400, { error: err.message || "Correo o contraseña incorrectos." });
    }
  },

  "POST /api/auth/reset-password": async (req, res, url) => {
    try {
      const b = await json(req);
      const result = await supabase.recoverPassword(b);
      logger.info("password_recovery_requested", { email: b.email }, "auth");
      send(res, 200, result);
    } catch (err) {
      send(res, 400, { error: err.message || "No pudimos procesar la recuperación de contraseña." });
    }
  },

  "GET /api/auth/me": (req, res, url) => {
    const state = resolveTenantStore(req, url);
    send(res, 200, {
      id: state.tenantId,
      email: state.data.profile?.email || null,
      isDefault: state.tenantId === "default",
    });
  },

  "GET /health": (req, res) => {
    send(res, 200, {
      ok: true,
      status: "ok",
      service: "polyglot-voice",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
    });
  },

  "POST /api/conversations": async (req, res, url) => {
    const state = resolveTenantStore(req, url);
    try {
      const b = await json(req);
      await supabase.saveConversation(state.tenantId, b);
      send(res, 200, { ok: true });
    } catch (err) {
      send(res, 400, { error: err.message });
    }
  },

  "POST /api/session-vocab/remove": async (req, res, url) => {
    const state = resolveTenantStore(req, url);
    try {
      const b = await json(req);
      if (Array.isArray(state.data.sessionVocab) && b.word) {
        state.data.sessionVocab = state.data.sessionVocab.filter(
          (v) => v.word.toLowerCase() !== String(b.word).toLowerCase()
        );
        state.save();
      }
      send(res, 200, { ok: true, count: state.data.sessionVocab?.length || 0 });
    } catch (err) {
      send(res, 400, { error: err.message });
    }
  },

  "POST /api/session": async (req, res, url) => {
    const start = Date.now();
    const clientIp = getClientIp(req);
    const state = resolveTenantStore(req, url);
    // En rutas autenticadas la clave del limiter es el user_id; si no, IP
    const limiterKey = state.tenantId && state.tenantId !== "default" ? state.tenantId : clientIp;
    const limitCheck = sessionLimiter.isAllowed(limiterKey);

    if (!limitCheck.allowed) {
      logger.warn("rate_limit_exceeded", { key: limiterKey, resetInSeconds: limitCheck.resetInSeconds }, state.tenantId);
      return send(res, 429, { error: `Límite de solicitudes alcanzado. Intenta de nuevo en ${limitCheck.resetInSeconds} segundos.` }, "application/json", { "Retry-After": String(limitCheck.resetInSeconds) });
    }

    // Ruta de proveedor Gemini (Conversacional en tiempo real)
    const isGemini = PROVIDER === "gemini" || req.headers["content-type"]?.includes("json") || url.searchParams.get("provider") === "gemini";
    if (isGemini) {
      const gkey = process.env.GEMINI_API_KEY;
      if (!gkey) return send(res, 503, { error: "Falta GEMINI_API_KEY en el archivo .env" });
      const cfg = buildGeminiSession({
        lang: lang(url.searchParams.get("lang")),
        level: url.searchParams.get("level"),
        missionId: url.searchParams.get("mission"),
        state: state.data,
        model: GEMINI_MODEL,
      });
      logger.info("gemini_session_created", { latencyMs: Date.now() - start, model: GEMINI_MODEL }, state.tenantId);
      return send(res, 200, {
        provider: "gemini",
        model: GEMINI_MODEL,
        systemInstruction: cfg.systemInstruction,
        lang: cfg.lang,
        level: cfg.level,
      });
    }

    // Ruta de proveedor OpenAI Realtime (WebRTC SDP)
    const key = process.env.OPENAI_API_KEY;
    if (!key) return send(res, 503, { error: "Falta OPENAI_API_KEY en el archivo .env" });
    const sdp = await readBody(req, 64 * 1024);
    if (!sdp.trim()) return send(res, 400, { error: "Falta la oferta SDP" });

    let cfg;
    try {
      cfg = buildSession({ lang: lang(url.searchParams.get("lang")), level: url.searchParams.get("level"), missionId: url.searchParams.get("mission"), state: state.data, model: MODEL, voice: VOICE });
    } catch (e) { return send(res, 400, { error: e.message }); }
    const fd = new FormData();
    fd.set("sdp", sdp);
    fd.set("session", JSON.stringify(cfg));
    try {
      const r = await fetch(`${process.env.OPENAI_BASE_URL || "https://api.openai.com"}/v1/realtime/calls`, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}` },
        body: fd,
        signal: AbortSignal.timeout(15000),
      });
      const text = await r.text();
      const latencyMs = Date.now() - start;
      if (!r.ok) {
        logger.error("openai_session_error", { status: r.status, latencyMs, message: text.slice(0, 300) }, state.tenantId);
        return send(res, r.status, { error: `OpenAI respondió ${r.status}: ${text.slice(0, 400)}` });
      }
      logger.info("session_created", { latencyMs, ip: clientIp, model: MODEL }, state.tenantId);
      return send(res, 200, text, "application/sdp");
    } catch (e) {
      const isTimeout = e.name === "TimeoutError";
      const latencyMs = Date.now() - start;
      logger.error("session_network_error", { error: e.message, isTimeout, latencyMs }, state.tenantId);
      return send(res, isTimeout ? 504 : 502, { error: isTimeout ? "Timeout al conectar con OpenAI Realtime API (15s)" : `Fallo de red hacia OpenAI: ${e.message}` });
    }
  },

  "GET /favicon.ico": (req, res) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#6366f1"/><text x="16" y="22" font-size="18" text-anchor="middle" fill="#ffffff">✨</text></svg>`;
    send(res, 200, svg, "image/svg+xml");
  },

  "POST /api/chat": async (req, res, url) => {
    const key = process.env.GEMINI_API_KEY;
    if (!key) return send(res, 503, { error: "Falta GEMINI_API_KEY en el archivo .env" });

    let b;
    try {
      b = validateChatPayload(await json(req));
    } catch (err) {
      return send(res, 400, { error: err.message });
    }

    const state = resolveTenantStore(req, url);

    // Verificación de límites por usuario (turnos por minuto y cuota diaria configurable guardada en Supabase)
    const limitCheck = await userUsageLimiter.checkAndTrackTurn(state.tenantId);
    if (!limitCheck.allowed) {
      logger.warn("user_quota_exceeded", { reason: limitCheck.reason, tenantId: state.tenantId });
      if (limitCheck.reason === "daily_limit") {
        return send(res, 429, {
          error: "limite_diario",
          message: limitCheck.message,
          resetIn: limitCheck.resetIn,
          resetTime: limitCheck.resetTime,
        }, "application/json", { "Retry-After": String(limitCheck.resetIn) });
      }
      return send(res, 429, {
        error: limitCheck.error || "limite_excedido",
        message: limitCheck.message,
        resetIn: limitCheck.resetIn,
        resetInSeconds: limitCheck.resetIn,
      }, "application/json", { "Retry-After": String(limitCheck.resetIn) });
    }

    const langCode = lang(b.lang);
    let geminiContents = b.messages.map((m) => {
      if (m.parts && Array.isArray(m.parts)) return m;
      return {
        role: m.role === "assistant" || m.role === "model" ? "model" : "user",
        parts: [{ text: String(m.content || m.text || "") }],
      };
    });

    const cfg = buildGeminiSession({
      lang: langCode,
      level: b.level,
      missionId: b.mission,
      state: state.data,
      model: GEMINI_MODEL,
    });

    const candidateModels = [
      VOICE_MODEL,
      VOICE_BACKUP_MODEL,
      "gemini-2.0-flash",
      "gemini-1.5-flash",
    ].filter(Boolean);
    let rawText = "";
    let lastError = null;
    const modelStart = Date.now();

    try {
      for (const candModel of candidateModels) {
        try {
          const modelEndpoint = candModel.startsWith("models/") ? candModel.replace("models/", "") : candModel;
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelEndpoint}:generateContent?key=${key}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: cfg.systemInstruction }] },
              contents: geminiContents,
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 800,
                responseMimeType: "application/json",
              },
            }),
            signal: AbortSignal.timeout(15000),
          });

          const data = await response.json();
          if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
            rawText = data.candidates[0].content.parts[0].text;
            break;
          }
          lastError = data.error?.message || `Status ${response.status}`;
          logger.warn("gemini_model_retry", { model: candModel, status: response.status, error: lastError }, state.tenantId);
        } catch (err) {
          lastError = err.message;
          logger.warn("gemini_fetch_retry", { model: candModel, error: err.message }, state.tenantId);
        }
      }

      if (!rawText) {
        logger.error("gemini_all_models_failed", { error: lastError }, state.tenantId);
        return send(res, 503, { error: `Gemini temporalmente no disponible: ${lastError || "Servidores ocupados"}` });
      }

      let parsed = { reply: "", translation: "", vocabulary: [], feedback: null };
      try {
        parsed = JSON.parse(rawText.trim());
      } catch {
        const m = rawText.match(/\{[\s\S]*\}/);
        if (m) {
          try { parsed = JSON.parse(m[0]); } catch {}
        }
      }

      // Si aún no hay reply limpio, extraerlo con regex de las claves JSON o usar texto plano sin llaves
      if (!parsed.reply) {
        const replyMatch = rawText.match(/"reply"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/i);
        if (replyMatch) {
          try {
            parsed.reply = JSON.parse(`"${replyMatch[1]}"`);
          } catch {
            parsed.reply = replyMatch[1];
          }
        } else {
          parsed.reply = rawText.replace(/[{}"[\]]/g, "").trim();
        }
      }

      if (!parsed.translation) {
        const transMatch = rawText.match(/"translation"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/i);
        if (transMatch) {
          try {
            parsed.translation = JSON.parse(`"${transMatch[1]}"`);
          } catch {
            parsed.translation = transMatch[1];
          }
        }
      }

      // Actualizar competencias de proceso si el feedback contiene notas o puntuaciones
      if (parsed.feedback) {
        const comp = state.data.competencies || { grammar: 60, vocabulary: 65, fluency: 55, comprehension: 70, milestones: [] };
        const sc = parsed.feedback.scores || parsed.feedback;
        if (Number.isFinite(sc.grammarScore || sc.grammar)) comp.grammar = Math.min(100, Math.round(comp.grammar * 0.7 + (sc.grammarScore || sc.grammar) * 0.3));
        if (Number.isFinite(sc.vocabScore || sc.vocabulary)) comp.vocabulary = Math.min(100, Math.round(comp.vocabulary * 0.7 + (sc.vocabScore || sc.vocabulary) * 0.3));
        if (Number.isFinite(sc.fluencyScore || sc.fluency)) comp.fluency = Math.min(100, Math.round(comp.fluency * 0.7 + (sc.fluencyScore || sc.fluency) * 0.3));
        if (Number.isFinite(sc.comprehensionScore || sc.comprehension)) comp.comprehension = Math.min(100, Math.round(comp.comprehension * 0.7 + (sc.comprehensionScore || sc.comprehension) * 0.3));
        const msId = parsed.feedback.milestoneId || parsed.feedback.milestone;
        if (msId && typeof msId === "string" && !comp.milestones.includes(msId)) {
          comp.milestones.push(msId);
        }
        state.data.competencies = comp;
      }

      // Registrar nuevo vocabulario de avance de la sesión
      if (Array.isArray(parsed.vocabulary) && parsed.vocabulary.length > 0) {
        if (!Array.isArray(state.data.sessionVocab)) state.data.sessionVocab = [];
        for (const item of parsed.vocabulary) {
          if (item && item.word && !state.data.sessionVocab.some((v) => v.word.toLowerCase() === item.word.toLowerCase())) {
            state.data.sessionVocab.unshift({
              word: item.word,
              translation: item.translation || "",
              phonetic: item.phonetic || "",
              pos: item.pos || "vocab",
              lang: langCode,
              addedAt: Date.now(),
            });
          }
        }
        if (state.data.sessionVocab.length > 60) state.data.sessionVocab.splice(60);
      }

      state.rollDay();
      state.data.daily.turns += 1;
      const xp = award(state, 8);
      state.save();

      const modelMs = Date.now() - modelStart;
      const clientSttMs = Number(b.sttMs) || 0;
      logger.logTurnLatency({
        sttMs: clientSttMs,
        modelMs,
        ttsMs: 0,
        totalMs: clientSttMs + modelMs,
        lang: langCode,
      }, state.tenantId);

      return send(res, 200, {
        reply: parsed.reply || "",
        translation: parsed.translation || "",
        vocabulary: Array.isArray(parsed.vocabulary) ? parsed.vocabulary : [],
        feedback: parsed.feedback || null,
        competencies: state.data.competencies,
        xp,
        latency: {
          modelMs,
          sttMs: clientSttMs,
        },
      });
    } catch (err) {
      logger.error("gemini_chat_exception", { error: err.message }, state.tenantId);
      return send(res, 502, { error: `Error conectando con Gemini: ${err.message}` });
    }
  },

  "POST /api/tool": async (req, res, url) => {
    let payload;
    try {
      payload = validateToolPayload(await json(req));
    } catch (e) {
      return send(res, 400, { error: e.message });
    }
    const state = resolveTenantStore(req, url);
    const out = runTool(state, payload.name, payload.args, { lang: payload.lang, mission: payload.mission, done: payload.done });
    logger.info("tool_executed", { tool: payload.name, xpGained: out.fx?.xp || 0 }, state.tenantId);
    send(res, 200, out);
  },

  "POST /api/turn": async (req, res, url) => {
    const state = resolveTenantStore(req, url);
    state.rollDay(); state.data.daily.turns += 1;
    const xp = award(state, 8); state.save();
    send(res, 200, { xp });
  },

  "GET /api/cards": (req, res, url) => {
    const state = resolveTenantStore(req, url);
    const l = url.searchParams.get("lang");
    send(res, 200, state.data.cards.filter((c) => !l || c.lang === l));
  },

  "GET /api/cards/due": (req, res, url) => {
    const state = resolveTenantStore(req, url);
    const l = url.searchParams.get("lang");
    const pool = state.data.cards.filter((c) => !l || c.lang === l);
    const now = Date.now();
    send(res, 200, dueQueue(pool, now, 30).map((c) => ({ ...c, preview: preview(c, now) })));
  },

  "POST /api/cards/grade": async (req, res, url) => {
    let b;
    try {
      b = validateGradePayload(await json(req));
    } catch (e) {
      return send(res, 400, { error: e.message });
    }
    const state = resolveTenantStore(req, url);
    const i = state.data.cards.findIndex((c) => c.id === b.id);
    if (i < 0) return send(res, 404, { error: "tarjeta no encontrada" });
    try {
      state.data.cards[i] = schedule(state.data.cards[i], b.grade);
    } catch (e) {
      return send(res, 400, { error: e.message });
    }
    state.rollDay(); state.data.daily.reviews += 1;
    const xp = award(state, b.grade >= 2 ? 3 : 1); state.save();
    send(res, 200, { xp, card: state.data.cards[i] });
  },

  "POST /api/drill": async (req, res, url) => {
    let b;
    try {
      b = validateDrillPayload(await json(req));
    } catch (e) {
      return send(res, 400, { error: e.message });
    }
    const state = resolveTenantStore(req, url);
    const score = b.score;
    state.rollDay();
    let xp = 0;
    if (score >= 70) {
      state.data.daily.drills += 1;
      xp = score >= 90 ? 20 : 10;
    } else {
      runTool(state, "log_error", { category: "tone", said: b.text, better: b.expected }, { lang: "zh" });
    }
    xp = award(state, xp);
    if (b.cardId) {
      const card = state.data.cards.find((c) => c.id === b.cardId);
      if (card) card.toneBest = Math.max(card.toneBest || 0, score);
    }
    state.save();
    send(res, 200, { xp, suggestedGrade: gradeFromTone(score) });
  },
};

export async function handleRequest(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const key = `${req.method} ${url.pathname}`;
    if (routes[key]) {
      if (req.method !== "GET" && !sameOrigin(req)) return send(res, 403, { error: "Origen no permitido" });
      return await routes[key](req, res, url);
    }
    if (req.method !== "GET") return send(res, 404, { error: "No encontrado" });
    const rel = url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname.slice(1));
    const file = path.join(PUB, rel);
    if (!file.startsWith(PUB + path.sep)) return send(res, 403, "Prohibido", "text/plain");
    const data = await fs.promises.readFile(file).catch(() => null);
    if (!data) return send(res, 404, "No encontrado", "text/plain");
    send(res, 200, data, MIME[path.extname(file)] || "application/octet-stream");
  } catch (e) {
    console.error(e);
    if (!res.headersSent) send(res, 500, { error: e.message });
  }
}

export const server = http.createServer(handleRequest);

const HOST = process.env.HOST || "0.0.0.0";
if (process.env.NODE_ENV !== "test" && !process.env.TEST_MODE) {
  server.listen(PORT, HOST, () => {
    console.log(`Polyglot Voice en http://${HOST}:${PORT}  (modelo: ${MODEL})`);
    if (!process.env.OPENAI_API_KEY && !process.env.GEMINI_API_KEY) console.log("Aviso: sin API keys solo funcionan los tonos y el repaso.");
  });
}

