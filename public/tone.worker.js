// Web Worker dedicado para análisis de tonos (YIN, f0 y contornos)
// Desacopla el procesamiento intensivo de audio del hilo principal (UI).

import { analyze } from "./tone.js";

self.onmessage = (e) => {
  const { id, samples, sr, tones } = e.data;
  try {
    const result = analyze(samples, sr, tones);
    self.postMessage({ id, ok: true, result });
  } catch (err) {
    self.postMessage({ id, ok: false, error: err.message || "Error procesando tonos en el worker" });
  }
};
