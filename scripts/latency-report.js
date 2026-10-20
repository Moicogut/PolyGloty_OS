#!/usr/bin/env node
/**
 * scripts/latency-report.js
 * Lee logs reales (cliente y servidor) y calcula promedio, p50 y p90 por tramo y total.
 *
 * REGLAS ESTRICTAS:
 * - Prohibido generar datos simulados o fijos.
 * - Si no existen logs reales o turnos registrados: reporta "NO VERIFICADO".
 * - Criterio de aceptación: p90 < 3000 ms con turnos reales.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Ubicaciones de logs reales
const logCandidates = [
  path.join(ROOT, "data", "latency_logs.jsonl"),
  path.join(ROOT, "data", "server.log"),
  path.join(ROOT, "latency_logs.jsonl"),
  path.join(ROOT, "client_turns.log"),
];

console.log("=== INFORME DE LATENCIA REAL (POLYGLOT VOICE) ===");

const rawLogs = [];

for (const p of logCandidates) {
  if (fs.existsSync(p)) {
    try {
      const content = fs.readFileSync(p, "utf8");
      const lines = content.split(/\r?\n/).filter(Boolean);
      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          if (entry.event === "turn_latency_measured" && entry.latency) {
            rawLogs.push(entry.latency);
          }
        } catch {
          // Línea no JSON o mensaje estándar
        }
      }
    } catch {
      // Error leyendo archivo de log
    }
  }
}

if (rawLogs.length === 0) {
  console.log("Estado: NO VERIFICADO");
  console.log("Razón: No se encontraron archivos de logs con eventos reales 'turn_latency_measured' en data/latency_logs.jsonl.");
  console.log("\nINSTRUCCIONES PARA PRUEBA HUMANA (20 turnos en celular):");
  console.log("1. Abrir la aplicación en celular real (Chrome Android y Safari iPhone).");
  console.log("2. Iniciar sesión y realizar al menos 20 turnos de conversación hablando y escuchando las respuestas.");
  console.log("3. Cada turno se registrará automáticamente en 'data/latency_logs.jsonl'.");
  console.log("4. Ejecutar 'node scripts/latency-report.js' para procesar los turnos reales recopilados.");
  process.exit(0);
}

function calcStats(values) {
  if (values.length === 0) return { count: 0, avg: 0, p50: 0, p90: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const avg = Math.round(sum / sorted.length);
  const p50Index = Math.floor(sorted.length * 0.5);
  const p90Index = Math.max(0, Math.ceil(sorted.length * 0.9) - 1);
  return {
    count: sorted.length,
    avg,
    p50: sorted[p50Index],
    p90: sorted[p90Index],
  };
}

const sttStats = calcStats(rawLogs.map((l) => Number(l.sttMs) || 0));
const modelStats = calcStats(rawLogs.map((l) => Number(l.modelMs) || 0));
const ttsStats = calcStats(rawLogs.map((l) => Number(l.ttsMs) || 0));
const totalStats = calcStats(rawLogs.map((l) => Number(l.totalMs) || 0));

console.log(`Muestras reales analizadas: ${rawLogs.length} turnos`);
console.log("----------------------------------------------------------------------------------");
console.log("| Tramo                     | Promedio (ms) | Percentil 50 (p50) | Percentil 90 (p90) |");
console.log("----------------------------------------------------------------------------------");
console.log(`| Reconocimiento (STT)      | ${String(sttStats.avg).padStart(13)} | ${String(sttStats.p50).padStart(18)} | ${String(sttStats.p90).padStart(18)} |`);
console.log(`| Inferencia Modelo (Gemini)| ${String(modelStats.avg).padStart(13)} | ${String(modelStats.p50).padStart(18)} | ${String(modelStats.p90).padStart(18)} |`);
console.log(`| Síntesis de Voz (TTS)     | ${String(ttsStats.avg).padStart(13)} | ${String(ttsStats.p50).padStart(18)} | ${String(ttsStats.p90).padStart(18)} |`);
console.log(`| TOTAL POR TURNO           | ${String(totalStats.avg).padStart(13)} | ${String(totalStats.p50).padStart(18)} | ${String(totalStats.p90).padStart(18)} |`);
console.log("----------------------------------------------------------------------------------");

if (totalStats.p90 < 3000) {
  console.log(`Resultado: Cumple criterio de latencia (P90 = ${totalStats.p90} ms < 3000 ms).`);
} else {
  console.log(`Resultado: P90 = ${totalStats.p90} ms excede el umbral objetivo de 3000 ms.`);
}
