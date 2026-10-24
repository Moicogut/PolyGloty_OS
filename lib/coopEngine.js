/**
 * lib/coopEngine.js
 * 
 * Motor de Salas de Microgrupos y Social Co-Op (Aprendizaje Colaborativo)
 * Implementa Smart Matching por afinidad tridimensional:
 *  1. Nivel CEFR idéntico (A1, A2, B1, B2, C1, HSK1..5)
 *  2. Dominio Profesional común (tech, medical, corporate, general)
 *  3. Ventana temporal ágil (sesiones de 15 minutos / 900s)
 * 
 * Gestiona el balanceo de turnos de palabra (Talking Time),
 * orquestación de misiones TBLT y detección de silencios (>5s).
 */

import crypto from "node:crypto";

export const COOP_DOMAINS = ["tech", "medical", "corporate", "general"];

export const TBLT_MISSIONS = {
  tech: {
    A1: {
      title: "Dev Setup & Status",
      goal: "Present your dev role and current ticket in 1 simple sentence.",
      scenario: "Sprint daily check-in with international engineering team.",
      steps: ["State your name and role", "Mention which tool you are using today", "Ask a peer for confirmation"],
    },
    A2: {
      title: "Daily Standup & Bug Triage",
      goal: "Report what you finished yesterday and identify one blocker.",
      scenario: "Morning standup meeting before the sprint release.",
      steps: ["Share yesterday's completed task", "Describe one error or bug clearly", "Coordinate who reviews the pull request"],
    },
    B1: {
      title: "Architecture Review & API Design",
      goal: "Debate between REST and GraphQL endpoints for the new microservice.",
      scenario: "Technical architecture guild session.",
      steps: ["Propose your architectural preference", "Explain performance and trade-offs", "Reach consensus on the data schema"],
    },
    B2: {
      title: "Production Incident Post-Mortem",
      goal: "Analyze a cloud downtime incident, root cause and preventive action items.",
      scenario: "War room incident review with leads.",
      steps: ["Summarize failure timeline", "Defend mitigation strategy", "Draft remediation milestones"],
    },
  },
  medical: {
    A1: {
      title: "Patient Check-in",
      goal: "Record basic patient details and vital signs.",
      scenario: "Hospital reception intake desk.",
      steps: ["Confirm patient name and birthdate", "Record temperature and blood pressure", "Direct patient to waiting room"],
    },
    A2: {
      title: "Shift Handoff & Triage",
      goal: "Transfer responsibility of two patients at the change of shift.",
      scenario: "Emergency room nurse handoff.",
      steps: ["Summarize chief complaints", "List medications administered", "Flag critical alerts"],
    },
    B1: {
      title: "Interdisciplinary Case Discussion",
      goal: "Discuss treatment options for chronic condition management.",
      scenario: "Clinical team case conference.",
      steps: ["Review laboratory findings", "Evaluate side effects and interactions", "Agree on care plan"],
    },
    B2: {
      title: "Informed Consent & Medical Ethics",
      goal: "Address treatment dilemmas and patient preferences with family.",
      scenario: "Consultation and ethics committee.",
      steps: ["Present prognostic evidence", "Navigate family concerns with empathy", "Document shared decision"],
    },
  },
  corporate: {
    A1: {
      title: "Welcome & Introductions",
      goal: "Introduce yourself and your department in a regional call.",
      scenario: "Kickoff call for a new interdepartmental project.",
      steps: ["Introduce your name and location", "State your primary department", "Express enthusiasm for collaboration"],
    },
    A2: {
      title: "Weekly Sales Pipeline Review",
      goal: "Report client calls made and pipeline updates.",
      scenario: "Sales department sync.",
      steps: ["Share metrics of the week", "Highlight a promising prospective client", "Request collateral or marketing support"],
    },
    B1: {
      title: "Budget & Resource Negotiation",
      goal: "Negotiate budget allocation between marketing and operations.",
      scenario: "Quarterly budget allocation meeting.",
      steps: ["Justify your department's funding request", "Identify areas of potential compromise", "Finalize resource agreement"],
    },
    B2: {
      title: "Strategic Partnership Pitch",
      goal: "Present value proposition and negotiate contract terms with a partner.",
      scenario: "Executive partnership negotiation.",
      steps: ["Deliver executive value pitch", "Address counter-arguments and risks", "Define next milestone agreements"],
    },
  },
  general: {
    A1: {
      title: "Travelers Meetup",
      goal: "Share your destination and favorite travel activities.",
      scenario: "Social gathering at an international airport lounge.",
      steps: ["Say where you are traveling to", "Name your favorite food or place", "Ask a peer about their trip"],
    },
    A2: {
      title: "Weekend Plan Coordination",
      goal: "Plan a group activity balancing different schedules and preferences.",
      scenario: "Friends organizing a weekend excursion.",
      steps: ["Suggest an activity and time", "Respond to schedule constraints", "Confirm meeting location and gear"],
    },
    B1: {
      title: "Cultural Exchange & Lifestyle",
      goal: "Compare cultural traditions and workday habits between countries.",
      scenario: "Global community conversation club.",
      steps: ["Describe a celebration or tradition", "Explain cultural significance", "Ask engaging follow-up questions"],
    },
    B2: {
      title: "Community Debate on Smart Cities",
      goal: "Debate the benefits and drawbacks of AI cameras and public transport.",
      scenario: "Citizen forum on urban future.",
      steps: ["Argue your stance with examples", "Acknowledge counter-points gracefully", "Propose a balanced resolution"],
    },
  },
};

/**
 * Almacén en memoria de salas activas para sesiones en tiempo real.
 * Si Supabase está disponible, se sincroniza de forma transparente.
 */
class CoopRoomStore {
  constructor() {
    /** @type {Map<string, Object>} */
    this.rooms = new Map();
  }

  get(roomId) {
    return this.rooms.get(roomId) || null;
  }

  set(roomId, roomData) {
    this.rooms.set(roomId, roomData);
    return roomData;
  }

  delete(roomId) {
    return this.rooms.delete(roomId);
  }

  findAvailableRoom({ level, domain, maxCapacity }) {
    for (const room of this.rooms.values()) {
      if (
        room.status === "waiting" &&
        room.level_cefr === level &&
        room.professional_domain === domain &&
        room.members.length < (room.max_capacity || maxCapacity)
      ) {
        return room;
      }
    }
    // Fallback con dominio general si no hay específico y el usuario acepta
    for (const room of this.rooms.values()) {
      if (
        room.status === "waiting" &&
        room.level_cefr === level &&
        room.members.length < (room.max_capacity || maxCapacity) &&
        (room.professional_domain === "general" || domain === "general")
      ) {
        return room;
      }
    }
    return null;
  }
}

export const coopMemoryStore = new CoopRoomStore();

/**
 * Genera un código de sala legible y único.
 */
function generateRoomCode(domain) {
  const prefix = (domain || "coop").slice(0, 4).toUpperCase();
  const rand = crypto.randomBytes(2).toString("hex").toUpperCase();
  return `${prefix}-${rand}`;
}

/**
 * Obtiene la misión TBLT correspondiente al dominio y nivel.
 */
export function getTbltMission(domain, level) {
  const normDomain = COOP_DOMAINS.includes(domain) ? domain : "general";
  const normLevel = level && level.startsWith("HSK") ? "A1" : (level || "A1");
  const catalog = TBLT_MISSIONS[normDomain] || TBLT_MISSIONS.general;
  return catalog[normLevel] || catalog.A1 || TBLT_MISSIONS.general.A1;
}

/**
 * Empareja o crea una sala de microgrupo por afinidad tridimensional.
 * 
 * @param {Object} params
 * @param {string} params.userId - ID del estudiante
 * @param {string} [params.candidateName] - Nombre del alumno
 * @param {string} params.level - Nivel CEFR (A1, A2, B1, B2, C1, HSK1..)
 * @param {string} [params.domain] - Dominio ('tech', 'medical', 'corporate', 'general')
 * @param {number} [params.maxCapacity=4] - Capacidad máxima (2 a 6)
 * @returns {Object} Estado de la sala y membresía del usuario
 */
export function matchOrCreateRoom({
  userId,
  candidateName = "Alumno",
  level = "A1",
  domain = "general",
  maxCapacity = 4,
}) {
  if (!userId || typeof userId !== "string") {
    throw new Error("El parámetro 'userId' es obligatorio");
  }

  const cleanLevel = String(level).trim().toUpperCase();
  const cleanDomain = COOP_DOMAINS.includes(domain) ? domain : "general";
  const cleanCapacity = Math.min(6, Math.max(2, Number(maxCapacity) || 4));

  // 1. Buscar si el usuario ya está en una sala activa o en espera
  for (const existingRoom of coopMemoryStore.rooms.values()) {
    if (existingRoom.status !== "finished") {
      const existingMember = existingRoom.members.find((m) => m.userId === userId);
      if (existingMember) {
        return {
          room: sanitizeRoomForClient(existingRoom),
          member: existingMember,
          isNewRoom: false,
          reconnected: true,
        };
      }
    }
  }

  // 2. Buscar sala disponible con afinidad exacta
  let targetRoom = coopMemoryStore.findAvailableRoom({
    level: cleanLevel,
    domain: cleanDomain,
    maxCapacity: cleanCapacity,
  });

  let isNewRoom = false;

  if (targetRoom) {
    // Unirse a la sala existente como 'member'
    const newMember = {
      userId,
      name: candidateName,
      role: "member",
      joinedAt: Date.now(),
      talkingTimeSeconds: 0,
      turnCount: 0,
      peerFeedbackScore: null,
    };
    targetRoom.members.push(newMember);

    // Si alcanza la capacidad mínima deseada (o completa), activar sala
    if (targetRoom.members.length >= 2 && targetRoom.status === "waiting") {
      targetRoom.status = "active";
      targetRoom.sessionStartedAt = Date.now();
    }
  } else {
    // 3. Crear nueva sala como 'host'
    isNewRoom = true;
    const roomId = crypto.randomUUID();
    const roomCode = generateRoomCode(cleanDomain);
    const mission = getTbltMission(cleanDomain, cleanLevel);

    targetRoom = {
      id: roomId,
      room_code: roomCode,
      max_capacity: cleanCapacity,
      level_cefr: cleanLevel,
      professional_domain: cleanDomain,
      status: "waiting",
      created_by: userId,
      created_at: Date.now(),
      target_task: mission,
      members: [
        {
          userId,
          name: candidateName,
          role: "host",
          joinedAt: Date.now(),
          talkingTimeSeconds: 0,
          turnCount: 0,
          peerFeedbackScore: null,
        },
      ],
      turnHistory: [],
      lastInterventionTimestampMs: Date.now(),
      sessionWindowMinutes: 15,
    };

    coopMemoryStore.set(roomId, targetRoom);
  }

  const currentMember = targetRoom.members.find((m) => m.userId === userId);

  return {
    room: sanitizeRoomForClient(targetRoom),
    member: currentMember,
    isNewRoom,
    reconnected: false,
  };
}

/**
 * Registra una intervención de voz en la sala Co-Op y calcula métricas
 * de Talking Time para equilibrar la participación.
 * 
 * @param {Object} params
 * @param {string} params.roomId
 * @param {string} params.userId
 * @param {number} params.audioDurationSeconds
 * @param {string} params.transcriptText
 * @param {number} [params.gopScore] - Puntuación fonética opcional
 * @returns {Object} Métricas actualizadas y sugerencia de facilitación
 */
export function recordCoopTurn({
  roomId,
  userId,
  audioDurationSeconds = 3,
  transcriptText = "",
  gopScore = null,
}) {
  const room = coopMemoryStore.get(roomId);
  if (!room) {
    throw new Error(`Sala Co-Op no encontrada: ${roomId}`);
  }

  const member = room.members.find((m) => m.userId === userId);
  if (!member) {
    throw new Error(`El usuario ${userId} no es miembro de la sala ${roomId}`);
  }

  const durationSec = Math.max(1, Math.min(60, Number(audioDurationSeconds) || 3));
  member.talkingTimeSeconds += durationSec;
  member.turnCount += 1;
  room.lastInterventionTimestampMs = Date.now();

  const turnRecord = {
    turnId: crypto.randomUUID(),
    userId,
    userName: member.name,
    durationSeconds: durationSec,
    text: String(transcriptText || "").slice(0, 1000),
    gopScore: Number.isFinite(gopScore) ? gopScore : null,
    timestamp: Date.now(),
  };
  room.turnHistory.push(turnRecord);

  // Calcular balance de tiempo de palabra (Talking Time)
  const totalTalkingTime = room.members.reduce((acc, m) => acc + m.talkingTimeSeconds, 0);
  const averageTalkingTime = totalTalkingTime / (room.members.length || 1);

  // Identificar integrantes que requieren estímulo (participación < 50% de la media)
  const participationStats = room.members.map((m) => {
    const percentage = totalTalkingTime > 0 ? Math.round((m.talkingTimeSeconds / totalTalkingTime) * 100) : 0;
    return {
      userId: m.userId,
      name: m.name,
      talkingTimeSeconds: m.talkingTimeSeconds,
      turnCount: m.turnCount,
      percentage,
      needsEncouragement: totalTalkingTime > 15 && m.talkingTimeSeconds < (averageTalkingTime * 0.5),
    };
  });

  // Determinar quién debería intervenir a continuación
  const candidatesForNextTurn = [...participationStats].sort((a, b) => a.talkingTimeSeconds - b.talkingTimeSeconds);
  const suggestedNextSpeaker = candidatesForNextTurn.find((c) => c.userId !== userId) || candidatesForNextTurn[0];

  return {
    turnRecord,
    totalTalkingTime,
    participationStats,
    suggestedNextSpeaker: {
      userId: suggestedNextSpeaker.userId,
      name: suggestedNextSpeaker.name,
      reason: "Equilibrio de Talking Time en sala de microgrupo",
    },
    room: sanitizeRoomForClient(room),
  };
}

/**
 * Evalúa si ha habido un silencio prolongado (>5s) para que Wetty
 * intervenga de forma constructiva sin elevar el filtro afectivo.
 * 
 * @param {string} roomId
 * @param {number} [silenceThresholdMs=5000]
 * @returns {Object}
 */
export function checkCoopSilence(roomId, silenceThresholdMs = 5000) {
  const room = coopMemoryStore.get(roomId);
  if (!room) return { hasProlongedSilence: false };

  const elapsedMs = Date.now() - (room.lastInterventionTimestampMs || Date.now());
  const hasProlongedSilence = elapsedMs >= silenceThresholdMs && room.status === "active";

  let interventionPrompt = null;
  if (hasProlongedSilence) {
    // Buscar miembro con menor participación para invitarlo cálidamente
    const quietMember = [...room.members].sort((a, b) => a.talkingTimeSeconds - b.talkingTimeSeconds)[0];
    interventionPrompt = {
      targetUserId: quietMember?.userId,
      targetName: quietMember?.name,
      elapsedSeconds: Math.round(elapsedMs / 1000),
      facilitatorScript: `${quietMember?.name || "Team"}, how would you approach this point in your daily workflow? Take your time!`,
      facilitatorScriptEs: `${quietMember?.name || "Equipo"}, ¿cómo abordarías este punto en tu trabajo diario? ¡Tómate tu tiempo!`,
    };
  }

  return {
    hasProlongedSilence,
    elapsedMs,
    interventionPrompt,
  };
}

/**
 * Permite a un usuario abandonar la sala de microgrupo de forma limpia.
 */
export function leaveCoopRoom(roomId, userId) {
  const room = coopMemoryStore.get(roomId);
  if (!room) return { success: false, message: "Sala no encontrada" };

  const idx = room.members.findIndex((m) => m.userId === userId);
  if (idx < 0) return { success: false, message: "Usuario no pertenece a la sala" };

  room.members.splice(idx, 1);

  // Si la sala queda vacía, marcar como terminada y purgar
  if (room.members.length === 0) {
    room.status = "finished";
    coopMemoryStore.delete(roomId);
  } else if (room.created_by === userId) {
    // Reasignar rol de host al siguiente miembro
    room.members[0].role = "host";
    room.created_by = room.members[0].userId;
  }

  return { success: true, remainingMembers: room.members.length };
}

/**
 * Registra y computa el feedback de compañeros (Peer Review) para un miembro de la sala.
 * Aplica el puntaje y guarda la nota sanitizada.
 */
export function recordPeerFeedback({
  roomId,
  authorUserId,
  recipientUserId,
  rawFeedback,
  sanitizedFeedback,
  score = 5,
  tags = [],
  badgeAwarded = null,
}) {
  const room = coopMemoryStore.get(roomId);
  if (!room) {
    throw new Error(`Sala Co-Op no encontrada: ${roomId}`);
  }

  const recipient = room.members.find((m) => m.userId === recipientUserId);
  if (!recipient) {
    throw new Error(`El destinatario ${recipientUserId} no pertenece a la sala ${roomId}`);
  }

  const author = room.members.find((m) => m.userId === authorUserId) || { name: "Colega" };

  if (!Array.isArray(room.peerReviews)) {
    room.peerReviews = [];
  }

  const reviewRecord = {
    reviewId: crypto.randomUUID(),
    authorUserId,
    authorName: author.name,
    recipientUserId,
    recipientName: recipient.name,
    rawFeedback,
    sanitizedFeedback,
    score: Math.min(5, Math.max(1, Number(score) || 5)),
    tags: Array.isArray(tags) ? tags : [],
    badgeAwarded,
    timestamp: Date.now(),
  };

  room.peerReviews.push(reviewRecord);

  // Calcular nuevo promedio de peerFeedbackScore para el destinatario
  const userReviews = room.peerReviews.filter((r) => r.recipientUserId === recipientUserId);
  const totalScore = userReviews.reduce((acc, r) => acc + r.score, 0);
  recipient.peerFeedbackScore = Number((totalScore / userReviews.length).toFixed(2));

  return {
    reviewRecord,
    recipientFeedbackScore: recipient.peerFeedbackScore,
    room: sanitizeRoomForClient(room),
  };
}


/**
 * Sanitiza los datos de la sala antes de enviarlos al cliente.
 */
function sanitizeRoomForClient(room) {
  return {
    id: room.id,
    room_code: room.room_code,
    max_capacity: room.max_capacity,
    level_cefr: room.level_cefr,
    professional_domain: room.professional_domain,
    status: room.status,
    target_task: room.target_task,
    created_at: room.created_at,
    sessionWindowMinutes: room.sessionWindowMinutes || 15,
    members: room.members.map((m) => ({
      userId: m.userId,
      name: m.name,
      role: m.role,
      talkingTimeSeconds: m.talkingTimeSeconds,
      turnCount: m.turnCount,
      peerFeedbackScore: m.peerFeedbackScore,
    })),
    turnCountTotal: room.turnHistory?.length || 0,
  };
}
