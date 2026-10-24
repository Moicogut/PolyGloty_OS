#!/usr/bin/env node
/**
 * scripts/smoke.js
 * Prueba de humo real para Polyglot Voice:
 * Abre una sesión real usando las variables de entorno configuradas (GEMINI_API_KEY o OPENAI_API_KEY),
 * envía una frase de prueba en tiempo real y verifica una respuesta válida.
 *
 * REGLA ESTRICTA: Sin claves disponibles = imprime NO VERIFICADO y termina limpiamente.
 * Nunca imprime valores de tokens ni claves; solo nombres y longitudes.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Cargar .env si existe
try {
  const envPath = path.join(ROOT, ".env");
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m && !(m[1] in process.env)) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    }
  }
} catch {
  // Sin .env
}

const geminiKey = process.env.GEMINI_API_KEY;
const openaiKey = process.env.OPENAI_API_KEY;

console.log("=== POLYGLOT VOICE - PRUEBA DE HUMO (SMOKE TEST) ===");

if (!geminiKey && !openaiKey) {
  console.log("Estado: NO VERIFICADO");
  console.log("Razón: No se encontraron variables de entorno GEMINI_API_KEY ni OPENAI_API_KEY en el entorno o .env.");
  console.log("Acción: Proporcionar credenciales reales en un entorno controlado para ejecutar la prueba en vivo.");
  process.exit(0);
}

// Mostrar presencia de claves sin exponer su valor
if (geminiKey) {
  console.log(`GEMINI_API_KEY: Configurada (longitud: ${geminiKey.length} caracteres)`);
}
if (openaiKey) {
  console.log(`OPENAI_API_KEY: Configurada (longitud: ${openaiKey.length} caracteres)`);
}

const testPhrase = "Hello Alex, I want to practice ordering a coffee.";
const modelToTest = process.env.VOICE_MODEL || "gemini-3.5-flash";

console.log(`Modelo objetivo: ${modelToTest}`);
console.log(`Frase de prueba enviada: "${testPhrase}"`);

async function runSmokeTest() {
  const start = Date.now();
  if (geminiKey) {
    const candidateList = [
      modelToTest,
      "gemini-3.5-flash",
      "gemini-3.1-flash-lite",
      "gemini-3.8-flash",
      "gemini-flash-latest",
    ];

    let reply = "";
    let lastError = "";

    for (const model of candidateList) {
      if (model === "gemini-3.8-live") continue; // Este modelo es exclusivamente WebSocket bidiGenerateContent
      try {
        const endpoint = model.startsWith("models/") ? model.replace("models/", "") : model;
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${endpoint}:generateContent?key=${geminiKey}`;
        
        let attempts = 0;
        while (attempts < 2) {
          attempts++;
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  role: "user",
                  parts: [{ text: testPhrase }],
                },
              ],
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 100,
              },
            }),
            signal: AbortSignal.timeout(15000),
          });

          const data = await res.json();
          if (res.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
            reply = data.candidates[0].content.parts[0].text;
            const elapsedMs = Date.now() - start;
            console.log(`Modelo activo confirmado: ${model}`);
            console.log(`Respuesta del tutor recibida en ${elapsedMs} ms:`);
            console.log(`"${reply.trim().slice(0, 160)}..."`);
            console.log("Estado: VERIFICADO (Éxito)");
            return;
          }

          lastError = data.error?.message || `HTTP ${res.status}`;
          if (lastError.includes("high demand") && attempts < 2) {
            console.log(`Aviso: alta demanda temporal en ${model}, reintentando en 2 segundos...`);
            await new Promise((r) => setTimeout(r, 2000));
            continue;
          }
          console.log(`Aviso: modelo ${model} no disponible (${lastError}), probando siguiente...`);
          break;
        }
      } catch (err) {
        lastError = err.message;
        console.log(`Aviso: error con modelo ${model} (${lastError}), probando siguiente...`);
      }
    }

    if (openaiKey) {
      console.log("Aviso: Gemini no respondió inmediatamente, ejecutando fallback con OpenAI API...");
    } else {
      console.error("No se pudo obtener respuesta de ningún modelo candidato. Último error:", lastError);
      console.log("Estado: FALLIDO");
      process.exitCode = 1;
      return;
    }
  }

  if (openaiKey) {

    // Si solo hay clave OpenAI disponible
    try {
      const res = await fetch(`${process.env.OPENAI_BASE_URL || "https://api.openai.com"}/v1/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: testPhrase }],
          max_tokens: 150,
        }),
        signal: AbortSignal.timeout(15000),
      });
      const data = await res.json();
      const elapsedMs = Date.now() - start;
      if (!res.ok) {
        console.error(`Error OpenAI HTTP ${res.status}:`, data.error?.message);
        console.log("Estado: FALLIDO");
        process.exit(1);
      }
      const reply = data.choices?.[0]?.message?.content;
      console.log(`Respuesta recibida en ${elapsedMs} ms: "${reply.trim().slice(0, 160)}..."`);
      console.log("Estado: VERIFICADO (Éxito)");
      process.exit(0);
    } catch (err) {
      console.error("Error en conexión OpenAI:", err.message);
      console.log("Estado: NO VERIFICADO");
      process.exit(1);
    }
  }
}

runSmokeTest();
