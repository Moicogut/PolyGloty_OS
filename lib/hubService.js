/**
 * lib/hubService.js
 * 
 * Servicio del Student Hub y Pre-sesión Warm-up (Testing Effect / Retrieval Practice).
 * Provee estado del alumno, métricas de competencias, retos diarios/semanales,
 * micro-copy motivador adaptativo y generación de ejercicios de calentamiento.
 */

import { award } from "./tutor.js";
import { LESSON_CURRICULUM, MISSION_CATALOG } from "./pedagogicalAgent.js";

// Banco canónico de micro-retos de calentamiento para niveles A1-B2 y HSK1-HSK3
export const WARMUP_BANK = {
  en: {
    A1: {
      cafe: [
        {
          id: "w1",
          type: "vocab",
          prompt: "¿Cómo se dice 'café con leche' en inglés?",
          options: ["Coffee with milk", "Coffee and tea", "Tea with sugar"],
          answer: 0,
          explanation: "'Coffee with milk' es la forma directa y natural para principiantes.",
          speak: "Coffee with milk, please.",
        },
        {
          id: "w2",
          type: "repair",
          prompt: "Encuentra la forma correcta para pedir algo cortésmente:",
          options: ["I want coffee now", "Can I have a coffee, please?", "Give me one coffee"],
          answer: 1,
          explanation: "'Can I have... please?' es la fórmula de cortesía estándar en A1.",
          speak: "Can I have a coffee, please?",
        },
        {
          id: "w3",
          type: "anticipate",
          prompt: "El barista te pregunta: 'What is your name?'. Tú respondes:",
          options: ["My name is...", "Yes, I do.", "I have 20 years."],
          answer: 0,
          explanation: "Responde directamente con tu nombre usando 'My name is...' o 'I am...'.",
          speak: "My name is Alex.",
        },
      ],
      hotel: [
        {
          id: "w1",
          type: "vocab",
          prompt: "¿Cuál es la palabra para 'reserva'?",
          options: ["Reservation", "Reception", "Registration"],
          answer: 0,
          explanation: "'Reservation' es el sustantivo correcto para una reserva de hotel.",
          speak: "I have a reservation.",
        },
        {
          id: "w2",
          type: "repair",
          prompt: "Elige la oración gramaticalmente correcta en presente simple:",
          options: ["I not have a reservation", "I don't have a reservation", "I no have reservation"],
          answer: 1,
          explanation: "En inglés, la negación en presente simple con 'have' usa el auxiliar 'don't'.",
          speak: "I don't have a reservation.",
        },
        {
          id: "w3",
          type: "anticipate",
          prompt: "¿Cómo pides la llave de tu habitación con cortesía?",
          options: ["Give me the key", "Can I have the room key, please?", "Key room now"],
          answer: 1,
          explanation: "Usa 'Can I have the room key, please?' para sonar educado.",
          speak: "Can I have the room key, please?",
        },
      ],
      taxi: [
        {
          id: "w1",
          type: "vocab",
          prompt: "¿Cómo preguntas '¿Cuánto cuesta?' en inglés?",
          options: ["How many is it?", "How much is it?", "How cost is it?"],
          answer: 1,
          explanation: "Para precios y dinero (incontable), usamos 'How much...'.",
          speak: "How much is it to the airport?",
        },
        {
          id: "w2",
          type: "repair",
          prompt: "Para indicar tu destino al taxista, dices:",
          options: ["To the airport, please.", "I go airport now.", "Take me airport."],
          answer: 0,
          explanation: "'To [destino], please' es conciso, natural y 100% nativo.",
          speak: "To the airport, please.",
        },
        {
          id: "w3",
          type: "anticipate",
          prompt: "El conductor dice 'Here you are'. Tú respondes:",
          options: ["Thank you very much.", "Yes, I am.", "No, problem."],
          answer: 0,
          explanation: "Agradece con 'Thank you' o 'Thank you very much'.",
          speak: "Thank you very much.",
        },
      ],
      cliente: [
        {
          id: "w1",
          type: "vocab",
          prompt: "¿Cómo se dice 'Bienvenido a nuestra oficina'?",
          options: ["Welcome to our office", "Welcome at our office", "Hello to the office"],
          answer: 0,
          explanation: "La preposición correcta para bienvenida a un lugar es 'Welcome to...'.",
          speak: "Welcome to our office.",
        },
        {
          id: "w2",
          type: "repair",
          prompt: "¿Cómo ofreces un café o agua a una visita?",
          options: ["You want coffee?", "Would you like some coffee or water?", "Take coffee please."],
          answer: 1,
          explanation: "'Would you like...' es la fórmula profesional de cortesía ejecutiva.",
          speak: "Would you like some water or coffee?",
        },
        {
          id: "w3",
          type: "anticipate",
          prompt: "El cliente te pregunta 'How are you today?'. Tú respondes:",
          options: ["I'm doing well, thank you. And you?", "Yes, I have.", "I'm 25 years."],
          answer: 0,
          explanation: "Responde cordialmente y devuelve la cortesía.",
          speak: "I'm doing well, thank you. And you?",
        },
      ],
    },
    A2: {
      default: [
        {
          id: "w1",
          type: "repair",
          prompt: "Elige la forma correcta en pasado simple:",
          options: ["Yesterday I go to the store", "Yesterday I went to the store", "Yesterday I was go to the store"],
          answer: 1,
          explanation: "El pasado simple irregular de 'go' es 'went'.",
          speak: "Yesterday I went to the store.",
        },
        {
          id: "w2",
          type: "vocab",
          prompt: "¿Cómo expresas planes futuros inmediatos?",
          options: ["I'm going to travel next week", "I travel next week", "I will be travel next week"],
          answer: 0,
          explanation: "'Going to' se usa para planes e intenciones previamente decididas.",
          speak: "I am going to travel next week.",
        },
        {
          id: "w3",
          type: "anticipate",
          prompt: "Para justificar una opinión o motivo, usas el conector:",
          options: ["Because", "Although", "Instead"],
          answer: 0,
          explanation: "'Because' introduce la causa o razón directa.",
          speak: "I prefer coffee because it gives me energy.",
        },
      ],
    },
  },
  zh: {
    HSK1: {
      default: [
        {
          id: "w1",
          type: "vocab",
          prompt: "¿Cómo se dice 'Hola' en mandarín con tonos correctos?",
          options: ["Nǐ hǎo (你好)", "Xièxie (谢谢)", "Zàijiàn (再见)"],
          answer: 0,
          explanation: "你好 (nǐ hǎo) es el saludo básico con tono 3 + tono 3.",
          speak: "你好",
        },
        {
          id: "w2",
          type: "repair",
          prompt: "Para preguntar '¿Quieres café?', la partícula interrogativa al final es:",
          options: ["吗 (ma)", "的 (de)", "了 (le)"],
          answer: 0,
          explanation: "吗 (ma) convierte cualquier oración afirmativa en pregunta sí/no.",
          speak: "你要咖啡吗？",
        },
        {
          id: "w3",
          type: "anticipate",
          prompt: "Si alguien te dice 谢谢 (Xièxie), respondes:",
          options: ["不客气 (Bú kèqi)", "对不起 (Duìbuqǐ)", "没关系 (Méi guānxi)"],
          answer: 0,
          explanation: "不客气 (Bú kèqi) significa 'De nada / No hay de qué'.",
          speak: "不客气",
        },
      ],
    },
  },
};

/**
 * Genera el estado consolidado del Hub del Estudiante.
 */
export function getStudentHubStatus({ state, lang = "en", user = null, now = Date.now() }) {
  state.rollDay(now);
  const d = state.data;
  const p = d.profile;

  const currentLevel = p.level || (lang === "zh" ? "HSK1" : "A1");
  const creditsEarned = p.credits || 0;
  const targetCredits = 36;
  const levelProgress = Math.min(100, Math.round((creditsEarned / targetCredits) * 100));

  // Radar de competencias normalizado (0 a 100)
  const competencies = d.competencies || {
    grammar: 65,
    vocabulary: 70,
    fluency: 60,
    comprehension: 75,
  };

  // Retos diarios y semanales con estado reactivo
  const warmupDone = Boolean(d.daily.warmupDone);
  const missionsToday = d.daily.missions || 0;
  const reviewsToday = d.daily.reviews || 0;
  const streak = p.streak || 0;

  const challenges = [
    {
      id: "daily_warmup",
      type: "daily",
      title: "Pre-sesión Warm-up (90s)",
      desc: "Reactiva 3 conceptos clave antes de conversar",
      have: warmupDone ? 1 : 0,
      need: 1,
      done: warmupDone,
      xp: 10,
    },
    {
      id: "daily_mission",
      type: "daily",
      title: "Lección en vivo con Wetty",
      desc: "Cumple al menos 2 objetivos en el escenario activo",
      have: Math.min(missionsToday, 1),
      need: 1,
      done: missionsToday >= 1,
      xp: 25,
    },
    {
      id: "daily_srs",
      type: "daily",
      title: "Consolidación en Mazo SRS",
      desc: "Repasa 5 tarjetas del banco de vocabulario",
      have: Math.min(reviewsToday, 5),
      need: 5,
      done: reviewsToday >= 5,
      xp: 15,
    },
    {
      id: "weekly_credits",
      type: "weekly",
      title: "Objetivo Semanal de Créditos",
      desc: "Acumula 6 créditos académicos esta semana",
      have: Math.min(creditsEarned % 12, 6),
      need: 6,
      done: (creditsEarned % 12) >= 6,
      xp: 60,
    },
    {
      id: "weekly_consistency",
      type: "weekly",
      title: "Racha de Constancia (3 días)",
      desc: "Entrena al menos 3 días consecutivos",
      have: Math.min(streak, 3),
      need: 3,
      done: streak >= 3,
      xp: 50,
    },
  ];

  // Algoritmo de micro-copy motivador adaptativo (Autoeficacia de Bandura & Growth Mindset de Dweck)
  let motivationalQuote = "Cada gran políglota empezó con una primera frase. Wetty está lista para guiarte hoy.";
  if (streak >= 3) {
    motivationalQuote = `¡Imparable! Llevas ${streak} días construyendo fluidez real. La constancia es el secreto de la memoria muscular.`;
  } else if (creditsEarned >= 12) {
    motivationalQuote = `¡Llevas ${creditsEarned} créditos acumulados! Tu camino a la certificación oficial avanza con paso firme.`;
  } else if (competencies.grammar >= 75) {
    motivationalQuote = "Tu precisión gramatical destaca en tus últimas sesiones. Hoy es un excelente momento para ampliar tu vocabulario.";
  } else if (d.cards.length >= 10) {
    motivationalQuote = `Tienes ${d.cards.length} palabras en tu mazo de largo plazo. Tu cerebro está conectando nuevos patrones lingüísticos.`;
  }

  // Búsqueda de la siguiente lección recomendada según el currículum progresivo
  const curriculumList = LESSON_CURRICULUM[lang]?.[currentLevel] || LESSON_CURRICULUM.en.A1;
  const doneMap = p.missionsDone || {};
  let nextLesson = curriculumList[0];
  for (const item of curriculumList) {
    if (!doneMap[item.id]) {
      nextLesson = item;
      break;
    }
  }

  const missionMeta = MISSION_CATALOG[nextLesson.id]?.[currentLevel] || {};

  return {
    user: {
      id: user?.id || state.tenantId,
      name: user?.name || (user?.email ? user.email.split("@")[0] : "Estudiante"),
      email: user?.email || p.email || null,
      level: currentLevel,
      levelName: currentLevel === "A1" ? "Principiante Acceso" : currentLevel,
      credits: creditsEarned,
      targetCredits,
      levelProgress,
      xp: p.xp,
      streak,
      totalCards: d.cards.length,
      dueCards: d.cards.filter((c) => c.due <= now).length,
    },
    radar: competencies,
    challenges,
    motivationalQuote,
    nextLesson: {
      id: nextLesson.id,
      module: nextLesson.module,
      title: nextLesson.title,
      order: nextLesson.order,
      creditsValue: 2,
      scene: missionMeta.scene || "Escenario conversacional interactivo.",
      objectives: missionMeta.objectives || ["Saludar", "Interactuar", "Despedirse"],
    },
    curriculum: curriculumList,
  };
}

/**
 * Genera el paquete de micro-retos de calentamiento para la lección elegida.
 */
export function generateWarmup({ state, lang = "en", level = "A1", lessonId = "cafe" }) {
  const langBank = WARMUP_BANK[lang] || WARMUP_BANK.en;
  const levelBank = langBank[level] || langBank.A1 || {};
  const lessonQuestions = levelBank[lessonId] || levelBank.default || langBank.A1.cafe;

  // Si el alumno tiene tarjetas SRS vencidas, podemos inyectar una como reto de vocabulario
  const cards = state.data?.cards || [];
  const dueCard = cards.find((c) => (c.lang || "en") === lang);

  const questions = lessonQuestions.map((q, idx) => {
    // Reemplazo dinámico opcional en la primera pregunta si hay tarjeta real de SRS
    if (idx === 0 && dueCard && q.type === "vocab") {
      return {
        id: `srs_${dueCard.id || idx}`,
        type: "vocab",
        prompt: `¿Qué significa '${dueCard.front}' en español?`,
        options: [dueCard.back, "Opción secundaria", "Otra traducción"],
        answer: 0,
        explanation: `'${dueCard.front}' se traduce como '${dueCard.back}'.`,
        speak: dueCard.front,
      };
    }
    return q;
  });

  return {
    ok: true,
    warmupId: `warmup_${Date.now()}`,
    lang,
    level,
    lessonId,
    durationSeconds: 90,
    questions,
  };
}

/**
 * Registra la finalización del calentamiento y otorga recompensas.
 */
export function completeWarmup({ state, now = Date.now() }) {
  state.rollDay(now);
  state.data.daily.warmupDone = true;
  const xpAwarded = award(state, 10, now);
  state.save();

  return {
    ok: true,
    xpAwarded,
    newTotalXp: state.data.profile.xp,
    warmupDone: true,
    streak: state.data.profile.streak,
    message: "¡Calentamiento superado con éxito! Tu memoria de trabajo está lista.",
  };
}
