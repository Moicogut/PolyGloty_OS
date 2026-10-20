import fs from "node:fs";
import path from "node:path";

// Logger estructurado en formato JSON para observabilidad de SaaS y CRM.
// Emite logs estructurados con timestamp ISO, severidad, tenantId y métricas de latencia.

export const LogLevel = {
  INFO: "INFO",
  WARN: "WARN",
  ERROR: "ERROR",
  DEBUG: "DEBUG",
};

export class Logger {
  constructor(service = "polyglot-voice") {
    this.service = service;
  }

  log(level, event, metadata = {}, tenantId = "default") {
    const entry = {
      timestamp: new Date().toISOString(),
      service: this.service,
      level,
      event,
      tenantId,
      ...metadata,
    };
    const jsonStr = JSON.stringify(entry);
    if (level === LogLevel.ERROR) {
      console.error(jsonStr);
    } else if (level === LogLevel.WARN) {
      console.warn(jsonStr);
    } else {
      console.log(jsonStr);
    }

    // Persistir logs estructurados en data/latency_logs.jsonl
    try {
      const logsDir = path.resolve(process.cwd(), "data");
      if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
      fs.appendFileSync(path.join(logsDir, "latency_logs.jsonl"), jsonStr + "\n");
    } catch {
      // Ignorar fallos de escritura en disco para no interrumpir el flujo principal
    }
  }

  info(event, metadata, tenantId) {
    this.log(LogLevel.INFO, event, metadata, tenantId);
  }

  warn(event, metadata, tenantId) {
    this.log(LogLevel.WARN, event, metadata, tenantId);
  }

  error(event, metadata, tenantId) {
    this.log(LogLevel.ERROR, event, metadata, tenantId);
  }

  logTurnLatency({ sttMs = 0, modelMs = 0, ttsMs = 0, totalMs = 0, lang = "en" }, tenantId = "default") {
    this.log(LogLevel.INFO, "turn_latency_measured", {
      latency: {
        sttMs: Math.round(sttMs),
        modelMs: Math.round(modelMs),
        ttsMs: Math.round(ttsMs),
        totalMs: Math.round(totalMs),
      },
      lang,
    }, tenantId);
  }
}

export const logger = new Logger();
