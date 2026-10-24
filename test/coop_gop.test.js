process.env.TEST_MODE = "1";
process.env.NODE_ENV = "test";

import test from "node:test";
import assert from "node:assert/strict";
import {
  matchOrCreateRoom,
  recordCoopTurn,
  checkCoopSilence,
  leaveCoopRoom,
  getTbltMission,
  coopMemoryStore,
} from "../lib/coopEngine.js";
import {
  evaluateGopScore,
  extractFormantsFromPcm,
  calculateFormantDistance,
  hzToBark,
  CANONICAL_FORMANTS,
} from "../lib/acousticGopEngine.js";
import {
  validateCoopMatchPayload,
  validateCoopTurnPayload,
  validateAcousticGopPayload,
  ValidationError,
} from "../lib/validator.js";

// Limpiar almacén de salas antes de cada prueba
function resetRooms() {
  coopMemoryStore.rooms.clear();
}

test("Co-Op Smart Matching: Creación de sala con rol Host y misión TBLT", () => {
  resetRooms();
  const result = matchOrCreateRoom({
    userId: "usr-dev-1",
    candidateName: "Carlos Dev",
    level: "A2",
    domain: "tech",
    maxCapacity: 4,
  });

  assert.equal(result.isNewRoom, true);
  assert.equal(result.reconnected, false);
  assert.equal(result.member.role, "host");
  assert.equal(result.room.status, "waiting");
  assert.equal(result.room.level_cefr, "A2");
  assert.equal(result.room.professional_domain, "tech");
  assert.equal(result.room.members.length, 1);
  assert.ok(result.room.target_task.title.includes("Standup"));
});

test("Co-Op Smart Matching: Segundo participante se une como Member y activa la sala", () => {
  resetRooms();
  const user1 = matchOrCreateRoom({
    userId: "usr-tech-1",
    candidateName: "Dev Uno",
    level: "A2",
    domain: "tech",
    maxCapacity: 4,
  });

  const user2 = matchOrCreateRoom({
    userId: "usr-tech-2",
    candidateName: "Dev Dos",
    level: "A2",
    domain: "tech",
    maxCapacity: 4,
  });

  assert.equal(user2.isNewRoom, false);
  assert.equal(user2.room.id, user1.room.id);
  assert.equal(user2.member.role, "member");
  assert.equal(user2.room.status, "active");
  assert.equal(user2.room.members.length, 2);
});

test("Co-Op Smart Matching: Niveles incompatibles crean salas separadas", () => {
  resetRooms();
  const roomA1 = matchOrCreateRoom({
    userId: "usr-a1",
    candidateName: "Principiante",
    level: "A1",
    domain: "medical",
  });

  const roomB2 = matchOrCreateRoom({
    userId: "usr-b2",
    candidateName: "Avanzado",
    level: "B2",
    domain: "medical",
  });

  assert.notEqual(roomA1.room.id, roomB2.room.id);
  assert.equal(roomA1.room.level_cefr, "A1");
  assert.equal(roomB2.room.level_cefr, "B2");
});

test("Co-Op Smart Matching: Dominios distintos no se mezclan si no son generales", () => {
  resetRooms();
  const techRoom = matchOrCreateRoom({
    userId: "usr-t",
    candidateName: "Tech Guy",
    level: "B1",
    domain: "tech",
  });

  const medRoom = matchOrCreateRoom({
    userId: "usr-m",
    candidateName: "Doctor",
    level: "B1",
    domain: "medical",
  });

  assert.notEqual(techRoom.room.id, medRoom.room.id);
});

test("Co-Op Turnos y Talking Time: Calcula métricas y balancea participación", () => {
  resetRooms();
  const r1 = matchOrCreateRoom({ userId: "u1", candidateName: "Habla Mucho", level: "A2", domain: "tech" });
  matchOrCreateRoom({ userId: "u2", candidateName: "Tímido", level: "A2", domain: "tech" });

  const roomId = r1.room.id;

  // Turno largo de u1: Wetty sugiere a u2 (que tiene 0 segundos de voz)
  const turn1 = recordCoopTurn({ roomId, userId: "u1", audioDurationSeconds: 20, transcriptText: "I worked on the backend tickets all day." });
  assert.equal(turn1.suggestedNextSpeaker.userId, "u2");

  // Turno muy breve de u2
  const turn2 = recordCoopTurn({ roomId, userId: "u2", audioDurationSeconds: 4, transcriptText: "Me too." });

  assert.equal(turn2.totalTalkingTime, 24);
  assert.equal(turn2.participationStats.length, 2);

  const statU1 = turn2.participationStats.find((s) => s.userId === "u1");
  const statU2 = turn2.participationStats.find((s) => s.userId === "u2");

  assert.ok(statU1.percentage > 80);
  assert.ok(statU2.percentage < 20);
  // u2 requiere estímulo al tener < 50% de la media
  assert.equal(statU2.needsEncouragement, true);
});


test("Co-Op Detección de Silencios: Alerta tras >5s sin actividad", () => {
  resetRooms();
  const r = matchOrCreateRoom({ userId: "u1", candidateName: "Laura", level: "B1", domain: "corporate" });
  matchOrCreateRoom({ userId: "u2", candidateName: "David", level: "B1", domain: "corporate" });

  const room = coopMemoryStore.get(r.room.id);
  // Simular que pasaron 6 segundos desde el último turno
  room.lastInterventionTimestampMs = Date.now() - 6500;

  const silenceCheck = checkCoopSilence(r.room.id, 5000);
  assert.equal(silenceCheck.hasProlongedSilence, true);
  assert.ok(silenceCheck.interventionPrompt.facilitatorScript.includes("how would you approach"));
});

test("Co-Op Abandono de Sala: Reasigna host y limpia al quedar vacía", () => {
  resetRooms();
  const r1 = matchOrCreateRoom({ userId: "u1", candidateName: "Host Original", level: "A1", domain: "general" });
  matchOrCreateRoom({ userId: "u2", candidateName: "Sucesor", level: "A1", domain: "general" });

  const roomId = r1.room.id;
  // Sale el host
  const leave1 = leaveCoopRoom(roomId, "u1");
  assert.equal(leave1.success, true);
  assert.equal(leave1.remainingMembers, 1);

  const roomState = coopMemoryStore.get(roomId);
  assert.equal(roomState.created_by, "u2");
  assert.equal(roomState.members[0].role, "host");

  // Sale el segundo miembro
  const leave2 = leaveCoopRoom(roomId, "u2");
  assert.equal(leave2.success, true);
  assert.equal(leave2.remainingMembers, 0);
  assert.equal(coopMemoryStore.get(roomId), null);
});

test("Motor Acústico GOP: Detección de colapso de vocal laxa /ɪ/ en /iː/ tensa (ship vs sheep)", () => {
  // Simulación: Alumno pronuncia 'ship' con formantes tensos de /iː/ (F1=290, F2=2250)
  const collapsed = evaluateGopScore({
    word: "ship",
    f1: 290,
    f2: 2250,
  });

  assert.equal(collapsed.nativeLevel, false);
  assert.equal(collapsed.painType, "lax_tense_collapse");
  assert.equal(collapsed.observedPhoneme, "iː");
  assert.ok(collapsed.gopScore < 60);
  assert.ok(collapsed.articulatoryGuide.articulatoryTip.includes("No sonrías"));
  assert.ok(collapsed.recastingRecommendation.facilitatorTurn.includes("relaxed short vowel"));

  // Emisión nativa de /ɪ/ con formantes relajados (F1=400, F2=1900)
  const native = evaluateGopScore({
    word: "ship",
    f1: 400,
    f2: 1900,
  });

  assert.equal(native.nativeLevel, true);
  assert.equal(native.painType, null);
  assert.ok(native.gopScore >= 75);
});

test("Motor Acústico GOP: Detección de omisión de Schwa /ə/ en 'about' y sobre-articulación", () => {
  // Alumno articula la primera sílaba de 'about' como una /a/ abierta española (F1=700, F2=1400)
  const overarticulated = evaluateGopScore({
    word: "about",
    f1: 700,
    f2: 1400,
  });

  assert.equal(overarticulated.nativeLevel, false);
  assert.equal(overarticulated.painType, "schwa_omission");
  assert.ok(overarticulated.gopScore < 60);
  assert.ok(overarticulated.articulatoryGuide.articulatoryTip.includes("sonido más perezoso"));

  // Schwa centrada nativa (F1=500, F2=1500)
  const nativeSchwa = evaluateGopScore({
    word: "about",
    f1: 505,
    f2: 1490,
  });

  assert.equal(nativeSchwa.nativeLevel, true);
  assert.ok(nativeSchwa.gopScore >= 80);
});

test("Motor Acústico GOP: Detección de epéntesis consonántica /e/ protésica en 'student'", () => {
  // Alumno dice 'estudent' con energía vocalica previa a la /s/
  const epenthetic = evaluateGopScore({
    word: "student",
    hasProstheticVocalicEnergy: true,
  });

  assert.equal(epenthetic.nativeLevel, false);
  assert.equal(epenthetic.painType, "s_cluster_epenthesis");
  assert.equal(epenthetic.gopScore, 42);
  assert.ok(epenthetic.articulatoryGuide.articulatoryTip.includes("siseo de una serpiente"));
  assert.ok(epenthetic.recastingRecommendation.spanishClarification.includes("no añadir"));
});

test("Motor Acústico: Extracción de formantes desde buffer PCM de audio a 16 kHz", () => {
  // Generar señal sintética con componente de 400 Hz (F1) y 1800 Hz (F2)
  const sampleRate = 16000;
  const numSamples = 2048;
  const pcm = new Float32Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    pcm[i] = 0.5 * Math.sin(2 * Math.PI * 400 * t) + 0.3 * Math.sin(2 * Math.PI * 1800 * t);
  }

  const formants = extractFormantsFromPcm(pcm, sampleRate);
  assert.ok(formants.f1 >= 250 && formants.f1 <= 600, `F1 esperado cercano a 400, obtenido ${formants.f1}`);
  assert.ok(formants.f2 >= 1500 && formants.f2 <= 2200, `F2 esperado cercano a 1800, obtenido ${formants.f2}`);
});

test("Validadores Defensivos: Rechazan payloads inválidos para Co-Op y GOP", () => {
  // Coop Match: Sanitiza nivel y limita capacidad entre 2 y 6
  const matchPayload = validateCoopMatchPayload({
    level: "b1",
    domain: "tech",
    maxCapacity: 99, // Debe recortarse a 6
    candidateName: "  Ana Dev  ",
  });
  assert.equal(matchPayload.level, "B1");
  assert.equal(matchPayload.maxCapacity, 6);
  assert.equal(matchPayload.candidateName, "Ana Dev");

  // Coop Turn: Rechaza roomId vacío
  assert.throws(() => {
    validateCoopTurnPayload({ roomId: "" });
  }, ValidationError);

  // Acoustic GOP: Rechaza word vacía
  assert.throws(() => {
    validateAcousticGopPayload({ word: "" });
  }, ValidationError);
});

test("Integración Endpoints HTTP: POST /api/coop/match y POST /api/acoustic/gop-score", async () => {
  resetRooms();
  const { handleRequest } = await import("../server.js");

  // Helper para simular req/res nativo
  const invokeServer = async (method, path, bodyObj, headers = {}) => {
    return new Promise((resolve) => {
      let reqBody = typeof bodyObj === "object" ? JSON.stringify(bodyObj) : "";
      const req = {
        method,
        url: path,
        headers: {
          host: "127.0.0.1:3000",
          origin: "http://127.0.0.1:3000",
          "content-type": "application/json",
          "x-user-id": "usr-test-runner",
          ...headers,
        },
        on(event, handler) {
          if (event === "data" && reqBody) {
            handler(Buffer.from(reqBody));
          }
          if (event === "end") {
            handler();
          }
          return this;
        },
        socket: { remoteAddress: "127.0.0.1" },
      };

      let statusCode = 200;
      let responseHeaders = {};
      let responseData = "";

      const res = {
        writeHead(code, head) {
          statusCode = code;
          responseHeaders = head;
        },
        end(chunk) {
          if (chunk) responseData += chunk.toString();
          let json = null;
          try { json = JSON.parse(responseData); } catch {}
          resolve({ status: statusCode, headers: responseHeaders, data: json || responseData });
        },
      };

      handleRequest(req, res);
    });
  };

  // 1. Probar POST /api/coop/match
  const matchRes = await invokeServer("POST", "/api/coop/match", {
    level: "A2",
    domain: "tech",
    candidateName: "Test Lead",
    maxCapacity: 4,
  });

  assert.equal(matchRes.status, 200);
  assert.ok(matchRes.data.room.id);
  assert.equal(matchRes.data.room.professional_domain, "tech");

  // 2. Probar POST /api/coop/turn
  const turnRes = await invokeServer("POST", "/api/coop/turn", {
    roomId: matchRes.data.room.id,
    audioDurationSeconds: 5,
    transcriptText: "Sprint goal achieved.",
    gopScore: 82,
  });

  assert.equal(turnRes.status, 200);
  assert.equal(turnRes.data.turnRecord.durationSeconds, 5);
  assert.ok(turnRes.data.participationStats.length >= 1);

  // 3. Probar GET /api/coop/silence-check
  const silenceRes = await invokeServer("GET", `/api/coop/silence-check?roomId=${matchRes.data.room.id}`, null);
  assert.equal(silenceRes.status, 200);
  assert.equal(typeof silenceRes.data.hasProlongedSilence, "boolean");

  // 4. Probar POST /api/acoustic/gop-score
  const gopRes = await invokeServer("POST", "/api/acoustic/gop-score", {
    word: "student",
    hasProstheticVocalicEnergy: true,
  });

  assert.equal(gopRes.status, 200);
  assert.equal(gopRes.data.painType, "s_cluster_epenthesis");
  assert.equal(gopRes.data.gopScore, 42);
});
