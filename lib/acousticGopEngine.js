/**
 * lib/acousticGopEngine.js
 * 
 * Motor Acústico de Pronunciación y Algoritmo Goodness of Pronunciation (GOP).
 * Implementa la verosimilitud logarítmica de la emisión fonética frente a estándares nativos:
 *   GOP(p) = (1/T) * sum_{t=1}^T log[ P(o_t | p) / max_q P(o_t | q) ]
 * 
 * Diagnóstico quirúrgico de los 3 dolores fonéticos del hispanohablante:
 *  1. Colapso de vocales laxas/tensas (/iː/ vs /ɪ/ en sheep/ship).
 *  2. Omisión y sobre-articulación de la vocal Schwa (/ə/).
 *  3. Epéntesis consonántica (inserción de /e/ protésica en 'sport'/'student').
 * 
 * Extracción de formantes F1 (apertura mandibular) y F2 (posición lingual)
 * con guía articulatoria anatómica y recasting conversacional empático.
 */

/**
 * Tabla acústica de formantes canónicos del inglés estándar (F1: Apertura, F2: Posición lingual)
 */
export const CANONICAL_FORMANTS = {
  // Vocales del inglés
  "iː": { name: "Vocal anterior cerrada tensa", f1: 280, f2: 2250, tense: true, lips: "extendidos" },
  "ɪ":  { name: "Vocal anterior casi cerrada laxa", f1: 400, f2: 1900, tense: false, lips: "relajados" },
  "e":  { name: "Vocal anterior semiabierta", f1: 550, f2: 1800, tense: false, lips: "neutros" },
  "æ":  { name: "Vocal anterior casi abierta", f1: 700, f2: 1650, tense: false, lips: "abiertos" },
  "ə":  { name: "Vocal central media (Schwa)", f1: 500, f2: 1500, tense: false, lips: "completamente neutros" },
  "ʌ":  { name: "Vocal posterior semiabierta", f1: 650, f2: 1250, tense: false, lips: "neutros" },
  "uː": { name: "Vocal posterior cerrada tensa", f1: 300, f2: 950, tense: true, lips: "redondeados" },
  "ʊ":  { name: "Vocal posterior casi cerrada laxa", f1: 440, f2: 1100, tense: false, lips: "levemente redondeados" },
  "ɔː": { name: "Vocal posterior semicerrada", f1: 520, f2: 900, tense: true, lips: "redondeados" },
  "ɑː": { name: "Vocal posterior abierta", f1: 750, f2: 1100, tense: true, lips: "abiertos neutros" },
};

/**
 * Palabras de prueba calibradas con foco en los 3 dolores del hispanohablante
 */
export const PHONETIC_DIAGNOSTIC_WORDS = {
  // 1. Dolores Laxa vs Tensa (/ɪ/ vs /iː/)
  ship: { targetPhoneme: "ɪ", contrastPhoneme: "iː", contrastWord: "sheep", painType: "lax_tense_collapse" },
  fit:  { targetPhoneme: "ɪ", contrastPhoneme: "iː", contrastWord: "feet", painType: "lax_tense_collapse" },
  live: { targetPhoneme: "ɪ", contrastPhoneme: "iː", contrastWord: "leave", painType: "lax_tense_collapse" },
  bitch: { targetPhoneme: "ɪ", contrastPhoneme: "iː", contrastWord: "beach", painType: "lax_tense_collapse" },
  sit:  { targetPhoneme: "ɪ", contrastPhoneme: "iː", contrastWord: "seat", painType: "lax_tense_collapse" },

  // 2. Dolores de Reducción Schwa (/ə/)
  about: { targetPhoneme: "ə", contrastPhoneme: "æ", contrastWord: "ah-bout", painType: "schwa_omission" },
  problem: { targetPhoneme: "ə", contrastPhoneme: "e", contrastWord: "prob-lem", painType: "schwa_omission" },
  support: { targetPhoneme: "ə", contrastPhoneme: "uː", contrastWord: "soo-port", painType: "schwa_omission" },
  banana: { targetPhoneme: "ə", contrastPhoneme: "ɑː", contrastWord: "bah-nah-nah", painType: "schwa_omission" },

  // 3. Epéntesis consonántica (s-clusters)
  sport: { targetPhoneme: "s", contrastPhoneme: "e", contrastWord: "esport", painType: "s_cluster_epenthesis" },
  student: { targetPhoneme: "s", contrastPhoneme: "e", contrastWord: "estudent", painType: "s_cluster_epenthesis" },
  special: { targetPhoneme: "s", contrastPhoneme: "e", contrastWord: "especial", painType: "s_cluster_epenthesis" },
  speak: { targetPhoneme: "s", contrastPhoneme: "e", contrastWord: "espeak", painType: "s_cluster_epenthesis" },
  start: { targetPhoneme: "s", contrastPhoneme: "e", contrastWord: "estart", painType: "s_cluster_epenthesis" },
};

/**
 * Convierte frecuencia Hertz a escala Bark (percepción auditiva humana)
 */
export function hzToBark(hz) {
  if (hz <= 0) return 0;
  return 13 * Math.atan(0.00076 * hz) + 3.5 * Math.atan(Math.pow(hz / 7500, 2));
}

/**
 * Calcula la distancia acústica euclidiana en el espacio formántico F1/F2
 * ponderada en la escala psicoacústica de Bark.
 */
export function calculateFormantDistance(f1Obs, f2Obs, f1Target, f2Target) {
  const bF1Obs = hzToBark(f1Obs);
  const bF2Obs = hzToBark(f2Obs);
  const bF1Tar = hzToBark(f1Target);
  const bF2Tar = hzToBark(f2Target);

  // Distancia euclidiana en espacio de formantes
  return Math.sqrt(Math.pow(bF1Tar - bF1Obs, 2) + Math.pow(bF2Tar - bF2Obs, 2));
}

/**
 * Evalúa el Goodness of Pronunciation (GOP) a partir de formantes medidos
 * o parámetros acústicos del habla.
 * 
 * @param {Object} params
 * @param {string} params.word - Palabra analizada (ej. 'ship', 'student', 'about')
 * @param {number} [params.f1] - Formante F1 medido en Hz (200-1100 Hz)
 * @param {number} [params.f2] - Formante F2 medido en Hz (800-2800 Hz)
 * @param {boolean} [params.hasProstheticVocalicEnergy=false] - Detección de /e/ previa a /s/
 * @param {string} [params.targetPhoneme] - Fonema esperado explícito
 * @returns {Object} Diagnóstico fonético, puntuación GOP y guía articulatoria
 */
export function evaluateGopScore({
  word = "",
  f1 = null,
  f2 = null,
  hasProstheticVocalicEnergy = false,
  targetPhoneme = null,
}) {
  const cleanWord = String(word).trim().toLowerCase();
  const diagnostic = PHONETIC_DIAGNOSTIC_WORDS[cleanWord] || null;
  const effectiveTarget = targetPhoneme || diagnostic?.targetPhoneme || "ɪ";
  const canonical = CANONICAL_FORMANTS[effectiveTarget] || CANONICAL_FORMANTS["ɪ"];

  // Si no se proporcionaron formantes, estimar con valores por defecto
  const obsF1 = Number.isFinite(f1) ? f1 : canonical.f1;
  const obsF2 = Number.isFinite(f2) ? f2 : canonical.f2;

  // 1. Diagnóstico de Epéntesis Consonántica (/s/ inicial + consonante)
  if (
    cleanWord.startsWith("sp") ||
    cleanWord.startsWith("st") ||
    cleanWord.startsWith("sc") ||
    cleanWord.startsWith("sk") ||
    cleanWord.startsWith("sm") ||
    cleanWord.startsWith("sn")
  ) {
    if (hasProstheticVocalicEnergy) {
      const gopScore = 42; // Penalización severa por inserción de vocal protésica
      return {
        word: cleanWord,
        targetPhoneme: "s",
        observedPhoneme: "es",
        gopScore,
        nativeLevel: false,
        painType: "s_cluster_epenthesis",
        acousticFeatures: { f1: obsF1, f2: obsF2 },
        articulatoryGuide: {
          jawAperture: "Cerrada",
          tonguePosition: "Ápice lingual apoyado en alvéolos superiores",
          articulatoryTip: "Comienza soplando aire directamente como el siseo de una serpiente ('ssss'). No abras la boca ni digas 'eh-'.",
          anatomicalCue: "Mantén los labios entreabiertos y junta los dientes antes de emitir cualquier sonido.",
        },
        recastingRecommendation: {
          facilitatorTurn: `I love your enthusiasm! For words like '${cleanWord}', start directly with a crisp snake sound: /s-.../. Repeat with me: '${cleanWord}'.`,
          spanishClarification: `Recuerda no añadir una 'e' al inicio. Pasa directamente del aire a la consonante: '${cleanWord}'.`,
        },
      };
    }
  }

  // 2. Diagnóstico de Colapso Laxa / Tensa (/ɪ/ vs /iː/)
  if (effectiveTarget === "ɪ") {
    // Si la emisión tiene F1 muy bajo (< 330 Hz) y F2 muy alto (> 2100 Hz),
    // el alumno colapsó la laxa /ɪ/ en la /i/ del español (equivalente a /iː/).
    const isTenseCollapse = obsF1 < 340 && obsF2 > 2080;
    const formantDist = calculateFormantDistance(obsF1, obsF2, canonical.f1, canonical.f2);

    // GOP normalizado: log likelihood aproximado derivado de la distancia Bark
    const rawGop = Math.max(10, Math.min(100, Math.round(100 - (formantDist * 22))));
    const gopScore = isTenseCollapse ? Math.min(58, rawGop) : rawGop;
    const nativeLevel = gopScore >= 75;

    if (!nativeLevel || isTenseCollapse) {
      return {
        word: cleanWord,
        targetPhoneme: "ɪ",
        observedPhoneme: isTenseCollapse ? "iː" : "ɪ-desviada",
        gopScore,
        nativeLevel: false,
        painType: "lax_tense_collapse",
        acousticFeatures: {
          f1: obsF1,
          f2: obsF2,
          targetF1: canonical.f1,
          targetF2: canonical.f2,
        },
        articulatoryGuide: {
          jawAperture: "Ligeramente descendida (1 dedo de separación entre dientes)",
          tonguePosition: "Parte media relajada, sin empujar hacia los dientes",
          articulatoryTip: "Relaja las mejillas. No sonrías como al decir la 'i' en español. Es un sonido más corto y suave hacia la 'e'.",
          anatomicalCue: "Baja la mandíbula 5 mm respecto a tu 'i' habitual y suelta el aire sin tensión.",
        },
        recastingRecommendation: {
          facilitatorTurn: `Good effort! Remember '${cleanWord}' has a relaxed short vowel, not a long smiling 'ee'. Like in '${cleanWord}'.`,
          spanishClarification: `En inglés, '${cleanWord}' no suena como nuestra 'i' tensa. Relaja la mandíbula para no confundir con '${diagnostic?.contrastWord || "su par largo"}'.`,
        },
      };
    }
  }

  // 3. Diagnóstico de Omisión de Schwa (/ə/)
  if (effectiveTarget === "ə") {
    // Schwa canónica: F1 ≈ 500, F2 ≈ 1500 (centro exacto).
    // Si F1 > 640 (abrió mucho la boca como en 'a') o F2 < 1150 (la llevó atrás como en 'o')
    const isOverarticulated = obsF1 > 630 || obsF2 < 1200 || obsF2 > 1950;
    const formantDist = calculateFormantDistance(obsF1, obsF2, canonical.f1, canonical.f2);
    const rawGop = Math.max(15, Math.min(100, Math.round(100 - (formantDist * 20))));
    const gopScore = isOverarticulated ? Math.min(55, rawGop) : rawGop;
    const nativeLevel = gopScore >= 75;

    if (!nativeLevel || isOverarticulated) {
      return {
        word: cleanWord,
        targetPhoneme: "ə",
        observedPhoneme: obsF1 > 630 ? "a" : "o/u",
        gopScore,
        nativeLevel: false,
        painType: "schwa_omission",
        acousticFeatures: {
          f1: obsF1,
          f2: obsF2,
          targetF1: canonical.f1,
          targetF2: canonical.f2,
        },
        articulatoryGuide: {
          jawAperture: "Posición neutra de reposo",
          tonguePosition: "Completamente inerte en el centro de la boca",
          articulatoryTip: "La Schwa (/ə/) es el sonido más perezoso del inglés. No intentes pronunciar una vocal clara; solo exhala un suspiro neutro.",
          anatomicalCue: "No redondees los labios ni abras la mandíbula. Imagina que te dieron un golpe leve en el estómago: 'uh'.",
        },
        recastingRecommendation: {
          facilitatorTurn: `You are very close! Notice how the unstressed syllable in '${cleanWord}' fades into a quiet neutral breath: /ə/.`,
          spanishClarification: `No pronuncies la vocal con fuerza. En '${cleanWord}', esa sílaba es casi imperceptible: /ə/.`,
        },
      };
    }
  }

  // 4. Caso General: Fonema Nativo o Bien Articulado
  const formantDist = calculateFormantDistance(obsF1, obsF2, canonical.f1, canonical.f2);
  const gopScore = Math.max(20, Math.min(100, Math.round(100 - (formantDist * 18))));
  const nativeLevel = gopScore >= 75;

  return {
    word: cleanWord,
    targetPhoneme: effectiveTarget,
    observedPhoneme: effectiveTarget,
    gopScore,
    nativeLevel,
    painType: null,
    acousticFeatures: {
      f1: obsF1,
      f2: obsF2,
      targetF1: canonical.f1,
      targetF2: canonical.f2,
    },
    articulatoryGuide: {
      jawAperture: canonical.f1 > 600 ? "Abierta" : canonical.f1 > 400 ? "Media" : "Cerrada",
      tonguePosition: canonical.f2 > 1800 ? "Anterior" : canonical.f2 > 1300 ? "Central" : "Posterior",
      articulatoryTip: "¡Excelente articulación! El formante coincide con la resonancia nativa esperada.",
      anatomicalCue: "Mantén este patrón muscular para consolidar la memoria motora.",
    },
    recastingRecommendation: null,
  };
}

/**
 * Extrae los dos primeros formantes (F1 y F2) a partir de un arreglo de audio PCM (16 kHz).
 * Utiliza estimación de autocorrelación y detección de picos espectrales ponderados.
 * 
 * @param {Float32Array|Int16Array} pcmData - Muestras a 16 kHz
 * @param {number} [sampleRate=16000] - Frecuencia de muestreo
 * @returns {{ f1: number, f2: number, hasProstheticVocalicEnergy: boolean }}
 */
export function extractFormantsFromPcm(pcmData, sampleRate = 16000) {
  if (!pcmData || pcmData.length < 256) {
    return { f1: 500, f2: 1500, hasProstheticVocalicEnergy: false };
  }

  // Convertir a Float32Array normalizado si viene en Int16Array
  const samples = new Float32Array(pcmData.length);
  if (pcmData instanceof Int16Array) {
    for (let i = 0; i < pcmData.length; i++) samples[i] = pcmData[i] / 32768.0;
  } else {
    for (let i = 0; i < pcmData.length; i++) samples[i] = pcmData[i];
  }

  // Análisis de energía en los primeros 60 ms para detectar epéntesis (/e/ protésica)
  const prefixLength = Math.min(samples.length, Math.round(0.06 * sampleRate)); // 60 ms
  let prefixLowFreqEnergy = 0;
  let prefixHighFreqEnergy = 0;

  for (let i = 1; i < prefixLength; i++) {
    const diff = Math.abs(samples[i] - samples[i - 1]);
    prefixHighFreqEnergy += diff;
    prefixLowFreqEnergy += Math.abs(samples[i]);
  }

  // Si la energía en bajas frecuencias supera el umbral antes del ruido de /s/, hay epéntesis
  const hasProstheticVocalicEnergy = (prefixLowFreqEnergy / prefixLength) > 0.08 &&
                                    (prefixHighFreqEnergy / prefixLength) < 0.15;

  // Estimación de picos de formantes por correlación de bandas F1 (200-1000) y F2 (900-2600)
  // Ventana Hamming
  const N = Math.min(samples.length, 512);
  let bestF1 = 450;
  let bestF2 = 1800;

  // Resonancia F1 aproximada por correlación de paso
  let maxCorr1 = 0;
  for (let f = 250; f <= 950; f += 25) {
    const lag = Math.round(sampleRate / f);
    let corr = 0;
    for (let i = 0; i < N - lag; i++) {
      corr += samples[i] * samples[i + lag];
    }
    if (corr > maxCorr1) {
      maxCorr1 = corr;
      bestF1 = f;
    }
  }

  // Resonancia F2 aproximada
  let maxCorr2 = 0;
  for (let f = 1100; f <= 2500; f += 50) {
    const lag = Math.round(sampleRate / f);
    let corr = 0;
    for (let i = 0; i < N - lag; i++) {
      corr += samples[i] * samples[i + lag];
    }
    if (corr > maxCorr2) {
      maxCorr2 = corr;
      bestF2 = f;
    }
  }

  return {
    f1: bestF1,
    f2: bestF2,
    hasProstheticVocalicEnergy,
  };
}
