// Cliente asíncrono para análisis de tonos con Web Worker y fallback automático.
// Asegura que la UI permanezca a 60 fps mientras se calcula f0/YIN.

import { analyze as analyzeMainThread } from "./tone.js";

let worker = null;
let reqId = 0;
const pending = new Map();

function initWorker() {
  if (typeof Worker === "undefined") return null;
  try {
    const w = new Worker(new URL("./tone.worker.js", import.meta.url), { type: "module" });
    w.onmessage = (e) => {
      const { id, ok, result, error } = e.data;
      const resolver = pending.get(id);
      if (resolver) {
        pending.delete(id);
        if (ok) resolver.resolve(result);
        else resolver.reject(new Error(error));
      }
    };
    w.onerror = (err) => {
      console.warn("Error en ToneWorker, usando fallback de hilo principal:", err);
      // Rechazar pendientes y limpiar worker
      for (const [, resolver] of pending.entries()) {
        resolver.reject(err);
      }
      pending.clear();
      worker = null;
    };
    return w;
  } catch (e) {
    console.warn("No se pudo iniciar Web Worker para tonos. Fallback a hilo principal.", e);
    return null;
  }
}

export async function analyzeAsync(samples, sr, tones) {
  if (!worker) {
    worker = initWorker();
  }

  if (!worker) {
    // Fallback síncrono al hilo principal si no hay soporte para Web Workers
    return analyzeMainThread(samples, sr, tones);
  }

  const id = ++reqId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    try {
      worker.postMessage({ id, samples, sr, tones });
    } catch (err) {
      pending.delete(id);
      // Fallback inmediato
      resolve(analyzeMainThread(samples, sr, tones));
    }
  });
}
