import { parseTones } from "/tone.js";
import { analyzeAsync } from "/tone-client.js";

const $ = (s) => document.querySelector(s);
const store = { get: (k, d) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* ignorar */ } } };

let currentUser = null;
try {
  const raw = store.get("polyglot_user", null);
  if (raw) currentUser = JSON.parse(raw);
} catch {}

// Gestión de Visión Clara (Día) / Oscura (Noche)
let currentTheme = store.get("polyglot_theme", "dark");
function applyTheme(theme) {
  currentTheme = theme;
  document.documentElement.setAttribute("data-theme", theme);
  store.set("polyglot_theme", theme);
  const icon = $("#themeIcon");
  if (icon) {
    icon.textContent = theme === "light" ? "🌙" : "☀️";
  }
}
applyTheme(currentTheme);

const api = async (p, opt = {}) => {
  const headers = { ...(opt.headers || {}) };
  if (currentUser?.id) {
    headers["X-User-Id"] = currentUser.id;
  }
  const r = await fetch(p, { ...opt, headers });
  const t = await r.text();
  let j = null; try { j = JSON.parse(t); } catch { /* texto plano */ }
  if (!r.ok) {
    const msg = (j?.error === "limite_diario" || j?.reason === "daily_limit")
      ? "Llegaste al límite de hoy. Vuelve mañana."
      : (j?.message || j?.error || t || `HTTP ${r.status}`);
    const err = new Error(msg);
    err.status = r.status;
    err.data = j;
    throw err;
  }
  return j ?? t;
};
const post = (p, b) => api(p, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b ?? {}) });
const get = (p) => api(p);
const toast = (t) => { const el = $("#toast"); el.textContent = t; el.classList.add("on"); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove("on"), 2800); };
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };


let S = null;
const lang = () => $("#lang").value;

// Estado del tutor interactivo
let conversationHistory = [];
let recognition = null;
let isRecording = false;
let isConnected = false;
let currentSynthUtterance = null;
let tStop = 0;

// ==========================================================================
// SELECTOR DE ESCENARIOS DINÁMICOS (SOLUCIÓN 5: CONTEXTOS FLEXIBLES Y VIVOS)
// ==========================================================================
const SCENARIO_LABELS = {
  casual: "☕ Vida Cotidiana",
  tech: "💻 Tech Standup",
  corporate: "💼 Business & Sales",
  medical: "🏥 Clinical & Care",
};

let currentScenario = store.get("polyglot_scenario", "casual");

function selectScenario(scenarioId, notify = false) {
  if (!SCENARIO_LABELS[scenarioId]) scenarioId = "casual";
  currentScenario = scenarioId;
  store.set("polyglot_scenario", scenarioId);

  document.querySelectorAll(".scenario-card").forEach((card) => {
    const isSelected = card.dataset.scenario === scenarioId;
    card.classList.toggle("active", isSelected);
    card.setAttribute("aria-checked", isSelected ? "true" : "false");
  });

  const activeBadge = $("#activeScenarioLabel");
  if (activeBadge) {
    activeBadge.textContent = SCENARIO_LABELS[scenarioId] || "☕ Vida Cotidiana";
  }

  if (notify) {
    toast(`🎯 Enfoque cambiado a: ${SCENARIO_LABELS[scenarioId]}`);
    if (isConnected) {
      status(`Contexto activo: ${SCENARIO_LABELS[scenarioId]}. Wetty adaptará sus próximas réplicas.`);
    }
  }
}

function paint() {
  const meterEl = $(".meter");
  if (meterEl) {
    if (!S.xp || S.xp === 0) {
      meterEl.style.display = "none";
    } else {
      meterEl.style.display = "flex";
      $("#lv").textContent = `Nv ${S.level}`;
      $("#xb").style.width = `${(S.levelProgress / S.levelSize) * 100}%`;
      $("#xp").textContent = `${S.xp} XP`;
    }
  }

  const streakEl = $("#streak");
  if (streakEl) {
    if (!S.streak || S.streak === 0) {
      streakEl.style.display = "none";
    } else {
      streakEl.style.display = "inline-flex";
      streakEl.textContent = `🔥 Racha ${S.streak} ${S.streak === 1 ? "día" : "días"}`;
    }
  }

  const dueEl = $("#duechip");
  if (dueEl) {
    if (!S.due || S.due === 0) {
      dueEl.style.display = "none";
    } else {
      dueEl.style.display = "inline-flex";
      dueEl.textContent = `📚 ${S.due} por repasar`;
    }
  }

  const userLabel = $("#userName");
  const authBtn = $("#authBtn");
  if (userLabel) {
    if (currentUser?.email) {
      userLabel.textContent = currentUser.email.split("@")[0];
      authBtn?.classList.add("logged-in");
    } else {
      userLabel.textContent = "Mi Cuenta";
      authBtn?.classList.remove("logged-in");
    }
  }
}

function fillSelectors() {
  const L = S.langs[lang()];
  const savedLv = store.get(`level_${lang()}`, L.levels[0]);
  $("#level").replaceChildren(...L.levels.map((v) => { const o = el("option", "", v); o.value = v; o.selected = v === savedLv; return o; }));

  const savedM = store.get("mission", S.missions[0].id);
  const currentLang = lang();
  const currentLv = $("#level").value || L.levels[0];
  const currList = S.curriculum?.[currentLang]?.[currentLv];

  if (Array.isArray(currList) && currList.length > 0) {
    $("#mission").replaceChildren(...currList.map((item) => {
      const o = el("option", "", `Lección ${item.order}: ${item.title}`);
      o.value = item.id;
      o.selected = item.id === savedM;
      return o;
    }));
  } else {
    $("#mission").replaceChildren(...S.missions.map((m) => {
      const o = el("option", "", m.title);
      o.value = m.id;
      o.selected = m.id === savedM;
      return o;
    }));
  }
  renderObjectives();
}

$("#lang").addEventListener("change", async () => {
  store.set("lang", lang());
  fillSelectors();
  updateTutorPersona();
  await refresh();
  loadDrills();
});
$("#level").addEventListener("change", () => {
  store.set(`level_${lang()}`, $("#level").value);
  fillSelectors();
  renderObjectives();
});
$("#mission").addEventListener("change", () => {
  store.set("mission", $("#mission").value);
  done.clear();
  renderObjectives();
});

const done = new Set();
const mission = () => S.missions.find((m) => m.id === $("#mission").value);

function getAdaptedMission() {
  const m = mission();
  if (!m) return null;
  const lv = $("#level")?.value || "A1";
  const catalog = S?.missionsCatalog?.[m.id];
  if (catalog) {
    const isZh = lang() === "zh";
    const levelData = catalog[lv] || (isZh ? catalog.HSK1 : catalog.A1) || catalog[Object.keys(catalog)[0]];
    if (levelData) {
      return {
        ...m,
        scene: levelData.scene,
        objectives: levelData.objectives,
        opening: levelData.opening,
      };
    }
  }
  return m;
}

// Subtítulos y traductor opcional
let showTranslation = store.get("show_trans", "true") === "true";

function updateTransToggle() {
  const btn = $("#toggleTransBtn");
  const lbl = $("#transStateLabel");
  if (!btn) return;
  if (showTranslation) {
    btn.classList.add("active");
    if (lbl) lbl.textContent = "ON";
  } else {
    btn.classList.remove("active");
    if (lbl) lbl.textContent = "OFF";
  }
  document.querySelectorAll(".msg-trans").forEach((el) => {
    if (showTranslation) el.classList.remove("hidden");
    else el.classList.add("hidden");
  });
}

$("#toggleTransBtn")?.addEventListener("click", () => {
  showTranslation = !showTranslation;
  store.set("show_trans", String(showTranslation));
  updateTransToggle();
});

function renderObjectives() {
  const m = getAdaptedMission();
  $("#objs").replaceChildren(...(m ? m.objectives : []).map((o, i) => el("li", done.has(i) ? "done" : "", `${done.has(i) ? "✓" : "○"} ${o}`)));
}

function renderFacilitatorCard(fac, turnVocab = []) {
  if (!fac || !fac.userAnalysis) return null;
  const card = el("div", "facilitator-card");

  // Header del Facilitador
  const header = el("div", "facilitator-header");
  const title = el("div", "facilitator-title");
  title.innerHTML = `<span>🎓</span> <b>Facilitador Pedagógico</b>`;
  const badge = el("span", "facilitator-badge", fac.competencyFocus ? fac.competencyFocus.toUpperCase() : "COACH");
  header.append(title, badge);
  card.append(header);

  // Aliento permanente / Motivación
  if (fac.encouragement) {
    const encDiv = el("div", "facilitator-encouragement");
    encDiv.innerHTML = `<span>🌟</span> <span>${fac.encouragement}</span>`;
    card.append(encDiv);
  }

  // Diagnóstico pedagógico en español
  const analysis = el("div", "facilitator-analysis");
  analysis.textContent = fac.userAnalysis;
  card.append(analysis);

  // Alternativas: Forma correcta estándar y alternativa nativa idiomática
  if (fac.correctForm || fac.nativeAlternative) {
    const altsGrid = el("div", "facilitator-alternatives");

    if (fac.correctForm) {
      const boxCorrect = el("div", "alt-box");
      const lbl = el("div", "alt-label correct", "✅ Forma Correcta");
      const txt = el("div", "alt-text", fac.correctForm);
      const actions = el("div", "alt-actions");
      const listenBtn = el("button", "alt-listen-btn", "🔊 Escuchar");
      listenBtn.type = "button";
      listenBtn.onclick = () => speakVoice(fac.correctForm);
      actions.append(listenBtn);
      boxCorrect.append(lbl, txt, actions);
      altsGrid.append(boxCorrect);
    }

    if (fac.nativeAlternative) {
      const boxNative = el("div", "alt-box native-box");
      const lbl = el("div", "alt-label native", "💎 Cómo lo diría un Nativo");
      const txt = el("div", "alt-text", fac.nativeAlternative);
      const actions = el("div", "alt-actions");
      const listenBtn = el("button", "alt-listen-btn", "🔊 Escuchar");
      listenBtn.type = "button";
      listenBtn.onclick = () => speakVoice(fac.nativeAlternative);
      actions.append(listenBtn);
      boxNative.append(lbl, txt, actions);
      altsGrid.append(boxNative);
    }

    card.append(altsGrid);
  }

  // Vocabulario clave extraído en este turno específico
  if (Array.isArray(turnVocab) && turnVocab.length > 0) {
    const vocabWrap = el("div", "facilitator-vocab-strip");
    const vTitle = el("div", "vocab-strip-title", "🔑 Vocabulario clave del turno:");
    const vChips = el("div", "vocab-strip-chips");
    turnVocab.forEach((item) => {
      const chip = el("div", "vocab-chip");
      const wSpan = el("b", "chip-word", item.word);
      const tSpan = el("span", "chip-trans", ` · ${item.translation}`);
      const btn = el("button", "chip-audio-btn", "🔊");
      btn.type = "button";
      btn.title = "Escuchar";
      btn.onclick = () => speakVoice(item.word);
      chip.append(wSpan, tSpan, btn);
      vChips.append(chip);
    });
    vocabWrap.append(vTitle, vChips);
    card.append(vocabWrap);
  }

  // Repetición contextual para niveles iniciales
  if (fac.repetitionPrompt) {
    const repDiv = el("div", "facilitator-repetition");
    const repText = el("span", "", `🔁 ${fac.repetitionPrompt}`);
    const repBtn = el("button", "rep-action-btn", "🎙️ Repetir frase");
    repBtn.type = "button";
    repBtn.onclick = () => {
      const clean = fac.repetitionPrompt.replace(/^[«"]|[»"]$/g, "").replace(/^Repite en voz alta:\s*«?/i, "").replace(/[»"]$/, "");
      const chatInput = $("#chatText");
      if (chatInput) {
        chatInput.value = clean;
        chatInput.focus();
      }
      speakVoice(clean);
    };
    repDiv.append(repText, repBtn);
    card.append(repDiv);
  }

  $("#chat").append(card);
  $("#chat").scrollTop = 1e9;
  return card;
}

function say(cls, text, meta = {}) {
  const b = el("div", `b ${cls}`);
  if (cls === "ai") {
    const mainTxt = el("div", "msg-text", text);
    b.append(mainTxt);

    if (meta.translation) {
      const transDiv = el("div", `msg-trans ${showTranslation ? "" : "hidden"}`);
      const tag = el("span", "trans-tag", "ES");
      transDiv.append(tag, document.createTextNode(meta.translation));
      b.append(transDiv);
    }

    if (meta.tip) {
      const tipDiv = el("div", "msg-tip");
      tipDiv.append(document.createTextNode(`💡 ${meta.tip}`));
      b.append(tipDiv);
    }

    const actions = el("div", "msg-actions");
    const listenBtn = el("button", "msg-action-btn", "🔊 Escuchar");
    listenBtn.type = "button";
    listenBtn.onclick = () => speakVoice(text);
    actions.append(listenBtn);
    b.append(actions);
  } else {
    b.textContent = text;
  }
  $("#chat").append(b);
  $("#chat").scrollTop = 1e9;
  return b;
}

function status(t) {
  $("#status").textContent = t;
}

function updateTutorPersona() {
  const isZh = lang() === "zh";
  const avatarEl = $("#avatarIcon");
  if (avatarEl) {
    if (isZh) {
      avatarEl.innerHTML = `👩🏻`;
    } else {
      avatarEl.innerHTML = `<img id="avatarImg" src="/wetty.jpg" alt="Wetty · Tutora de Inglés" class="tutor-avatar-img">`;
    }
  }
  $("#tutorName").textContent = isZh ? "Mei (美) · Tutora de Chino" : "Wetty · Tutora de Inglés";
  $("#tutorRole").textContent = isZh
    ? "Practica pronunciación tonal y conversación guiada en mandarín."
    : "Conversación guiada por competencias para fluidez inmediata y confianza.";
}

// Idioma activo para el micrófono: por defecto el de estudio, con posibilidad de alternar a español
let speechInputLang = store.get("speech_input_lang", "target"); // 'target' o 'es'

function getSpeechLangCode() {
  if (speechInputLang === "es") return "es-ES";
  return lang() === "zh" ? "zh-CN" : "en-US";
}

function updateSpeechLangToggleUI() {
  const lbl = $("#speechLangLabel");
  const icon = $("#speechLangIcon");
  if (!lbl) return;
  if (speechInputLang === "es") {
    lbl.textContent = "ES";
    if (icon) icon.textContent = "🗣️";
  } else {
    lbl.textContent = lang() === "zh" ? "ZH" : "EN";
    if (icon) icon.textContent = "🎙️";
  }
}

$("#speechLangToggleBtn")?.addEventListener("click", () => {
  speechInputLang = speechInputLang === "target" ? "es" : "target";
  store.set("speech_input_lang", speechInputLang);
  updateSpeechLangToggleUI();
  if (recognition) {
    recognition.lang = getSpeechLangCode();
  }
  toast(`Micrófono configurado en: ${speechInputLang === "es" ? "Español (ES)" : (lang() === "zh" ? "Chino Mandarín (ZH)" : "Inglés (EN)")}`);
});

// Inicialización de Reconocimiento de Voz nativo (Web Speech API)
function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.warn("SpeechRecognition no soportado nativamente en este navegador");
    return null;
  }
  const rec = new SpeechRecognition();
  // Modo continuo: NO corta abruptamente si el alumno hace pausas para pensar
  rec.continuous = true;
  rec.interimResults = true;
  rec.maxAlternatives = 1;

  let activeTranscript = "";

  rec.onstart = () => {
    isRecording = true;
    activeTranscript = $("#chatText") ? $("#chatText").value : "";
    if ($("#voiceBtn")) $("#voiceBtn").classList.add("recording");
    if ($("#pulseDot")) $("#pulseDot").style.display = "block";
    const langName = speechInputLang === "es" ? "español" : (lang() === "zh" ? "chino mandarín" : "inglés");
    recordingStartTime = performance.now();
    status(`🔴 Micrófono abierto (${langName}) — habla a tu ritmo y toca de nuevo el mic para enviar`);
  };

  rec.onresult = (e) => {
    let interim = "";
    let finalChunk = "";
    for (let i = e.resultIndex; i < e.results.length; ++i) {
      if (e.results[i].isFinal) {
        finalChunk += e.results[i][0].transcript + " ";
      } else {
        interim += e.results[i][0].transcript;
      }
    }
    if (finalChunk) {
      activeTranscript += finalChunk;
    }
    const current = (activeTranscript + (interim ? " " + interim : "")).trim();
    if (current && $("#chatText")) {
      $("#chatText").value = current;
    }
  };

  rec.onerror = (e) => {
    console.warn("Speech recognition error:", e.error);
    if (e.error === "not-allowed" || e.error === "service-not-allowed") {
      isRecording = false;
      if ($("#voiceBtn")) $("#voiceBtn").classList.remove("recording");
      showMicBlockedModal();
    } else if (e.error === "no-speech") {
      // Ignorar silencio temporal para permitir al alumno pensar sin cortar la sesión
      console.log("Silencio detectado; micrófono sigue activo");
    }
  };

  rec.onend = async () => {
    // Si fue detenido explícitamente por el usuario
    if (!isRecording) {
      if ($("#voiceBtn")) $("#voiceBtn").classList.remove("recording");
      if ($("#pulseDot")) $("#pulseDot").style.display = "none";
      status(isConnected ? "Listo: habla o escribe tu respuesta" : "Desconectado");
      return;
    }

    // Si el navegador cortó por inactividad extrema pero el usuario seguía grabando, reiniciar automáticamente
    try {
      rec.start();
    } catch {
      isRecording = false;
      if ($("#voiceBtn")) $("#voiceBtn").classList.remove("recording");
      if ($("#pulseDot")) $("#pulseDot").style.display = "none";
    }
  };

  return rec;
}

function showMicBlockedModal() {
  const modal = $("#micBlockedModal");
  if (modal) modal.hidden = false;
  // Dejar campo de texto habilitado y enfocarlo
  const txt = $("#chatText");
  if (txt) {
    txt.removeAttribute("disabled");
    txt.focus();
  }
}

let recordingStartTime = 0;

function toggleRecording() {
  if (!isConnected) {
    toast("Presiona 'Empezar' para iniciar la sesión con tu tutor.");
    return;
  }

  // Si el usuario aún no vio la explicación previa del permiso de micrófono
  const explained = store.get("mic_permission_explained");
  if (!explained) {
    const explainer = $("#micExplainerModal");
    if (explainer) {
      explainer.hidden = false;
      return;
    }
  }

  startOrStopRecording();
}

function startOrStopRecording() {
  if (!recognition) recognition = initSpeechRecognition();
  if (!recognition) {
    showMicBlockedModal();
    return;
  }

  if (isRecording) {
    // Al presionar para cerrar el micrófono: enviar la frase completa
    isRecording = false;
    const sttDurationMs = recordingStartTime ? Math.round(performance.now() - recordingStartTime) : 0;
    recordingStartTime = 0;
    try { recognition.stop(); } catch {}
    if ($("#voiceBtn")) $("#voiceBtn").classList.remove("recording");
    if ($("#pulseDot")) $("#pulseDot").style.display = "none";

    const textToSend = ($("#chatText")?.value || "").trim();
    if (textToSend) {
      sendUserTurn(textToSend, sttDurationMs);
    } else {
      status("Listo: habla o escribe tu respuesta");
    }
  } else {
    // Iniciar escucha pausada
    recognition.lang = getSpeechLangCode();
    try {
      recognition.start();
    } catch (err) {
      console.warn("Error al iniciar reconocimiento:", err);
      showMicBlockedModal();
    }
  }
}

async function sendUserTurn(rawText, sttDurationMs = 0) {
  const text = (rawText || "").trim();
  if (!text) return;
  if (!isConnected) {
    toast("Primero presiona 'Empezar' para abrir la sesión.");
    return;
  }

  say("me", text);
  if ($("#chatText")) $("#chatText").value = "";
  tStop = performance.now();
  await sendTurnToTutor(text, sttDurationMs);
}

// Envío del turno a Gemini (Backend) con medición precisa de latencia
async function sendTurnToTutor(userText, sttDurationMs = 0) {
  status("Wetty está pensando…");
  $("#avatarIcon").classList.add("speaking");

  // Si tarda más de 3s, informar al usuario que el servidor o modelo está despertando
  const slowTimer = setTimeout(() => {
    status("Despertando el tutor, un momento...");
    const latEl = $("#lat");
    if (latEl) latEl.textContent = "despertando...";
  }, 3000);

  conversationHistory.push({
    role: "user",
    parts: [{ text: userText }]
  });

  const turnStart = performance.now();

  try {
    const res = await post("/api/chat", {
      messages: conversationHistory,
      lang: lang(),
      level: $("#level").value,
      mission: $("#mission").value,
      scenario: currentScenario,
      userName: currentUser?.name || currentUser?.email?.split("@")[0] || "",
      domain: currentUser?.domain || "general",
      sttMs: Math.round(sttDurationMs),
    });

    clearTimeout(slowTimer);

    const modelLatencyMs = Math.round(performance.now() - turnStart);
    const reply = res.reply || "";

    conversationHistory.push({
      role: "model",
      parts: [{ text: reply }]
    });

    say("ai", reply, {
      translation: res.translation,
      tip: null,
    });

    if (res.facilitator) {
      renderFacilitatorCard(res.facilitator, res.vocabulary);
    }

    // Actualización inmediata del vocabulario de la sesión
    if (Array.isArray(res.sessionVocab)) {
      if (!S) S = {};
      S.sessionVocab = res.sessionVocab;
      renderSessionVocab();
    }

    status("Conectado: responde por texto o voz");

    // Medición de voz del tutor (TTS) y total del turno
    const ttsStart = performance.now();
    speakVoice(reply);
    const ttsEstimateMs = Math.min(250, Math.round(performance.now() - ttsStart));
    const totalTurnMs = Math.round(sttDurationMs + modelLatencyMs + ttsEstimateMs);

    const latEl = $("#lat");
    if (latEl) {
      latEl.textContent = `${totalTurnMs} ms (modelo: ${modelLatencyMs}ms)`;
    }

    // Revisar objetivos pedagógicamente
    checkMissionProgress(userText, res.completedObjectives);
    await refresh();
  } catch (err) {
    clearTimeout(slowTimer);
    say("sys", `Error de respuesta: ${err.message}`);
    status("Error de conexión");
  } finally {
    $("#avatarIcon").classList.remove("speaking");
  }
}

// Síntesis de voz natural del tutor (SpeechSynthesis)
let cachedVoices = [];
function loadSystemVoices() {
  if (!("speechSynthesis" in window)) return;
  cachedVoices = window.speechSynthesis.getVoices() || [];
}
if ("speechSynthesis" in window) {
  loadSystemVoices();
  window.speechSynthesis.onvoiceschanged = loadSystemVoices;
}

function cleanTextForSpeech(raw) {
  if (!raw) return "";
  let clean = raw;
  // 1. Eliminar pinyin o explicaciones entre paréntesis (ej: "(Nǐ hǎo! Hěn gāoxìng...)")
  clean = clean.replace(/\([A-Za-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ\s,.'!?-]+\)/g, "");
  // 2. Eliminar notas entre corchetes
  clean = clean.replace(/\[.*?\]/g, "");
  // 3. Eliminar asteriscos markdown
  clean = clean.replace(/\*+/g, "");
  // 4. Eliminar emojis
  clean = clean.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "");
  return clean.trim();
}

function speakVoice(text) {
  if (!("speechSynthesis" in window) || !text) return;

  const synth = window.speechSynthesis;

  // En PC (Chrome / Windows) speechSynthesis puede quedar en estado encolado o pausado
  try {
    if (synth.speaking || synth.pending) {
      synth.cancel();
    }
    if (synth.paused) {
      synth.resume();
    }
  } catch (e) {
    console.warn("Speech cancel error:", e);
  }

  const clean = cleanTextForSpeech(text);
  if (!clean) return;

  const ut = new SpeechSynthesisUtterance(clean);
  const targetLang = lang();
  ut.lang = targetLang === "zh" ? "zh-CN" : "en-US";
  ut.rate = targetLang === "zh" ? 0.90 : 0.95;
  ut.pitch = 1.0;

  const voices = synth.getVoices() || cachedVoices;
  if (voices && voices.length > 0) {
    const langPrefix = targetLang === "zh" ? "zh" : "en";
    const candidates = voices.filter((v) => v.lang && v.lang.toLowerCase().replace("_", "-").startsWith(langPrefix));
    // Para Wetty (Inglés), priorizar voz femenina nativa clara y amigable
    const femaleVoice = candidates.find((v) => /zira|jenny|aria|samantha|karen|victoria|susan|cathy|female|woman/i.test(v.name))
      || candidates.find((v) => /natural|premium|online|google/i.test(v.name) && !/david|george|mark|guy|male/i.test(v.name))
      || candidates[0];
    if (femaleVoice) {
      ut.voice = femaleVoice;
      ut.lang = femaleVoice.lang;
    }
  }

  ut.onstart = () => {
    $("#avatarIcon")?.classList.add("speaking");
    const badge = $("#tutorBadge");
    if (badge) badge.textContent = "Hablando…";
  };
  // En Chrome de Windows/Laptop, almacenar en ámbito global previene que el Garbage Collector recoja la voz
  currentSynthUtterance = ut;

  ut.onend = () => {
    currentSynthUtterance = null;
    $("#avatarIcon")?.classList.remove("speaking");
    const badge = $("#tutorBadge");
    if (badge) badge.textContent = isConnected ? "Escuchando" : "Listo";
  };

  ut.onerror = (e) => {
    console.warn("SpeechSynthesis error:", e);
    currentSynthUtterance = null;
    $("#avatarIcon")?.classList.remove("speaking");
    const badge = $("#tutorBadge");
    if (badge) badge.textContent = isConnected ? "Listo" : "Desconectado";
  };

  try {
    synth.speak(ut);
    if (synth.paused) {
      synth.resume();
    }
  } catch (err) {
    console.warn("Fallo al reproducir utterance:", err);
  }
}

let lessonModalShown = false;

function checkMissionProgress(userText, completedIndices = []) {
  const m = getAdaptedMission();
  if (!m || !m.objectives || !m.objectives.length) return;

  // 1. Evaluación directa devuelta por el Agente Pedagógico (modelo)
  if (Array.isArray(completedIndices) && completedIndices.length > 0) {
    for (const idx of completedIndices) {
      if (Number.isInteger(idx) && idx >= 0 && idx < m.objectives.length && !done.has(idx)) {
        done.add(idx);
        renderObjectives();
        post("/api/tool", { name: "mission_progress", args: { objective_index: idx }, lang: lang(), mission: m.id, done: [...done] }).then((r) => applyFx(r.fx)).catch(() => {});
      }
    }
  }

  // 2. Coincidencias contextuales basadas en Can-Do descriptors
  const lower = userText.toLowerCase();
  m.objectives.forEach((obj, idx) => {
    if (done.has(idx)) return;
    const objLower = obj.toLowerCase();
    const hasMatch = (
      (objLower.includes("saludar") && (lower.includes("hello") || lower.includes("hi") || lower.includes("good") || lower.includes("你好"))) ||
      (objLower.includes("pedir") && (lower.includes("want") || lower.includes("like") || lower.includes("have") || lower.includes("get") || lower.includes("coffee") || lower.includes("tea") || lower.includes("我要"))) ||
      (objLower.includes("nombre") && (lower.includes("name") || lower.includes("i am") || lower.includes("i'm") || lower.includes("叫"))) ||
      (objLower.includes("gracias") && (lower.includes("thank") || lower.includes("thanks") || lower.includes("please") || lower.includes("谢谢"))) ||
      (objLower.includes("precio") && (lower.includes("much") || lower.includes("cost") || lower.includes("price") || lower.includes("多少钱")))
    );
    if (hasMatch) {
      done.add(idx);
      renderObjectives();
      post("/api/tool", { name: "mission_progress", args: { objective_index: idx }, lang: lang(), mission: m.id, done: [...done] }).then((r) => applyFx(r.fx)).catch(() => {});
    }
  });

  // Si todos los objetivos de la lección fueron logrados, celebrar y abrir modal de calificación
  if (done.size >= m.objectives.length && !lessonModalShown) {
    lessonModalShown = true;
    setTimeout(() => {
      showLessonCompleteModal(m);
    }, 700);
  }
}

function applyFx(fx) {
  if (!fx) return;
  if (Number.isInteger(fx.objective)) { done.add(fx.objective); renderObjectives(); }
  if (fx.toast) toast(`${fx.toast}${fx.xp ? `  +${fx.xp} XP` : ""}`);
  if (fx.badge) say("sys", `Medalla obtenida: ${fx.badge}`);
}

async function connect() {
  if ($("#connect")) $("#connect").disabled = true;
  done.clear();
  lessonModalShown = false;
  renderObjectives();
  if ($("#chat")) $("#chat").replaceChildren();
  status("Conectando con el tutor…");

  try {
    const studentName = currentUser?.name || currentUser?.email?.split("@")[0] || "";
    const studentDomain = currentUser?.domain || "general";
    const q = new URLSearchParams({
      lang: lang(),
      level: $("#level").value,
      mission: $("#mission").value,
      scenario: currentScenario,
      userName: studentName,
      domain: studentDomain,
    });
    const sess = await api(`/api/session?${q}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });

    isConnected = true;
    conversationHistory = [];
    if ($("#hangup")) $("#hangup").disabled = false;
    if ($("#connect")) $("#connect").disabled = true;
    if ($("#chatText")) { $("#chatText").disabled = false; $("#chatText").focus(); }
    if ($("#sendBtn")) $("#sendBtn").disabled = false;
    if ($("#voiceBtn")) $("#voiceBtn").disabled = false;
    if ($("#tutorBadge")) $("#tutorBadge").textContent = "Conectado";

    // Mensaje de apertura adaptado a la misión y nivel
    const adapted = getAdaptedMission();
    let greeting = sess?.opening?.greeting || adapted?.opening?.greeting;
    let greetingTrans = sess?.opening?.translation || adapted?.opening?.translation;

    if (!greeting) {
      greeting = lang() === "zh"
        ? "你好！很高兴见到你。你想喝咖啡还是茶？"
        : "Hello! Welcome to our session. Are you ready to start?";
      greetingTrans = lang() === "zh"
        ? "¡Hola! Mucho gusto en verte. ¿Deseas café o té?"
        : "¡Hola! Bienvenido a nuestra sesión. ¿Estás listo para comenzar?";
    }

    conversationHistory = [
      { role: "model", parts: [{ text: greeting }] }
    ];

    say("ai", greeting, { translation: greetingTrans });
    speakVoice(greeting);
    status("Conectado: escribe o pulsa el micrófono");
  } catch (e) {
    status(`Error: ${e.message}`);
    say("sys", `No se pudo conectar. ${e.message}`);
    hangup();
  }
}

function hangup() {
  isConnected = false;
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  if (recognition) {
    try { recognition.abort(); } catch {}
  }
  if ($("#connect")) $("#connect").disabled = false;
  if ($("#hangup")) $("#hangup").disabled = true;
  if ($("#chatText")) { $("#chatText").disabled = true; $("#chatText").value = ""; }
  if ($("#sendBtn")) $("#sendBtn").disabled = true;
  if ($("#voiceBtn")) $("#voiceBtn").disabled = true;
  if ($("#pulseDot")) $("#pulseDot").style.display = "none";
  if ($("#tutorBadge")) $("#tutorBadge").textContent = "Desconectado";
  status("Desconectado");

  // Persistir conversación en Supabase / Multi-tenant store si tuvo intercambios
  if (conversationHistory.length >= 2) {
    post("/api/conversations", {
      lang: lang(),
      level: $("#level").value,
      mission: $("#mission").value,
      turns: conversationHistory,
    }).catch(() => {});
  }

  refresh();
}

$("#connect").addEventListener("click", connect);
$("#hangup").addEventListener("click", hangup);
$("#mute")?.addEventListener("click", toggleRecording);
$("#voiceBtn")?.addEventListener("click", toggleRecording);
$("#sendBtn")?.addEventListener("click", () => sendUserTurn($("#chatText").value));
$("#chatText")?.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendUserTurn($("#chatText").value);
  }
});

// Toggle del cajón de objetivos
$("#toggleObjsBtn")?.addEventListener("click", () => {
  const drawer = $("#objsDrawer");
  if (drawer) drawer.classList.toggle("collapsed");
});

// ---------------------------------------------------------------- Modal y Progresión Curricular
function showLessonCompleteModal(m) {
  const modal = $("#lessonCompleteModal");
  if (!modal) return;

  const totalObjs = m?.objectives?.length || 1;
  const completedObjs = done.size;
  const comp = S?.competencies || { grammar: 75, vocabulary: 80, fluency: 70, comprehension: 85 };

  // Cálculo de calificación pedagógica de 0 a 100
  const objScore = Math.min(60, Math.round((completedObjs / totalObjs) * 60));
  const compAvg = Math.round(((comp.grammar || 70) + (comp.vocabulary || 70) + (comp.fluency || 70) + (comp.comprehension || 70)) / 4);
  const totalScore = Math.min(100, Math.max(65, objScore + Math.round(compAvg * 0.4)));

  const numEl = $("#lessonScoreNum");
  if (numEl) numEl.textContent = totalScore;

  let stars = "⭐⭐⭐";
  let verdict = "¡Dominio sobresaliente del nivel!";
  if (totalScore < 75) {
    stars = "⭐";
    verdict = "¡Buen esfuerzo! Continúa practicando para afianzar el vocabulario.";
  } else if (totalScore < 90) {
    stars = "⭐⭐";
    verdict = "¡Muy buen desempeño! Comunicación clara y efectiva.";
  }

  const starsEl = $("#lessonStars");
  if (starsEl) starsEl.textContent = stars;
  const verdictEl = $("#lessonVerdict");
  if (verdictEl) verdictEl.textContent = verdict;
  const titleEl = $("#lessonModalTitle");
  if (titleEl) titleEl.textContent = `¡Lección: ${m?.title || "Completada"}!`;
  const subEl = $("#lessonModalSubtitle");
  if (subEl) subEl.textContent = `Has alcanzado ${completedObjs} de ${totalObjs} objetivos pedagógicos.`;

  // Actualizar barras de competencias
  const setCompBar = (meterId, valId, val) => {
    const meter = $(meterId);
    const label = $(valId);
    const scoreVal = Math.min(100, Math.max(20, Math.round(val || 75)));
    if (meter) meter.style.width = `${scoreVal}%`;
    if (label) label.textContent = `${scoreVal}%`;
  };

  setCompBar("#compMeterCompr", "#compValCompr", comp.comprehension);
  setCompBar("#compMeterFluency", "#compValFluency", comp.fluency);
  setCompBar("#compMeterGrammar", "#compValGrammar", comp.grammar);
  setCompBar("#compMeterVocab", "#compValVocab", comp.vocabulary);

  // Acreditación oficial curricular de 2 créditos
  const currentMission = m?.id || $("#mission")?.value || "cafe";
  const currentLv = $("#level")?.value || "A1";

  post("/api/curriculum/complete-lesson", {
    lang: lang(),
    level: currentLv,
    moduleId: "m1",
    lessonId: currentMission,
    score: totalScore,
    completedObjectives: completedObjs,
  }).then((res) => {
    if (res && res.ok) {
      const accumEl = $("#lessonCreditsAccum");
      if (accumEl) {
        accumEl.textContent = `Total en Nivel: ${res.totalLevelCredits} / ${res.targetCredits} créditos`;
      }
      if (res.proficiencyUnlocked) {
        toast("🎓 ¡Examen de Suficiencia Desbloqueado! Has alcanzado 36 créditos.");
      }
      if (S) {
        S.profile = S.profile || {};
        S.profile.credits = res.totalLevelCredits;
      }
    }
  }).catch((e) => {
    console.warn("Error al acreditar lección:", e);
  });

  modal.hidden = false;
  toast("🎉 ¡Objetivos de la lección alcanzados! +35 XP");
  awardXP(35);
}


function closeLessonCompleteModal() {
  const modal = $("#lessonCompleteModal");
  if (modal) modal.hidden = true;
}

function advanceToNextLesson() {
  closeLessonCompleteModal();
  const missionSel = $("#mission");
  if (!missionSel) return;

  const currentIdx = missionSel.selectedIndex;
  if (currentIdx >= 0 && currentIdx < missionSel.options.length - 1) {
    missionSel.selectedIndex = currentIdx + 1;
    missionSel.dispatchEvent(new Event("change"));
    toast(`🚀 Iniciando ${missionSel.options[currentIdx + 1].text}`);
    setTimeout(() => {
      connect();
    }, 400);
  } else {
    // Si era la última lección del nivel, avanzar al siguiente nivel CEFR
    const levelSel = $("#level");
    const currentLvIdx = levelSel.selectedIndex;
    if (currentLvIdx >= 0 && currentLvIdx < levelSel.options.length - 1) {
      levelSel.selectedIndex = currentLvIdx + 1;
      levelSel.dispatchEvent(new Event("change"));
      toast(`🎓 ¡Felicidades! Avanzas al nivel ${levelSel.value}`);
      setTimeout(() => {
        connect();
      }, 500);
    } else {
      toast("🏆 ¡Has completado todas las lecciones del plan curricular!");
      setTimeout(() => {
        connect();
      }, 400);
    }
  }
}

function repeatCurrentLesson() {
  closeLessonCompleteModal();
  done.clear();
  renderObjectives();
  toast("🔄 Reiniciando práctica de la lección");
  setTimeout(() => {
    connect();
  }, 300);
}

function awardXP(amount) {
  post("/api/turn", {}).then((r) => {
    if (r.xp && S) {
      S.xp = r.xp.xp;
      S.level = r.xp.level;
      paint();
    }
  }).catch(() => {});
}

$("#finishLessonManualBtn")?.addEventListener("click", () => {
  const m = getAdaptedMission();
  showLessonCompleteModal(m);
});
$("#closeLessonModal")?.addEventListener("click", closeLessonCompleteModal);
$("#repeatLessonBtn")?.addEventListener("click", repeatCurrentLesson);
$("#nextLessonBtn")?.addEventListener("click", advanceToNextLesson);

// ---------------------------------------------------------------- tonos
const BUILTIN = [
  ["妈", "mā"], ["麻", "má"], ["马", "mǎ"], ["骂", "mà"], ["你好", "nǐ hǎo"], ["谢谢", "xiè xie"], ["老师", "lǎo shī"],
  ["中国", "zhōng guó"], ["学习", "xué xí"], ["漂亮", "piào liang"], ["再见", "zài jiàn"], ["朋友", "péng you"],
];
let target = null;
function loadDrills() {
  const sel = $("#drillSel");
  if (!sel) return;
  const cards = Array.isArray(S?.cards) ? S.cards.filter((c) => c.lang === "zh" && c.pinyin) : [];
  const items = cards.length ? cards.map((c) => ({ text: c.front, pinyin: c.pinyin, cardId: c.id })) : BUILTIN.map(([t, p]) => ({ text: t, pinyin: p }));
  sel.replaceChildren(...items.map((it, i) => { const o = el("option", "", `${it.text} · ${it.pinyin}`); o.value = String(i); return o; }));
  sel.onchange = () => pickDrill(items[Number(sel.value)]);
  if (items.length) pickDrill(items[0]);
}
function speakModelTone(text) {
  if (!("speechSynthesis" in window)) {
    toast("Síntesis de voz no disponible");
    return;
  }
  window.speechSynthesis.cancel();
  const ut = new SpeechSynthesisUtterance(text);
  ut.lang = "zh-CN";
  ut.rate = 0.85;
  const voices = window.speechSynthesis.getVoices();
  const zhVoice = voices.find((v) => v.lang.startsWith("zh"));
  if (zhVoice) ut.voice = zhVoice;

  const btn = $("#listenModelBtn");
  if (btn) btn.innerHTML = "<span>🔊</span> Reproduciendo…";
  ut.onend = () => { if (btn) btn.innerHTML = "<span>🔊</span> Escuchar modelo"; };
  ut.onerror = () => { if (btn) btn.innerHTML = "<span>🔊</span> Escuchar modelo"; };
  window.speechSynthesis.speak(ut);
}

function pickDrill(it) {
  target = it;
  $("#han").textContent = it.text; $("#py").textContent = it.pinyin;
  $("#toneOut").replaceChildren(el("span", "muted small", "Escucha el modelo de pronunciación antes de grabar para calibrar tu entonación."));
  drawPlot(null);
}

$("#listenModelBtn")?.addEventListener("click", () => {
  if (target?.text) speakModelTone(target.text);
});

let rec = null;
async function startRec() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const src = ctx.createMediaStreamSource(stream);
  const node = ctx.createScriptProcessor(2048, 1, 1);
  const chunks = [];
  node.onaudioprocess = (e) => chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
  src.connect(node); node.connect(ctx.destination);
  rec = { stream, ctx, node, chunks };
}
async function stopRec() {
  const { stream, ctx, node, chunks } = rec;
  rec = null;
  node.disconnect(); ctx.destination.disconnect();
  stream.getTracks().forEach((t) => t.stop());
  const sr = ctx.sampleRate; await ctx.close();
  $("#rec").innerHTML = "<span>🔴</span> Grabar voz";
  const n = chunks.reduce((s, c) => s + c.length, 0), x = new Float32Array(n);
  let k = 0; for (const c of chunks) { x.set(c, k); k += c.length; }
  evaluate(x, sr);
}
$("#rec").addEventListener("click", async () => {
  if (!target) return;
  if (rec) return stopRec();
  try {
    await startRec();
    $("#rec").innerHTML = "<span>⏹</span> Detener";
    $("#toneOut").replaceChildren(el("span", "muted", "Grabando… di la frase y pulsa Detener."));
  } catch (e) {
    toast(`Micrófono no disponible: ${e.message}`);
  }
});

async function evaluate(x, sr) {
  const { tones } = parseTones(target.pinyin);
  const out = $("#toneOut");
  out.replaceChildren(el("span", "muted", "Analizando tonos en segundo plano con Web Worker…"));
  let r;
  try {
    r = await analyzeAsync(x, sr, tones);
  } catch (err) {
    out.replaceChildren(el("span", "muted", `Error al analizar tonos: ${err.message}`));
    drawPlot(null);
    return;
  }
  out.replaceChildren();
  if (!r.ok) { out.append(el("span", "muted", r.reason)); drawPlot(null); return; }
  drawPlot(r);
  r.syllables.forEach((s, i) => {
    const box = el("div", `syl ${s.pass ? "ok" : "no"}`);
    box.append(el("b", "", `${i + 1}. ${s.pass ? "✓" : "✗"} ${s.score}`));
    box.append(el("div", "small", `Esperado: tono ${s.expected}`));
    if (!s.pass && s.heard) box.append(el("div", "small", `Sonó como: tono ${s.heard}`));
    out.append(box);
  });
  out.append(el("div", "syl", `Puntaje: ${r.overall}/100`));
  try {
    const d = await post("/api/drill", { score: r.overall, text: target.text, expected: target.pinyin, cardId: target.cardId });
    if (d.xp) toast(`Buen trabajo  +${d.xp} XP`);
    refresh();
  } catch {}
}

function drawPlot(r) {
  const c = $("#plot"), g = c.getContext("2d"), W = c.width, H = c.height;
  g.clearRect(0, 0, W, H);
  const tones = target ? parseTones(target.pinyin).tones : [];
  const n = Math.max(1, tones.length), pad = 30, slot = (W - 2 * pad) / n;
  const y = (st) => H / 2 - (st / 7) * (H / 2 - 36);

  g.strokeStyle = "rgba(255,255,255,0.1)"; g.lineWidth = 1; g.beginPath(); g.moveTo(pad, H / 2); g.lineTo(W - pad, H / 2); g.stroke();
  g.font = "14px system-ui"; g.fillStyle = "#94a3b8"; g.textAlign = "center";

  tones.forEach((t, i) => {
    const x0 = pad + i * slot, w = slot * 0.85;
    g.fillText(`Tono ${t}`, x0 + w / 2, 24);
    g.strokeStyle = "rgba(99, 102, 241, 0.4)"; g.lineWidth = 3; g.setLineDash([4, 4]); g.beginPath();
    const tpl = r?.syllables?.[i]?.template || [];
    tpl.forEach((st, k) => { const px = x0 + (k / (tpl.length - 1)) * w, py = y(st); if (k === 0) g.moveTo(px, py); else g.lineTo(px, py); });
    g.stroke(); g.setLineDash([]);
  });

  if (!r?.ok) return;
  r.syllables.forEach((s, i) => {
    if (!s.contour) return;
    const x0 = pad + i * slot, w = slot * 0.85;
    g.strokeStyle = s.pass ? "#10b981" : "#ef4444"; g.lineWidth = 4; g.beginPath();
    s.contour.forEach((st, k) => { const px = x0 + (k / (s.contour.length - 1)) * w, py = y(st); if (k === 0) g.moveTo(px, py); else g.lineTo(px, py); });
    g.stroke();
  });
}

// ---------------------------------------------------------------- repaso (SRS)
let queue = [], cur = null;
async function loadReview() {
  queue = await api(`/api/cards/due?lang=${lang()}`);
  nextCard();
}
function nextCard() {
  cur = queue.shift() || null;
  $("#rvEmpty").hidden = Boolean(cur);
  $("#rvCard").hidden = !cur;
  if (!cur) return;
  $("#rvCount").textContent = `${queue.length + 1} pendientes`;
  $("#rvPrompt").textContent = cur.back;
  $("#rvFront").textContent = cur.front;
  $("#rvPy").textContent = cur.pinyin || "";
  $("#rvEx").textContent = cur.example || "";
  $("#rvAns").hidden = true;
  $("#rvShow").hidden = false;
  $("#rvGrades").hidden = true;
  $("#rvSay").hidden = true;
  $("#rvTone").hidden = true;
}
$("#rvShow").addEventListener("click", () => {
  $("#rvAns").hidden = false; $("#rvShow").hidden = true;
  $("#rvSay").hidden = false;
  $("#rvTone").hidden = cur.lang !== "zh" || !cur.pinyin;
  const names = ["Otra vez", "Difícil", "Bien", "Fácil"];
  $("#rvGrades").replaceChildren(...names.map((nm, g) => {
    const b = el("button", "", nm);
    b.append(el("small", "", cur.preview[g]));
    b.onclick = async () => {
      const res = await post("/api/cards/grade", { id: cur.id, grade: g });
      if (res.xp) toast(`+${res.xp} XP`);
      nextCard(); refresh();
    };
    return b;
  }));
  $("#rvGrades").hidden = false;
});
$("#rvSay").addEventListener("click", () => speakVoice(cur.front));

// ---------------------------------------------------------------- vocabulario de avance
let savedCardsCache = [];

function renderSessionVocab() {
  const grid = $("#vocabGrid");
  const counter = $("#vocabCount");
  const savedCounter = $("#savedVocabCount");
  if (!grid) return;
  const items = Array.isArray(S?.sessionVocab) ? S.sessionVocab : [];
  if (counter) counter.textContent = String(items.length);

  const cardsCount = Array.isArray(S?.cards) ? S.cards.filter((c) => c.lang === lang()).length : 0;
  if (savedCounter) savedCounter.textContent = String(cardsCount);

  if (!items.length) {
    grid.innerHTML = '<div class="empty-vocab muted small">Las palabras clave aprendidas en la conversación aparecerán aquí para guardarlas en tu mazo.</div>';
    return;
  }

  grid.replaceChildren(...items.map((it) => {
    const card = el("div", "vocab-card");

    const row = el("div", "vocab-term-row");
    const term = el("span", "vocab-term", it.word);
    const phon = el("span", "vocab-phonetic", it.phonetic || it.pos || "");
    row.append(term, phon);

    const trans = el("div", "vocab-trans", it.translation);

    const acts = el("div", "vocab-actions");
    const listenBtn = el("button", "msg-action-btn", "🔊");
    listenBtn.type = "button";
    listenBtn.title = "Escuchar pronunciación";
    listenBtn.onclick = () => speakVoice(it.word);

    const saveBtn = el("button", "btn-save-srs", "+ Guardar a SRS");
    saveBtn.type = "button";
    saveBtn.onclick = async () => {
      saveBtn.disabled = true;
      try {
        const res = await post("/api/tool", {
          name: "add_card",
          args: { front: it.word, back: it.translation, pinyin: it.phonetic },
          lang: it.lang || lang(),
          mission: $("#mission").value,
          done: [...done],
        });
        applyFx(res.fx);

        // Descartar de la bandeja de novedades
        await post("/api/session-vocab/remove", { word: it.word });

        // Animación de salida al guardar
        card.classList.add("saved-exit");
        toast(`Guardado al mazo: ${it.word}`);

        setTimeout(() => {
          card.remove();
          if (Array.isArray(S?.sessionVocab)) {
            S.sessionVocab = S.sessionVocab.filter((v) => v.word.toLowerCase() !== it.word.toLowerCase());
            if (counter) counter.textContent = String(S.sessionVocab.length);
          }
          if (savedCounter) {
            savedCounter.textContent = String(Number(savedCounter.textContent || 0) + 1);
          }
          if (grid.children.length === 0) {
            grid.innerHTML = '<div class="empty-vocab muted small">¡Palabra archivada con éxito! Consulta tu mazo con el botón superior.</div>';
          }
        }, 340);

        refresh();
      } catch (e) {
        saveBtn.disabled = false;
        toast(`Error al guardar: ${e.message}`);
      }
    };

    acts.append(listenBtn, saveBtn);
    card.append(row, trans, acts);
    return card;
  }));
}

// ---------------------------------------------------------------- banco de vocabulario guardado
async function openVocabBankModal() {
  const modal = $("#vocabModal");
  if (!modal) return;
  modal.hidden = false;
  const list = $("#savedVocabList");
  list.innerHTML = '<div class="muted small" style="text-align: center; padding: 24px;">Cargando tarjetas guardadas...</div>';

  try {
    savedCardsCache = await api(`/api/cards?lang=${lang()}`);
    renderSavedVocabList(savedCardsCache);
  } catch (err) {
    list.innerHTML = `<div class="muted small danger" style="text-align: center; padding: 24px;">Error: ${err.message}</div>`;
  }
}

function renderSavedVocabList(cards) {
  const list = $("#savedVocabList");
  if (!list) return;
  if (!cards.length) {
    list.innerHTML = '<div class="muted small" style="text-align: center; padding: 24px;">No tienes tarjetas de vocabulario guardadas aún para este idioma.</div>';
    return;
  }

  list.replaceChildren(...cards.map((c) => {
    const item = el("div", "saved-vocab-item");

    const left = el("div", "");
    const termRow = el("div", "vocab-term-row");
    termRow.append(el("b", "vocab-term", c.front));
    if (c.pinyin) termRow.append(el("span", "vocab-phonetic", ` ${c.pinyin}`));
    left.append(termRow);
    left.append(el("div", "vocab-trans", c.back));

    const meta = el("div", "muted small", `Repasos: ${c.reps || 0} · Intervalo: ${c.interval || 0}d`);
    left.append(meta);

    const listenBtn = el("button", "msg-action-btn", "🔊 Escuchar");
    listenBtn.type = "button";
    listenBtn.onclick = () => speakVoice(c.front);

    item.append(left, listenBtn);
    return item;
  }));
}

$("#openVocabBankBtn")?.addEventListener("click", openVocabBankModal);
$("#closeVocabModal")?.addEventListener("click", () => {
  if ($("#vocabModal")) $("#vocabModal").hidden = true;
});
$("#searchVocabInput")?.addEventListener("input", (e) => {
  const q = (e.target.value || "").toLowerCase().trim();
  if (!q) {
    renderSavedVocabList(savedCardsCache);
    return;
  }
  const filtered = savedCardsCache.filter(
    (c) =>
      c.front.toLowerCase().includes(q) ||
      c.back.toLowerCase().includes(q) ||
      (c.pinyin && c.pinyin.toLowerCase().includes(q))
  );
  renderSavedVocabList(filtered);
});

// ==========================================================================
// CONTROLADOR DEL STUDENT HUB Y PRE-SESIÓN WARM-UP (FASE 1)
// ==========================================================================

let currentWarmupData = null;
let currentWarmupIndex = 0;
let currentWarmupLessonId = "cafe";

async function loadAndRenderHub() {
  if (!currentUser) return;
  try {
    const data = await api(`/api/hub/status?lang=${lang()}`);
    if (!data || !data.ok) return;

    const u = data.user;
    if ($("#hubUserGreeting")) {
      $("#hubUserGreeting").textContent = `¡Hola, ${u.name}!`;
    }
    if ($("#hubLevelChip")) {
      $("#hubLevelChip").textContent = `Nivel ${u.level} · ${u.levelName || "Acceso"}`;
    }
    if ($("#hubMotivationalQuote")) {
      $("#hubMotivationalQuote").textContent = `"${data.motivationalQuote}"`;
    }

    if ($("#hubCreditsNum")) {
      $("#hubCreditsNum").textContent = `${u.credits} / ${u.targetCredits}`;
    }
    if ($("#hubCreditsProgress")) {
      $("#hubCreditsProgress").style.width = `${u.levelProgress}%`;
    }
    if ($("#hubCreditsSubtext")) {
      const remaining = Math.max(0, u.targetCredits - u.credits);
      $("#hubCreditsSubtext").textContent = remaining === 0
        ? "¡Créditos completados! Prueba de suficiencia lista."
        : `${remaining} créditos restantes para el Examen de Suficiencia`;
    }

    if ($("#hubStreakVal")) {
      $("#hubStreakVal").textContent = `${u.streak} ${u.streak === 1 ? "día" : "días"}`;
    }
    if ($("#hubTotalXp")) {
      $("#hubTotalXp").textContent = `⭐ ${u.xp} XP`;
    }
    if ($("#hubTotalCards")) {
      $("#hubTotalCards").textContent = `📚 ${u.totalCards} en SRS`;
    }

    // Radar de competencias (CEFR)
    const r = data.radar || {};
    if ($("#radarCompFill")) $("#radarCompFill").style.width = `${r.comprehension || 0}%`;
    if ($("#radarCompVal")) $("#radarCompVal").textContent = `${r.comprehension || 0}%`;

    if ($("#radarFluencyFill")) $("#radarFluencyFill").style.width = `${r.fluency || 0}%`;
    if ($("#radarFluencyVal")) $("#radarFluencyVal").textContent = `${r.fluency || 0}%`;

    if ($("#radarGrammarFill")) $("#radarGrammarFill").style.width = `${r.grammar || 0}%`;
    if ($("#radarGrammarVal")) $("#radarGrammarVal").textContent = `${r.grammar || 0}%`;

    if ($("#radarVocabFill")) $("#radarVocabFill").style.width = `${r.vocabulary || 0}%`;
    if ($("#radarVocabVal")) $("#radarVocabVal").textContent = `${r.vocabulary || 0}%`;

    // Próxima lección curricular en foco
    const nextL = data.nextLesson;
    if (nextL) {
      if ($("#hubNextLessonTitle")) $("#hubNextLessonTitle").textContent = nextL.title;
      if ($("#hubNextLessonModule")) $("#hubNextLessonModule").textContent = nextL.module;
      if ($("#hubNextLessonScene")) $("#hubNextLessonScene").textContent = nextL.scene;

      // Hito Visual Principal: Botón Gigantesco de Acción Directa
      const heroBtn = $("#hubHeroActionBtn");
      if (heroBtn) {
        heroBtn.onclick = () => startLessonDirectly(nextL.id);
      }
      if ($("#hubHeroActionBtnText")) {
        $("#hubHeroActionBtnText").textContent = `CONTINUAR: ${nextL.title.toUpperCase()}`;
      }

      const startBtn = $("#hubStartLessonWarmupBtn");
      if (startBtn) {
        startBtn.onclick = () => startWarmupForLesson(nextL.id);
      }
      const handbookBtn = $("#hubOpenHandbookBtn");
      if (handbookBtn) {
        handbookBtn.onclick = () => openHandbookModal(nextL.id);
      }
    }

    // Retos del día y la semana
    const challengesList = $("#hubChallengesList");
    if (challengesList && Array.isArray(data.challenges)) {
      challengesList.innerHTML = "";
      data.challenges.forEach((ch) => {
        const row = el("div", `challenge-row ${ch.done ? "completed" : ""}`);
        row.innerHTML = `
          <div class="challenge-left">
            <span class="challenge-icon">${ch.done ? "✅" : "🎯"}</span>
            <div>
              <div class="challenge-title">${ch.title}</div>
              <div class="challenge-desc">${ch.desc} (${ch.have}/${ch.need})</div>
            </div>
          </div>
          <div class="challenge-reward">+${ch.xp} XP</div>
        `;
        challengesList.appendChild(row);
      });
    }

    // Renderizar Árbol Curricular Modular (36 créditos)
    await loadAndRenderCurriculumTree();
  } catch (err) {
    console.error("Error al cargar estado del Hub:", err);
  }
}

// ---------------------------------------------------------------- Árbol Curricular Modular
async function loadAndRenderCurriculumTree() {
  const container = $("#hubCurriculumTree");
  if (!container) return;

  try {
    const res = await get(`/api/curriculum/tree?lang=${lang()}&level=${$("#level")?.value || "A1"}`);
    if (!res || !res.ok || !Array.isArray(res.modules)) return;

    container.innerHTML = "";
    res.modules.forEach((mod) => {
      const card = el("div", "module-card");

      const header = el("div", "module-header");
      header.innerHTML = `
        <div class="module-title-wrap">
          <div class="module-title-text">
            <span>${mod.title}</span>
            <span class="module-credits-pill">${mod.earnedCredits} / ${mod.targetCredits} créditos</span>
          </div>
          <div class="module-desc">${mod.description}</div>
        </div>
        <div class="module-progress-box">
          <div class="module-progress-bar">
            <div class="module-progress-fill" style="width: ${mod.progressPercent}%;"></div>
          </div>
          <b style="font-size: 12px; color: #a5b4fc;">${mod.progressPercent}%</b>
        </div>
      `;

      const lessonsList = el("div", "module-lessons-list");
      mod.lessons.forEach((l) => {
        const item = el("div", `curriculum-lesson-item ${l.isCompleted ? "completed" : "active"}`);
        item.innerHTML = `
          <div class="lesson-left-col">
            <div class="lesson-status-icon">${l.isCompleted ? "✔" : "⚡"}</div>
            <div class="lesson-text-meta">
              <div class="lesson-name-row">${l.title}</div>
              <div class="lesson-sub-meta">
                <span>${l.credits} Créditos</span>
                ${l.isCompleted ? `<span style="color: #34d399;">Superada (${l.score} pts)</span>` : `<span class="muted">Disponible</span>`}
              </div>
            </div>
          </div>
          <div class="lesson-actions-group">
            <button type="button" class="lesson-guide-btn" data-lesson-id="${l.id}">📖 Guía</button>
            <button type="button" class="primary lesson-play-btn" data-lesson-id="${l.id}">Practicar</button>
          </div>
        `;

        item.querySelector(".lesson-guide-btn")?.addEventListener("click", () => {
          openHandbookModal(l.id);
        });

        item.querySelector(".lesson-play-btn")?.addEventListener("click", () => {
          startLessonDirectly(l.id);
        });

        lessonsList.appendChild(item);
      });

      card.append(header, lessonsList);
      container.appendChild(card);
    });
  } catch (err) {
    console.warn("Error al renderizar árbol curricular:", err);
  }
}

// ---------------------------------------------------------------- Polyglot Curriculum Handbook
let currentHandbookLessonId = "cafe";

async function openHandbookModal(lessonId) {
  const modal = $("#handbookModal");
  if (!modal) return;
  currentHandbookLessonId = lessonId || "cafe";

  try {
    const res = await get(`/api/curriculum/handbook?lang=${lang()}&level=${$("#level")?.value || "A1"}&lessonId=${currentHandbookLessonId}`);
    if (!res || !res.ok || !res.chapter) throw new Error("No se pudo cargar la guía del handbook");
    const ch = res.chapter;

    if ($("#handbookCodeBadge")) $("#handbookCodeBadge").textContent = ch.code;
    if ($("#handbookLessonTitle")) $("#handbookLessonTitle").textContent = ch.title;
    if ($("#handbookModuleTitle")) $("#handbookModuleTitle").textContent = ch.moduleTitle;

    // 1. Can-Do
    const canDoList = $("#handbookCanDoList");
    if (canDoList && Array.isArray(ch.canDoDescriptors)) {
      canDoList.innerHTML = "";
      ch.canDoDescriptors.forEach((desc) => {
        const li = el("li", "", desc);
        canDoList.appendChild(li);
      });
    }

    // 2. Gramática
    const formEl = $("#handbookGrammarFormula");
    if (formEl) formEl.textContent = ch.grammarCorpus?.formula || "Fórmula canónica no especificada";
    const sumEl = $("#handbookGrammarSummary");
    if (sumEl) sumEl.textContent = ch.grammarCorpus?.summary || "";

    const contrastTable = $("#handbookContrastTable");
    if (contrastTable && Array.isArray(ch.grammarCorpus?.contrast)) {
      contrastTable.innerHTML = "";
      ch.grammarCorpus.contrast.forEach((c) => {
        const div = el("div", "contrast-item");
        div.innerHTML = `
          <div class="contrast-wrong">${c.mistake}</div>
          <div class="contrast-right">${c.correct}</div>
          <div class="contrast-why">${c.why}</div>
        `;
        contrastTable.appendChild(div);
      });
    }

    // 3. Colocaciones & IPA
    const colocGrid = $("#handbookCollocationsGrid");
    if (colocGrid && Array.isArray(ch.collocations)) {
      colocGrid.innerHTML = "";
      ch.collocations.forEach((col) => {
        const card = el("div", "collocation-card");
        card.innerHTML = `
          <div class="colloc-top-row">
            <span class="colloc-phrase">${col.phrase}</span>
            <span class="colloc-ipa">${col.ipa || ""}</span>
          </div>
          <div class="colloc-example">"${col.example || ""}"</div>
          <button type="button" class="colloc-listen-btn">🔊 Escuchar</button>
        `;
        card.querySelector(".colloc-listen-btn")?.addEventListener("click", () => {
          speakVoice(col.speak || col.phrase);
        });
        colocGrid.appendChild(card);
      });
    }

    // 4. Diálogo Modelo
    const dialContext = $("#handbookDialogueContext");
    if (dialContext) dialContext.textContent = ch.dialogueModel?.context || "";
    const dialTurns = $("#handbookDialogueTurns");
    if (dialTurns && Array.isArray(ch.dialogueModel?.turns)) {
      dialTurns.innerHTML = "";
      ch.dialogueModel.turns.forEach((t) => {
        const item = el("div", "dialogue-turn-item");
        item.innerHTML = `
          <div class="dialogue-turn-header">
            <span class="dialogue-speaker">${t.speaker}</span>
          </div>
          <div class="dialogue-text">${t.text}</div>
          ${t.note ? `<div class="dialogue-pragmatic-note">💡 ${t.note}</div>` : ""}
        `;
        dialTurns.appendChild(item);
      });
    }

    // 5. Tareas
    const tasksCard = $("#handbookTasksCard");
    if (tasksCard && ch.tasks) {
      tasksCard.innerHTML = `
        <div class="task-step-box">
          <div class="task-step-num">1</div>
          <div><b>Pre-sesión Warm-up:</b> ${ch.tasks.warmup}</div>
        </div>
        <div class="task-step-box">
          <div class="task-step-num">2</div>
          <div><b>Sesión con Wetty:</b> ${ch.tasks.central}</div>
        </div>
        <div class="task-step-box">
          <div class="task-step-num">3</div>
          <div><b>Fijación en SRS:</b> ${ch.tasks.homework}</div>
        </div>
      `;
    }

    // Activar pestaña inicial Can-Do
    switchHandbookTab("cando");

    modal.hidden = false;
  } catch (err) {
    toast("Error al cargar la guía: " + err.message);
  }
}

function switchHandbookTab(targetTab) {
  document.querySelectorAll(".handbook-tab").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.htab === targetTab);
  });
  const panels = {
    cando: $("#hpanel-cando"),
    grammar: $("#hpanel-grammar"),
    vocab: $("#hpanel-vocab"),
    dialogue: $("#hpanel-dialogue"),
    tasks: $("#hpanel-tasks"),
  };
  Object.entries(panels).forEach(([key, panel]) => {
    if (panel) panel.hidden = (key !== targetTab);
  });
}

function startLessonDirectly(lessonId) {
  const warmupModal = $("#warmupModal");
  if (warmupModal) warmupModal.hidden = true;
  const handbookModal = $("#handbookModal");
  if (handbookModal) handbookModal.hidden = true;

  if (isConnected) {
    hangup();
  }

  const targetId = lessonId || "cafe";
  const missionSel = $("#mission");
  if (missionSel) {
    let found = false;
    for (let i = 0; i < missionSel.options.length; i++) {
      if (missionSel.options[i].value === targetId) {
        missionSel.selectedIndex = i;
        found = true;
        break;
      }
    }
    if (!found) {
      missionSel.value = targetId;
    }
    store.set("mission", missionSel.value);
    done.clear();
    renderObjectives();
  }

  switchTab("speak");
  toast("🎙️ ¡Iniciando sesión conversacional con Wetty!");

  setTimeout(() => {
    connect();
  }, 350);
}

async function startWarmupForLesson(lessonId) {
  currentWarmupLessonId = lessonId || "cafe";
  const modal = $("#warmupModal");
  if (!modal) return;
  modal.hidden = false;


  const challengeBody = $("#warmupChallengeBody");
  const completeView = $("#warmupCompleteView");
  const nextBtn = $("#warmupNextBtn");

  if (challengeBody) challengeBody.hidden = false;
  if (completeView) completeView.hidden = true;
  if (nextBtn) {
    nextBtn.parentElement.hidden = false;
    nextBtn.disabled = true;
    nextBtn.textContent = "Continuar →";
  }

  try {
    const res = await post("/api/warmup/generate", {
      lang: lang(),
      level: $("#level")?.value || "A1",
      lessonId: currentWarmupLessonId,
    });
    if (!res || !res.ok) throw new Error("No se pudo generar el calentamiento");
    currentWarmupData = res;
    currentWarmupIndex = 0;
    renderWarmupStep();
  } catch (err) {
    toast("Error al iniciar pre-sesión: " + err.message);
    modal.hidden = true;
  }
}

function renderWarmupStep() {
  if (!currentWarmupData || !currentWarmupData.questions) return;
  const questions = currentWarmupData.questions;
  const q = questions[currentWarmupIndex];
  if (!q) return;

  const stepIndicator = $("#warmupStepIndicator");
  if (stepIndicator) stepIndicator.textContent = `Paso ${currentWarmupIndex + 1} de ${questions.length}`;

  const progress = Math.round(((currentWarmupIndex + 1) / questions.length) * 100);
  const progressBar = $("#warmupProgressBar");
  if (progressBar) progressBar.style.width = `${progress}%`;

  const promptEl = $("#warmupPrompt");
  if (promptEl) promptEl.textContent = q.prompt;

  const optionsContainer = $("#warmupOptions");
  if (optionsContainer) {
    optionsContainer.innerHTML = "";
    q.options.forEach((optText, idx) => {
      const btn = el("button", "warmup-opt-btn");
      btn.type = "button";
      btn.innerHTML = `<span>${optText}</span>`;
      btn.addEventListener("click", () => handleWarmupAnswer(idx, q));
      optionsContainer.appendChild(btn);
    });
  }

  const feedbackEl = $("#warmupFeedback");
  if (feedbackEl) {
    feedbackEl.hidden = true;
    feedbackEl.innerHTML = "";
  }

  const nextBtn = $("#warmupNextBtn");
  if (nextBtn) {
    nextBtn.disabled = true;
  }
}

function handleWarmupAnswer(selectedIdx, question) {
  const optionsContainer = $("#warmupOptions");
  if (!optionsContainer) return;
  const buttons = optionsContainer.querySelectorAll(".warmup-opt-btn");
  buttons.forEach((b) => (b.disabled = true));

  const isCorrect = selectedIdx === question.answer;
  if (buttons[selectedIdx]) {
    buttons[selectedIdx].classList.add(isCorrect ? "correct" : "wrong");
  }
  if (!isCorrect && buttons[question.answer]) {
    buttons[question.answer].classList.add("correct");
  }

  const feedbackEl = $("#warmupFeedback");
  if (feedbackEl) {
    feedbackEl.hidden = false;
    feedbackEl.innerHTML = `
      <div style="font-weight: 700; color: ${isCorrect ? "#10b981" : "#f59e0b"}; margin-bottom: 4px;">
        ${isCorrect ? "¡Excelente! Acertaste." : "Ojo a la forma estándar:"}
      </div>
      <div>${question.explanation}</div>
      ${question.speak ? `
        <button type="button" class="dock-pill-btn small" id="warmupSpeakBtn" style="margin-top: 8px; font-size: 11px;">
          🔊 Escuchar modelo: "${question.speak}"
        </button>
      ` : ""}
    `;

    if (question.speak) {
      feedbackEl.querySelector("#warmupSpeakBtn")?.addEventListener("click", () => {
        speakVoice(question.speak);
      });
    }
  }

  const nextBtn = $("#warmupNextBtn");
  if (nextBtn) {
    nextBtn.disabled = false;
    nextBtn.textContent = currentWarmupIndex === currentWarmupData.questions.length - 1
      ? "Finalizar Calentamiento ✨"
      : "Siguiente Pregunta →";
  }
}

async function onWarmupNextClick() {
  if (!currentWarmupData) return;
  if (currentWarmupIndex < currentWarmupData.questions.length - 1) {
    currentWarmupIndex++;
    renderWarmupStep();
  } else {
    // Calentamiento completado: registrar y premiar XP
    try {
      const res = await post("/api/warmup/complete", {
        warmupId: currentWarmupData.warmupId,
        answers: [],
      });
      if (res && res.ok) {
        toast("🎉 ¡Pre-sesión superada! +10 XP");
        if (S) {
          S.xp = res.newTotalXp;
          paint();
        }
      }
    } catch (e) {
      console.warn("Error al registrar completion de warmup:", e);
    }

    const challengeBody = $("#warmupChallengeBody");
    const completeView = $("#warmupCompleteView");
    const nextBtn = $("#warmupNextBtn");

    if (challengeBody) challengeBody.hidden = true;
    if (completeView) completeView.hidden = false;
    if (nextBtn) nextBtn.parentElement.hidden = true;
  }
}

// ============================================================================
// FASE 3: AUDITORÍA DE SUFICIENCIA Y CERTIFICACIÓN OFICIAL CEFR / HSK
// ============================================================================
let currentProfSession = null;
let currentPhaseAIndex = 0;
let phaseASelectedAnswer = null;
let phaseAAnswers = [];
let phaseATimerInterval = null;
let phaseATimeRemaining = 45;
let currentPhaseCIndex = 0;
let phaseCTurns = [];

function openProficiencyModal(testType = "certification_exit") {
  const modal = $("#proficiencyModal");
  if (!modal) return;

  const curLevel = $("#level")?.value || "A1";
  const curLang = lang();

  if ($("#profModalTestTypeBadge")) {
    $("#profModalTestTypeBadge").textContent = testType === "placement" ? "🧭 Test de Ubicación Diagnóstico" : "🎓 Examen de Certificación";
  }
  if ($("#profModalLevelBadge")) {
    $("#profModalLevelBadge").textContent = `Nivel ${curLevel}`;
  }
  if ($("#profIntroTitle")) {
    $("#profIntroTitle").textContent = testType === "placement" ? "Test de Ubicación Adaptativo" : `Examen de Certificación · Nivel ${curLevel}`;
  }
  if ($("#profIntroDesc")) {
    $("#profIntroDesc").textContent = testType === "placement"
      ? "Evaluación diagnóstica adaptativa para ubicar con precisión tu punto de inicio en el marco CEFR/HSK."
      : `Examen de alta exigencia que audita tus competencias de salida para el Nivel ${curLevel}. Aprobación ≥ 75% emite certificado inmutable y promueve de nivel.`;
  }

  // Reset panels & stepper
  setProfStep(1);
  showProfPanel("profViewIntro");
  currentProfSession = { testType, lang: curLang, level: curLevel };
  modal.hidden = false;
}

function closeProficiencyModal() {
  if (phaseATimerInterval) clearInterval(phaseATimerInterval);
  const modal = $("#proficiencyModal");
  if (modal) modal.hidden = true;
}

function setProfStep(stepNum) {
  for (let i = 1; i <= 4; i++) {
    const el = $(`#profStep${i}`);
    if (el) {
      el.classList.toggle("active", i === stepNum);
      el.classList.toggle("completed", i < stepNum);
    }
  }
}

function showProfPanel(panelId) {
  const panels = ["profViewIntro", "profViewPhaseA", "profViewPhaseB", "profViewPhaseC", "profViewResult"];
  panels.forEach((p) => {
    const el = $(`#${p}`);
    if (el) el.hidden = (p !== panelId);
  });
}

async function startActiveProficiencyExam() {
  if (!currentProfSession) return;
  try {
    const candidateName = currentUser?.email?.split("@")[0] || "Estudiante Polyglot";
    const res = await post("/api/proficiency/start", {
      testType: currentProfSession.testType,
      lang: currentProfSession.lang,
      level: currentProfSession.level,
      candidateName,
    });

    if (!res || !res.ok) {
      throw new Error(res?.error || "No se pudo iniciar la sesión de suficiencia.");
    }

    currentProfSession = { ...currentProfSession, ...res };
    currentPhaseAIndex = 0;
    phaseAAnswers = [];
    setProfStep(1);
    showProfPanel("profViewPhaseA");
    renderProfPhaseAQuestion();
  } catch (err) {
    toast("No elegible o error: " + err.message);
  }
}

function renderProfPhaseAQuestion() {
  const qList = currentProfSession?.phaseA?.questions || [];
  const q = qList[currentPhaseAIndex];
  if (!q) return;

  phaseASelectedAnswer = null;
  if ($("#phaseACounter")) $("#phaseACounter").textContent = `Reactivo ${currentPhaseAIndex + 1} de ${qList.length}`;
  if ($("#phaseAPrompt")) $("#phaseAPrompt").textContent = q.prompt;
  if ($("#phaseANextBtn")) $("#phaseANextBtn").disabled = true;

  const optContainer = $("#phaseAOptions");
  if (optContainer) {
    optContainer.innerHTML = "";
    q.options.forEach((optText, idx) => {
      const btn = el("button", "prof-opt-btn");
      btn.type = "button";
      btn.innerHTML = `<span style="font-weight: 700; opacity: 0.6;">${String.fromCharCode(65 + idx)}.</span> <span>${optText}</span>`;
      btn.addEventListener("click", () => {
        optContainer.querySelectorAll(".prof-opt-btn").forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");
        phaseASelectedAnswer = idx;
        const nextBtn = $("#phaseANextBtn");
        if (nextBtn) nextBtn.disabled = false;
      });
      optContainer.appendChild(btn);
    });
  }

  // Temporizador de 45 segundos
  if (phaseATimerInterval) clearInterval(phaseATimerInterval);
  phaseATimeRemaining = currentProfSession.phaseA?.timeLimitPerQuestionSec || 45;
  const timerBadge = $("#phaseATimer");
  if (timerBadge) {
    timerBadge.textContent = `⏱️ ${phaseATimeRemaining}s`;
    timerBadge.style.color = "#f87171";
  }

  phaseATimerInterval = setInterval(() => {
    phaseATimeRemaining--;
    if (timerBadge) timerBadge.textContent = `⏱️ ${phaseATimeRemaining}s`;
    if (phaseATimeRemaining <= 0) {
      clearInterval(phaseATimerInterval);
      onPhaseANext();
    }
  }, 1000);
}

function onPhaseANext() {
  if (phaseATimerInterval) clearInterval(phaseATimerInterval);
  phaseAAnswers.push(phaseASelectedAnswer !== null ? phaseASelectedAnswer : -1);

  const qList = currentProfSession?.phaseA?.questions || [];
  if (currentPhaseAIndex < qList.length - 1) {
    currentPhaseAIndex++;
    renderProfPhaseAQuestion();
  } else {
    submitProfPhaseA();
  }
}

async function submitProfPhaseA() {
  try {
    const res = await post("/api/proficiency/submit-phase-a", {
      testType: currentProfSession.testType,
      lang: currentProfSession.lang,
      level: currentProfSession.targetLevel || currentProfSession.level,
      answers: phaseAAnswers,
    });

    currentProfSession.phaseAResult = res;
    toast(`Fase A completada: ${res.phaseAScore}% de precisión estructural.`);

    // Transicionar a Fase B (Redacción)
    setProfStep(2);
    showProfPanel("profViewPhaseB");
    setupProfPhaseB();
  } catch (err) {
    toast("Error al evaluar Fase A: " + err.message);
  }
}

function setupProfPhaseB() {
  const pB = currentProfSession?.phaseB || {};
  if ($("#phaseBTaskTitle")) $("#phaseBTaskTitle").textContent = pB.title || "Consigna de Redacción";
  if ($("#phaseBTaskPrompt")) $("#phaseBTaskPrompt").textContent = pB.prompt || "";
  const textarea = $("#phaseBInput");
  const counter = $("#phaseBWordCounter");
  const submitBtn = $("#phaseBSubmitBtn");

  if (textarea) {
    textarea.value = "";
    textarea.oninput = () => {
      const words = textarea.value.trim().split(/\s+/).filter((w) => w.length > 0);
      const count = words.length;
      const minW = pB.minWords || 35;
      const targetW = pB.targetWords || 50;
      if (counter) counter.textContent = `${count} / ${targetW} palabras (mín. ${minW})`;
      if (submitBtn) submitBtn.disabled = count < minW;
    };
  }
}

async function submitProfPhaseB() {
  const text = $("#phaseBInput")?.value || "";
  const submitBtn = $("#phaseBSubmitBtn");
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Auditando con Rúbrica CEFR...";
  }

  try {
    const res = await post("/api/proficiency/submit-written", {
      text,
      promptId: currentProfSession.phaseB?.promptId,
      level: currentProfSession.targetLevel || currentProfSession.level,
      lang: currentProfSession.lang,
    });

    currentProfSession.phaseBResult = res.evaluation;
    currentProfSession.writtenText = text;

    const feedbackBox = $("#phaseBFeedbackBox");
    if (feedbackBox) {
      feedbackBox.hidden = false;
      feedbackBox.textContent = `✓ Redacción auditada (Score: ${res.evaluation.overallWrittenScore}% · TTR: ${res.evaluation.ttr}): ${res.evaluation.feedback}`;
    }

    toast(`Fase B completada: ${res.evaluation.overallWrittenScore}% en redacción.`);

    setTimeout(() => {
      // Transicionar a Fase C (Oral con Wetty)
      setProfStep(3);
      showProfPanel("profViewPhaseC");
      setupProfPhaseC();
    }, 1200);
  } catch (err) {
    toast("Error al evaluar Fase B: " + err.message);
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Reintentar Entrega";
    }
  }
}

function setupProfPhaseC() {
  currentPhaseCIndex = 0;
  phaseCTurns = [];
  renderProfPhaseCTurn();
}

function renderProfPhaseCTurn() {
  const qList = currentProfSession?.phaseC?.questions || [];
  const q = qList[currentPhaseCIndex];
  if (!q) return;

  if ($("#phaseCTurnCounter")) $("#phaseCTurnCounter").textContent = `Pregunta ${currentPhaseCIndex + 1} de ${qList.length}`;
  if ($("#phaseCExaminerText")) $("#phaseCExaminerText").textContent = `"${q.prompt}"`;
  const oralInput = $("#phaseCOralInput");
  if (oralInput) oralInput.value = "";

  // Botón para reproducir audio de la examinadora Wetty
  const listenBtn = $("#phaseCListenModelBtn");
  if (listenBtn) {
    listenBtn.onclick = () => speakVoice(q.prompt);
  }

  // Reproducir automáticamente la pregunta de Wetty
  speakVoice(q.prompt);
}

async function onPhaseCNextTurn() {
  const qList = currentProfSession?.phaseC?.questions || [];
  const q = qList[currentPhaseCIndex];
  const userText = ($("#phaseCOralInput")?.value || "").trim();

  // Enviar turno para evaluación
  try {
    const res = await post("/api/proficiency/submit-oral-turn", {
      questionId: q.id,
      userTranscript: userText || "I understand the question and answer clearly.",
      latencyMs: 1100,
      audioDurationMs: 5000,
      level: currentProfSession.targetLevel || currentProfSession.level,
      lang: currentProfSession.lang,
    });
    phaseCTurns.push(res.evaluation);
  } catch (e) {
    console.warn("Fallo al auditar turno oral:", e);
  }

  if (currentPhaseCIndex < qList.length - 1) {
    currentPhaseCIndex++;
    renderProfPhaseCTurn();
  } else {
    finalizeProfExam();
  }
}

async function finalizeProfExam() {
  const nextBtn = $("#phaseCNextTurnBtn");
  if (nextBtn) {
    nextBtn.disabled = true;
    nextBtn.textContent = "Consolidando Dictamen Oficial...";
  }

  // Calcular score oral promedio
  const avgSpoken = phaseCTurns.length > 0
    ? Math.round(phaseCTurns.reduce((acc, t) => acc + (t.turnScore || 80), 0) / phaseCTurns.length)
    : 80;

  const phaseCResult = {
    overallSpokenScore: avgSpoken,
    fluencyScore: avgSpoken,
    pragmaticScore: avgSpoken,
    turns: phaseCTurns,
  };

  try {
    const candidateName = currentUser?.email?.split("@")[0] || "Estudiante Polyglot";
    const res = await post("/api/proficiency/finalize", {
      sessionId: currentProfSession.sessionId,
      testType: currentProfSession.testType,
      lang: currentProfSession.lang,
      targetLevel: currentProfSession.targetLevel || currentProfSession.level,
      candidateName,
      phaseAResult: currentProfSession.phaseAResult || { phaseAScore: 80 },
      phaseBResult: currentProfSession.phaseBResult || { overallWrittenScore: 80 },
      phaseCResult,
      writtenText: currentProfSession.writtenText || "",
    });

    setProfStep(4);
    showProfPanel("profViewResult");
    renderProfResult(res);
  } catch (err) {
    toast("Error al finalizar auditoría: " + err.message);
    if (nextBtn) {
      nextBtn.disabled = false;
      nextBtn.textContent = "Reintentar Consolidación";
    }
  }
}

function renderProfResult(result) {
  const passed = result.passed;
  const score = result.overallScore;
  const audit = result.audit || {};
  const cert = result.certificate;

  const summaryEl = $("#profResultSummary");
  if (summaryEl) {
    summaryEl.innerHTML = `
      <div style="text-align: center; margin-bottom: 20px;">
        <div style="font-size: 52px; margin-bottom: 8px;">${passed ? "🎖️" : "📚"}</div>
        <div class="proficiency-banner-badge" style="font-size: 13px;">${passed ? "DICTAMEN: OFICIALMENTE APROBADO" : "DICTAMEN: EN PROCESO DE CONSOLIDACIÓN"}</div>
        <h2 style="font-size: 24px; margin: 10px 0 4px 0;">Puntaje Global de Suficiencia: ${score}/100</h2>
        <p class="muted small">${passed ? `¡Felicitaciones! Has demostrado dominio de las competencias Can-Do de nivel ${result.promotedLevel}.` : "Has completado la prueba. Te recomendamos afianzar los puntos de gramática y fluidez antes de reintentar."}</p>
      </div>

      <div class="hub-radar-bars" style="margin: 16px 0; background: rgba(255,255,255,0.02); padding: 14px; border-radius: var(--radius-md);">
        <div class="radar-bar-item">
          <span class="radar-label">Precisión Estructural (CAT Cloze)</span>
          <div class="radar-track"><div class="radar-fill" style="width: ${audit.scores?.structural || 0}%;"></div></div>
          <b>${audit.scores?.structural || 0}%</b>
        </div>
        <div class="radar-bar-item">
          <span class="radar-label">Producción Escrita (Rúbrica CEFR)</span>
          <div class="radar-track"><div class="radar-fill" style="width: ${audit.scores?.written || 0}%;"></div></div>
          <b>${audit.scores?.written || 0}%</b>
        </div>
        <div class="radar-bar-item">
          <span class="radar-label">Expresión Oral (Entrevista Wetty)</span>
          <div class="radar-track"><div class="radar-fill" style="width: ${audit.scores?.spoken || 0}%;"></div></div>
          <b>${audit.scores?.spoken || 0}%</b>
        </div>
      </div>
    `;
  }

  const certWrap = $("#profCertificateWrapper");
  if (cert && passed && certWrap) {
    certWrap.hidden = false;
    if ($("#certCandidateName")) $("#certCandidateName").textContent = cert.candidateName;
    if ($("#certLevelBadge")) $("#certLevelBadge").textContent = `NIVEL ${cert.certifiedLevel} · ACREDITADO`;
    if ($("#certMetricOverall")) $("#certMetricOverall").textContent = `${cert.overallScore}%`;
    if ($("#certMetricLang")) $("#certMetricLang").textContent = cert.language;
    if ($("#certMetricCode")) $("#certMetricCode").textContent = cert.code;
    if ($("#certHashDisplay")) $("#certHashDisplay").textContent = cert.verificationHash;

    const printBtn = $("#certPrintBtn");
    if (printBtn) printBtn.onclick = () => window.print();

    const finishBtn = $("#certFinishBtn");
    if (finishBtn) {
      finishBtn.onclick = async () => {
        closeProficiencyModal();
        await refresh();
        toast(`🎓 ¡Nivel actualizado a ${result.promotedLevel}!`);
      };
    }
  } else if (certWrap) {
    certWrap.hidden = true;
  }
}

async function viewCertificates() {
  toast("Consultando credenciales oficiales...");
  openProficiencyModal("placement");
}

// ---------------------------------------------------------------- evaluación y competencias
function renderCompetencies() {
  const comp = S?.competencies;

  if (!comp) {
    if ($("#compGrammarVal")) $("#compGrammarVal").textContent = "0%";
    if ($("#compGrammarFill")) $("#compGrammarFill").style.width = "0%";
    if ($("#compVocabVal")) $("#compVocabVal").textContent = "0%";
    if ($("#compVocabFill")) $("#compVocabFill").style.width = "0%";
    if ($("#compFluencyVal")) $("#compFluencyVal").textContent = "0%";
    if ($("#compFluencyFill")) $("#compFluencyFill").style.width = "0%";
    if ($("#compCompVal")) $("#compCompVal").textContent = "0%";
    if ($("#compCompFill")) $("#compCompFill").style.width = "0%";
    const currentLevel = $("#level")?.value || "A1";
    if ($("#verifiedLevelBadge")) {
      $("#verifiedLevelBadge").textContent = `Nivel ${currentLevel}: Sin evaluar`;
    }
    const mList = $("#milestonesList");
    if (!mList) return;
    const allMilestones = Array.isArray(S?.milestones) ? S.milestones : [];
    mList.replaceChildren(...allMilestones.map((m) => {
      const row = el("div", "milestone-item");
      const info = el("div", "milestone-info");
      info.append(el("h5", "", `${m.title} [${m.level}]`));
      info.append(el("p", "", m.desc));
      const badge = el("span", "milestone-status pending", "⏳ En progreso");
      row.append(info, badge);
      return row;
    }));
    return;
  }

  const g = Math.round(comp.grammar || 0);
  const v = Math.round(comp.vocabulary || 0);
  const f = Math.round(comp.fluency || 0);
  const c = Math.round(comp.comprehension || 0);

  if ($("#compGrammarVal")) $("#compGrammarVal").textContent = `${g}%`;
  if ($("#compGrammarFill")) $("#compGrammarFill").style.width = `${g}%`;

  if ($("#compVocabVal")) $("#compVocabVal").textContent = `${v}%`;
  if ($("#compVocabFill")) $("#compVocabFill").style.width = `${v}%`;

  if ($("#compFluencyVal")) $("#compFluencyVal").textContent = `${f}%`;
  if ($("#compFluencyFill")) $("#compFluencyFill").style.width = `${f}%`;

  if ($("#compCompVal")) $("#compCompVal").textContent = `${c}%`;
  if ($("#compCompFill")) $("#compCompFill").style.width = `${c}%`;

  const avg = Math.round((g + v + f + c) / 4);
  const currentLevel = $("#level")?.value || "A1";
  if ($("#verifiedLevelBadge")) {
    $("#verifiedLevelBadge").textContent = `Nivel ${currentLevel} Verificado: ${avg}%`;
  }

  const mList = $("#milestonesList");
  if (!mList) return;
  const allMilestones = Array.isArray(S?.milestones) ? S.milestones : [];
  const completedSet = new Set(Array.isArray(comp.milestones) ? comp.milestones : []);

  mList.replaceChildren(...allMilestones.map((m) => {
    const isDone = completedSet.has(m.id);
    const row = el("div", `milestone-item ${isDone ? "verified" : ""}`);

    const info = el("div", "milestone-info");
    info.append(el("h5", "", `${m.title} [${m.level}]`));
    info.append(el("p", "", m.desc));

    const badge = el("span", `milestone-status ${isDone ? "verified" : "pending"}`, isDone ? "✓ Verificado" : "⏳ En progreso");

    row.append(info, badge);
    return row;
  }));
}

// ---------------------------------------------------------------- progreso
function paintProgress() {
  $("#quests").replaceChildren(...S.quests.map((q) => {
    const li = el("li", q.done ? "done" : "");
    li.append(el("span", "", `${q.done ? "✓" : "○"} ${q.text}`));
    li.append(el("span", "muted small", `${q.have}/${q.need}`));
    return li;
  }));
  $("#weak").replaceChildren(...(S.weak.length ? S.weak.map((w) => el("li", "", `${w.cat}: ${w.count} errores recientes`)) : [el("li", "muted", "Sin errores recientes.")]));
  const max = Math.max(1, ...S.forecast);
  $("#fc").replaceChildren(...S.forecast.map((n, i) => {
    const col = el("div", "", `${n}`);
    const bar = el("i"); bar.style.height = `${(n / max) * 100}%`;
    col.prepend(bar);
    col.append(el("span", "", i === 0 ? "Hoy" : `+${i}d`));
    return col;
  }));
  $("#badges").replaceChildren(...(S.badges.length ? S.badges.map((b) => el("span", "chip", `🎖️ ${b}`)) : [el("span", "muted", "Aún no tienes medallas.")]));
  renderCompetencies();
}

// ---------------------------------------------------------------- tabs & bottom nav
function switchTab(target) {
  let t = target;
  if (!currentUser) {
    t = "landingView";
  } else if (!t || t === "landingView" || t === "landing") {
    t = "hubView";
  } else if (t === "hub") {
    t = "hubView";
  }

  // Actualizar visibilidad del Header según autenticación
  const headerUserStats = $("#headerUserStats");
  const headerGuestActions = $("#headerGuestActions");
  const mainBottomNav = $("#mainBottomNav");

  if (!currentUser) {
    if (headerUserStats) headerUserStats.style.display = "none";
    if (headerGuestActions) headerGuestActions.style.display = "flex";
    if (mainBottomNav) mainBottomNav.style.display = "none";
  } else {
    if (headerUserStats) headerUserStats.style.display = "flex";
    if (headerGuestActions) headerGuestActions.style.display = "none";
    if (mainBottomNav) mainBottomNav.style.display = "flex";
  }

  // Actualizar pestañas activas en la barra inferior (3 bloques principales + mapeo)
  document.querySelectorAll(".bottom-nav button, .tabs button").forEach((x) => {
    const tabKey = x.dataset.tab;
    const isSelected = (tabKey === t) ||
      (tabKey === "hub" && (t === "hubView" || t === "hub")) ||
      (tabKey === "speak" && (t === "speak" || t === "coop")) ||
      (tabKey === "review" && (t === "review" || t === "tones"));
    x.setAttribute("aria-selected", isSelected ? "true" : "false");
    if (isSelected) x.classList.add("active");
    else x.classList.remove("active");
  });

  // Sincronizar botones del selector de modo de práctica (1 a 1 vs Co-Op)
  const tutorBtn = $("#practiceModeTutorBtn");
  const coopBtn = $("#practiceModeCoopBtn");
  if (t === "speak") {
    if (tutorBtn) tutorBtn.classList.add("active");
    if (coopBtn) coopBtn.classList.remove("active");
  } else if (t === "coop") {
    if (tutorBtn) tutorBtn.classList.remove("active");
    if (coopBtn) coopBtn.classList.add("active");
  }

  // Mostrar u ocultar secciones en main
  document.querySelectorAll("main section").forEach((s) => {
    const shouldShow = (s.id === t);
    s.style.display = shouldShow ? "block" : "none";
    s.hidden = !shouldShow;
  });

  if (t === "hubView") loadAndRenderHub();
  if (t === "review") loadReview();
  if (t === "tones") loadDrills();
  if (t === "progress") paintProgress();
  if (t === "coop") loadAndRenderCoop();
}

document.querySelectorAll(".tabs button, .bottom-nav button").forEach((b) => {
  b.addEventListener("click", () => switchTab(b.dataset.tab));
});

async function refresh() {
  const wakeTimer = setTimeout(() => {
    status("Despertando el tutor, un momento…");
  }, 3000);

  try {
    S = await api(`/api/state?lang=${lang()}`);
  } finally {
    clearTimeout(wakeTimer);
  }

  paint();
  paintProgress();
  renderSessionVocab();
  if (currentUser) {
    loadAndRenderHub();
  }
  if (status() === "Despertando el tutor, un momento…") {
    status("Listo: presiona 'Empezar' para abrir la sesión.");
  }
}

// ============================================================================
// FASE II: MÓDULO SOCIAL CO-OP TBLT & MAPA ARTICULATORIO DE FORMANTES (GOP)
// ============================================================================

let activeCoopRoom = null;
let coopTimerInterval = null;
let coopSilenceCheckInterval = null;
let coopRemainingSeconds = 900; // 15 minutos de misión TBLT

// Mapeo anatómico de F1/F2 al SVG del trapecio vocálico IPA
function mapF1F2ToSvg(f1, f2) {
  const clampedF1 = Math.min(950, Math.max(180, f1 || 500));
  const clampedF2 = Math.min(2700, Math.max(700, f2 || 1500));
  
  // Normalización: F1 (200-900 Hz, mandíbula cerrada a abierta)
  const normF1 = (clampedF1 - 200) / (900 - 200);
  // F2 (2600-800 Hz, lengua anterior a posterior)
  const normF2 = (2600 - clampedF2) / (2600 - 800);
  
  // El trapecio se estrecha abajo: arriba 40 a 360, abajo 110 a 290
  const leftX = 40 + normF1 * (110 - 40);
  const rightX = 360 - normF1 * (360 - 290);
  
  const x = Math.round(leftX + normF2 * (rightX - leftX));
  const y = Math.round(30 + normF1 * (260 - 30));
  return { x, y };
}

function loadAndRenderCoop() {
  if (!activeCoopRoom) {
    if ($("#coopMatchView")) $("#coopMatchView").hidden = false;
    if ($("#coopActiveRoomView")) $("#coopActiveRoomView").hidden = true;
    
    const nameInput = $("#coopCandidateName");
    if (nameInput && !nameInput.value) {
      nameInput.value = currentUser?.email?.split("@")[0] || "Compañero Dev";
    }
    return;
  }

  if ($("#coopMatchView")) $("#coopMatchView").hidden = true;
  if ($("#coopActiveRoomView")) $("#coopActiveRoomView").hidden = false;

  renderCoopActiveRoom();
}

function renderCoopActiveRoom() {
  if (!activeCoopRoom) return;

  // Header
  const codeEl = $("#coopRoomCode");
  if (codeEl) codeEl.textContent = activeCoopRoom.room_code || `#${activeCoopRoom.id?.slice(0, 8)}`;

  const badgeEl = $("#coopRoomDomainBadge");
  if (badgeEl) badgeEl.textContent = `${activeCoopRoom.professional_domain?.toUpperCase()} · ${activeCoopRoom.level_cefr}`;

  // TBLT Task
  const task = activeCoopRoom.target_task || {};
  if ($("#coopTaskTitle")) $("#coopTaskTitle").textContent = task.title || "Misión Colaborativa";
  if ($("#coopTaskScenario")) $("#coopTaskScenario").textContent = task.scenario || "Resuelvan la tarea comunicándose en inglés.";
  
  const stepsList = $("#coopTaskSteps");
  if (stepsList && Array.isArray(task.steps)) {
    stepsList.innerHTML = task.steps.map((st) => `<li>${st}</li>`).join("");
  }

  // Members Grid & Talking Time
  renderCoopMembers();
}

function renderCoopMembers() {
  const grid = $("#coopMembersGrid");
  if (!grid || !activeCoopRoom) return;

  const members = activeCoopRoom.members || [];
  const currentUserId = currentUser?.id || "guest";

  grid.innerHTML = members.map((m) => {
    const isMe = m.userId === currentUserId;
    const isNextSpeaker = activeCoopRoom.suggestedNextSpeaker?.userId === m.userId;
    const duration = m.talkingTimeSeconds || 0;
    const percentage = m.talkingPercentage || (members.length > 0 ? Math.round(100 / members.length) : 0);
    const needsEncouragement = m.needsEncouragement;

    return `
      <div class="coop-member-card ${isNextSpeaker ? "is-active-speaker" : ""} ${needsEncouragement ? "needs-boost" : ""}">
        <div class="coop-member-head">
          <span class="coop-member-name">${m.name || "Participante"} ${isMe ? "(Tú)" : ""}</span>
          <span class="coop-member-role-badge">${m.role === "host" ? "👑 Host" : "Miembro"}</span>
        </div>
        <div class="coop-talking-meter">
          <div class="coop-talking-bar" style="width: ${percentage}%;"></div>
        </div>
        <div class="coop-talking-stat">
          <span>${percentage}% voz (${duration}s)</span>
          <span>${isNextSpeaker ? "👉 Turno sugerido" : (needsEncouragement ? "⚠️ Apoyar" : "En línea")}</span>
        </div>
      </div>
    `;
  }).join("");
}

async function joinOrMatchCoopRoom() {
  const findBtn = $("#coopFindRoomBtn");
  if (findBtn) {
    findBtn.disabled = true;
    findBtn.textContent = "Emparejando sala...";
  }

  const candidateName = ($("#coopCandidateName")?.value || "").trim() || currentUser?.email?.split("@")[0] || "Compañero";
  const level = $("#coopLevelSelect")?.value || "A2";
  const domain = $("#coopDomainSelect")?.value || "tech";
  const maxCapacity = parseInt($("#coopCapacitySelect")?.value || "4", 10);

  try {
    const res = await post("/api/coop/match", {
      candidateName,
      level,
      domain,
      maxCapacity,
    });

    activeCoopRoom = res.room;
    toast(res.isNewRoom ? "¡Sala Co-Op creada! Eres el anfitrión." : "¡Te has unido a la sala Co-Op!");
    
    // Iniciar temporizador de 15 minutos
    coopRemainingSeconds = 900;
    startCoopTimer();

    // Iniciar polling de silencios prolongados (>5s)
    startCoopSilenceCheck();

    loadAndRenderCoop();
  } catch (err) {
    toast("Error al conectar sala Co-Op: " + err.message);
  } finally {
    if (findBtn) {
      findBtn.disabled = false;
      findBtn.textContent = "🔍 Buscar o Crear Sala Co-Op";
    }
  }
}

function startCoopTimer() {
  if (coopTimerInterval) clearInterval(coopTimerInterval);
  updateCoopTimerDisplay();
  coopTimerInterval = setInterval(() => {
    coopRemainingSeconds--;
    if (coopRemainingSeconds <= 0) {
      clearInterval(coopTimerInterval);
      toast("⏰ Tiempo de misión TBLT completado. ¡Gran trabajo en equipo!");
    }
    updateCoopTimerDisplay();
  }, 1000);
}

function updateCoopTimerDisplay() {
  const timerBadge = $("#coopTimerBadge");
  if (!timerBadge) return;
  const m = Math.floor(coopRemainingSeconds / 60);
  const s = coopRemainingSeconds % 60;
  timerBadge.textContent = `⏱️ ${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function startCoopSilenceCheck() {
  if (coopSilenceCheckInterval) clearInterval(coopSilenceCheckInterval);
  coopSilenceCheckInterval = setInterval(async () => {
    if (!activeCoopRoom?.id) return;
    try {
      const res = await get(`/api/coop/silence-check?roomId=${activeCoopRoom.id}`);
      if (res.hasProlongedSilence && res.interventionPrompt?.facilitatorScript) {
        if ($("#coopFacilitatorPrompt")) {
          $("#coopFacilitatorPrompt").textContent = `"${res.interventionPrompt.facilitatorScript}"`;
        }
        if ($("#coopWettyStatus")) {
          $("#coopWettyStatus").textContent = "Estimulando participación cálida";
        }
      }
    } catch {
      // Ignorar fallas transitorias de red
    }
  }, 5000);
}

async function takeCoopTurn() {
  if (!activeCoopRoom?.id) return;
  const turnBtn = $("#coopSimulateTurnBtn");
  if (turnBtn) turnBtn.disabled = true;

  const durationSec = Math.floor(Math.random() * 8) + 5; // 5-12 segundos
  const transcripts = [
    "I worked on the backend API migration and we need to deploy today.",
    "I noticed the same issue with the ship container logs.",
    "Can you help me verify the about page user routing?",
    "I agree with the approach for our team standup."
  ];
  const chosenTranscript = transcripts[Math.floor(Math.random() * transcripts.length)];

  try {
    // 1. Simulación acústica GOP para verificar formantes
    let gopScore = 85;
    let painType = null;
    let gopRes = null;

    if (chosenTranscript.includes("ship")) {
      gopRes = await post("/api/acoustic/gop-score", { word: "ship", f1: 290, f2: 2250 });
      gopScore = gopRes.gopScore || 50;
      painType = gopRes.painType;
    } else if (chosenTranscript.includes("about")) {
      gopRes = await post("/api/acoustic/gop-score", { word: "about", f1: 700, f2: 1400 });
      gopScore = gopRes.gopScore || 52;
      painType = gopRes.painType;
    }

    // 2. Registrar turno en el motor Co-Op
    const turnRes = await post("/api/coop/turn", {
      roomId: activeCoopRoom.id,
      audioDurationSeconds: durationSec,
      transcriptText: chosenTranscript,
      gopScore,
    });

    // Actualizar estado de miembros
    activeCoopRoom.members = activeCoopRoom.members.map((m) => {
      const stat = turnRes.participationStats.find((s) => s.userId === m.userId);
      if (stat) {
        return {
          ...m,
          talkingTimeSeconds: stat.durationSeconds,
          talkingPercentage: stat.percentage,
          needsEncouragement: stat.needsEncouragement,
        };
      }
      return m;
    });
    activeCoopRoom.suggestedNextSpeaker = turnRes.suggestedNextSpeaker;

    renderCoopMembers();

    // 3. Consultar prompt de Wetty con recasting fonético si hubo error
    const promptRes = await get(`/api/coop/facilitator-prompt?roomId=${activeCoopRoom.id}`);
    if (promptRes?.facilitatorTurnScript && $("#coopFacilitatorPrompt")) {
      $("#coopFacilitatorPrompt").textContent = `"${promptRes.facilitatorTurnScript}"`;
    }

    // Si hubo desvío fonético, abrir automáticamente el widget de Mapa de Formantes
    if (gopRes && !gopRes.nativeLevel && painType) {
      toast("🎯 Desvío de pronunciación detectado. Abriendo Mapa de Formantes...");
      setTimeout(() => openFormantMap(gopRes), 800);
    } else {
      toast(`🎙️ Turno registrado (${durationSec}s). Siguiente: ${turnRes.suggestedNextSpeaker?.name || "Compañero"}`);
    }

  } catch (err) {
    toast("Error al registrar turno: " + err.message);
  } finally {
    if (turnBtn) turnBtn.disabled = false;
  }
}

function openFormantMap(data = null) {
  const modal = $("#formantMapModal");
  if (!modal) return;

  const defaultPain = {
    targetPhoneme: "ɪ",
    observedPhoneme: "iː",
    painType: "lax_tense_collapse",
    targetFormants: { f1: 400, f2: 1920 },
    observedFormants: { f1: 290, f2: 2250 },
    articulatoryGuide: {
      jawPosition: "Relajada semi-cerrada (~12mm de apertura)",
      tonguePosition: "Cuerpo lingual centralizado sin tensión anterior",
      articulatoryTip: "No sonrías ni tenses como en 'sheep'. Deja caer la mandíbula un milímetro y haz un sonido corto y suave.",
    },
    recastingRecommendation: {
      facilitatorTurn: "I noticed you said 'sheep' instead of 'ship'. Notice how a native speaker keeps the jaw relaxed for a short /ɪ/.",
    },
  };

  const info = data || defaultPain;
  const targetF = info.targetFormants || { f1: 400, f2: 1920 };
  const observedF = info.observedFormants || { f1: 290, f2: 2250 };

  const targetSvg = mapF1F2ToSvg(targetF.f1, targetF.f2);
  const observedSvg = mapF1F2ToSvg(observedF.f1, observedF.f2);

  // Actualizar puntos SVG
  const targetDot = $("#formantTargetDot");
  if (targetDot) {
    targetDot.setAttribute("cx", targetSvg.x);
    targetDot.setAttribute("cy", targetSvg.y);
  }
  const targetLbl = $("#formantTargetLbl");
  if (targetLbl) {
    targetLbl.setAttribute("x", targetSvg.x);
    targetLbl.setAttribute("y", targetSvg.y + 18);
    targetLbl.textContent = `/${info.targetPhoneme || "ɪ"}/ Objetivo`;
  }

  const observedDot = $("#formantObservedDot");
  if (observedDot) {
    observedDot.setAttribute("cx", observedSvg.x);
    observedDot.setAttribute("cy", observedSvg.y);
  }
  const observedLbl = $("#formantObservedLbl");
  if (observedLbl) {
    observedLbl.setAttribute("x", observedSvg.x);
    observedLbl.setAttribute("y", observedSvg.y - 12);
    observedLbl.textContent = `/${info.observedPhoneme || "iː"}/ Pronunciado`;
  }

  const vectorLine = $("#formantVectorLine");
  if (vectorLine) {
    vectorLine.setAttribute("x1", observedSvg.x);
    vectorLine.setAttribute("y1", observedSvg.y);
    vectorLine.setAttribute("x2", targetSvg.x);
    vectorLine.setAttribute("y2", targetSvg.y);
  }

  // Guía anatómica y recasting
  if ($("#formantBioJaw")) $("#formantBioJaw").textContent = info.articulatoryGuide?.jawPosition || "Relajada semi-cerrada";
  if ($("#formantBioTongue")) $("#formantBioTongue").textContent = info.articulatoryGuide?.tonguePosition || "Posición centralizada";
  if ($("#formantRecastingText")) {
    const tip = info.articulatoryGuide?.articulatoryTip || info.recastingRecommendation?.facilitatorTurn || "Practica la relajación mandibular.";
    $("#formantRecastingText").textContent = `"${tip}"`;
  }

  modal.hidden = false;
}

function openPeerReviewModal() {
  if (!activeCoopRoom) {
    toast("Debes estar en una sala Co-Op activa para dar peer review.");
    return;
  }

  const select = $("#peerRecipientSelect");
  if (select) {
    const currentUserId = currentUser?.id || "guest";
    const otherMembers = (activeCoopRoom.members || []).filter((m) => m.userId !== currentUserId);
    if (otherMembers.length === 0) {
      select.innerHTML = '<option value="">No hay otros compañeros en la sala aún</option>';
    } else {
      select.innerHTML = otherMembers.map((m) => `<option value="${m.userId}">${m.name} (${m.role})</option>`).join("");
    }
  }

  const rawInput = $("#peerRawInput");
  if (rawInput) rawInput.value = "";

  const resultBox = $("#peerSanitizedResult");
  if (resultBox) resultBox.style.display = "none";

  const modal = $("#peerReviewModal");
  if (modal) modal.hidden = false;
}

async function sendPeerFeedback() {
  if (!activeCoopRoom?.id) return;
  const recipientUserId = $("#peerRecipientSelect")?.value;
  if (!recipientUserId) {
    toast("Selecciona a un compañero para enviar feedback.");
    return;
  }

  const rawFeedback = ($("#peerRawInput")?.value || "").trim();
  if (!rawFeedback) {
    toast("Escribe tu nota o feedback para el compañero.");
    return;
  }

  const score = parseInt($("#peerScoreSelect")?.value || "4", 10);
  const sendBtn = $("#peerSendBtn");
  if (sendBtn) {
    sendBtn.disabled = true;
    sendBtn.textContent = "Filtrando con Seguridad Psicológica...";
  }

  try {
    const res = await post("/api/coop/peer-feedback", {
      roomId: activeCoopRoom.id,
      recipientUserId,
      score,
      rawFeedback,
    });

    const resultBox = $("#peerSanitizedResult");
    const resultText = $("#peerSanitizedText");
    if (resultBox && resultText) {
      resultText.textContent = res.sanitizedFeedback;
      resultBox.style.display = "block";
    }

    toast("✨ Feedback sanitizado y enviado con éxito.");
  } catch (err) {
    toast("Error al enviar peer feedback: " + err.message);
  } finally {
    if (sendBtn) {
      sendBtn.disabled = false;
      sendBtn.textContent = "🛡️ Enviar con Filtro Psicológico";
    }
  }
}

async function leaveCoopRoomAction() {
  if (!activeCoopRoom?.id) return;
  try {
    await post("/api/coop/leave", { roomId: activeCoopRoom.id });
  } catch {
    // Ignorar si ya salió
  }

  if (coopTimerInterval) clearInterval(coopTimerInterval);
  if (coopSilenceCheckInterval) clearInterval(coopSilenceCheckInterval);
  activeCoopRoom = null;
  toast("Has salido de la sala Co-Op.");
  loadAndRenderCoop();
}

async function init() {
  $("#lang").value = store.get("lang", "en");
  await refresh();
  fillSelectors();
  updateTutorPersona();
  updateTransToggle();
  loadDrills();

  // Eventos de Modales de Micrófono y Alternativa de Texto
  $("#micExplainerAllowBtn")?.addEventListener("click", () => {
    store.set("mic_permission_explained", "1");
    if ($("#micExplainerModal")) $("#micExplainerModal").hidden = true;
    startOrStopRecording();
  });

  $("#micExplainerCancelBtn")?.addEventListener("click", () => {
    store.set("mic_permission_explained", "1");
    if ($("#micExplainerModal")) $("#micExplainerModal").hidden = true;
    const txt = $("#chatText");
    if (txt) {
      txt.removeAttribute("disabled");
      txt.focus();
    }
  });

  $("#closeMicBlockedModal")?.addEventListener("click", () => {
    if ($("#micBlockedModal")) $("#micBlockedModal").hidden = true;
    $("#chatText")?.focus();
  });

  $("#micBlockedContinueTextBtn")?.addEventListener("click", () => {
    if ($("#micBlockedModal")) $("#micBlockedModal").hidden = true;
    const txt = $("#chatText");
    if (txt) {
      txt.removeAttribute("disabled");
      txt.focus();
    }
  });

  // Eventos de Landing Page y Auth Wall
  $("#landingStartBtn")?.addEventListener("click", () => {
    authMode = "register";
    updateAuthModalUI();
    const modal = $("#authModal");
    if (modal) modal.hidden = false;
  });

  $("#landingLoginBtn")?.addEventListener("click", () => {
    authMode = "login";
    updateAuthModalUI();
    const modal = $("#authModal");
    if (modal) modal.hidden = false;
  });

  $("#guestLoginBtn")?.addEventListener("click", () => {
    authMode = "login";
    updateAuthModalUI();
    const modal = $("#authModal");
    if (modal) modal.hidden = false;
  });

  $("#guestRegisterBtn")?.addEventListener("click", () => {
    authMode = "register";
    updateAuthModalUI();
    const modal = $("#authModal");
    if (modal) modal.hidden = false;
  });

  $("#landingListenSampleBtn")?.addEventListener("click", () => {
    speakVoice("Hello! Welcome to Polyglot Voice. Don't worry about making mistakes — together we will turn them into natural confidence.");
  });

  // Botones de navegación del Student Hub
  $("#hubGoToSpeakBtn")?.addEventListener("click", () => {
    switchTab("speak");
  });

  $("#backToHubBtn")?.addEventListener("click", () => {
    switchTab("hubView");
  });

  $("#hubViewProgressBtn")?.addEventListener("click", () => {
    switchTab("progress");
  });

  // Acordeón de Diagnóstico Detallado CEFR
  $("#hubToggleDiagnosisBtn")?.addEventListener("click", () => {
    const acc = $("#hubDiagnosisAccordion");
    const chev = $("#hubDiagnosisChevron");
    const btn = $("#hubToggleDiagnosisBtn");
    if (!acc) return;
    const isHidden = (acc.style.display === "none" || !acc.style.display);
    if (isHidden) {
      acc.style.display = "block";
      if (chev) chev.textContent = "▲";
      btn?.classList.add("open");
    } else {
      acc.style.display = "none";
      if (chev) chev.textContent = "▼";
      btn?.classList.remove("open");
    }
  });

  // Selector Rápido de Modo de Práctica: 1 a 1 vs Microgrupos Co-Op
  $("#practiceModeTutorBtn")?.addEventListener("click", () => {
    switchTab("speak");
  });
  $("#practiceModeCoopBtn")?.addEventListener("click", () => {
    switchTab("coop");
  });
  $("#coopGoToTutorBtn")?.addEventListener("click", () => {
    switchTab("speak");
  });

  // Selector de Escenarios Dinámicos (Solución 5)
  document.querySelectorAll(".scenario-card").forEach((card) => {
    card.addEventListener("click", () => {
      const sc = card.dataset.scenario;
      if (sc) selectScenario(sc, true);
    });
  });
  selectScenario(currentScenario, false);

  // Botones del Modal de Pre-sesión Warm-up
  $("#closeWarmupModal")?.addEventListener("click", () => {
    const modal = $("#warmupModal");
    if (modal) modal.hidden = true;
  });

  $("#warmupNextBtn")?.addEventListener("click", onWarmupNextClick);

  $("#warmupEnterLessonBtn")?.addEventListener("click", () => {
    startLessonDirectly(currentWarmupLessonId);
  });

  $("#warmupSkipDirectBtn")?.addEventListener("click", () => {
    startLessonDirectly(currentWarmupLessonId);
  });

  // Eventos del Modal de la Guía Oficial (Handbook)
  $("#closeHandbookModal")?.addEventListener("click", () => {
    const modal = $("#handbookModal");
    if (modal) modal.hidden = true;
  });

  document.querySelectorAll(".handbook-tab").forEach((tabBtn) => {
    tabBtn.addEventListener("click", () => {
      if (tabBtn.dataset.htab) {
        switchHandbookTab(tabBtn.dataset.htab);
      }
    });
  });

  $("#handbookStartWarmupBtn")?.addEventListener("click", () => {
    startLessonDirectly(currentHandbookLessonId);
  });

  $("#hubRefreshTreeBtn")?.addEventListener("click", () => {
    loadAndRenderCurriculumTree();
    toast("🔄 Árbol curricular actualizado");
  });

  // Eventos del Modal de Autenticación y Cuentas
  let authMode = "login"; // "login" | "register" | "recover"


  function updateAuthModalUI() {
    const loggedInView = $("#authLoggedInView");
    const loggedOutView = $("#authLoggedOutView");
    const title = $("#authModalTitle");
    const err = $("#authError");
    if (err) err.textContent = "";

    if (currentUser?.email) {
      if (loggedInView) loggedInView.hidden = false;
      if (loggedOutView) loggedOutView.hidden = true;
      if (title) title.textContent = "Mi Cuenta";
      const userProfileEmail = $("#userProfileEmail");
      const userProfileId = $("#userProfileId");
      if (userProfileEmail) userProfileEmail.textContent = currentUser.email;
      if (userProfileId) userProfileId.textContent = `ID de Alumno: ${currentUser.id}`;
    } else {
      if (loggedInView) loggedInView.hidden = true;
      if (loggedOutView) loggedOutView.hidden = false;
      const tabLogin = $("#tabLogin");
      const tabRegister = $("#tabRegister");
      const pwdWrap = $("#authPasswordFieldWrap");
      const pwdInput = $("#authPassword");
      const submitBtn = $("#authSubmitBtn");
      const forgotBtn = $("#forgotPasswordBtn");
      const backBtn = $("#backToLoginBtn");

      if (authMode === "recover") {
        if (title) title.textContent = "Recuperar Contraseña";
        if (tabLogin) tabLogin.parentElement.hidden = true;
        if (pwdWrap) pwdWrap.hidden = true;
        if (pwdInput) pwdInput.removeAttribute("required");
        if (submitBtn) submitBtn.textContent = "Enviar enlace de recuperación";
        if (forgotBtn) forgotBtn.hidden = true;
        if (backBtn) backBtn.hidden = false;
      } else {
        if (tabLogin) tabLogin.parentElement.hidden = false;
        if (pwdWrap) pwdWrap.hidden = false;
        if (pwdInput) pwdInput.setAttribute("required", "true");
        if (forgotBtn) forgotBtn.hidden = false;
        if (backBtn) backBtn.hidden = true;

        if (authMode === "register") {
          if (title) title.textContent = "Crear Cuenta";
          tabLogin?.classList.remove("active");
          tabRegister?.classList.add("active");
          if (submitBtn) submitBtn.textContent = "Registrarme";
        } else {
          if (title) title.textContent = "Iniciar Sesión";
          tabLogin?.classList.add("active");
          tabRegister?.classList.remove("active");
          if (submitBtn) submitBtn.textContent = "Ingresar";
        }
      }
    }
  }

  $("#authBtn")?.addEventListener("click", () => {
    updateAuthModalUI();
    const modal = $("#authModal");
    if (modal) modal.hidden = false;
  });

  $("#closeAuthModal")?.addEventListener("click", () => {
    const modal = $("#authModal");
    if (modal) modal.hidden = true;
  });

  $("#tabLogin")?.addEventListener("click", () => {
    authMode = "login";
    updateAuthModalUI();
  });

  $("#tabRegister")?.addEventListener("click", () => {
    authMode = "register";
    updateAuthModalUI();
  });

  $("#forgotPasswordBtn")?.addEventListener("click", () => {
    authMode = "recover";
    updateAuthModalUI();
  });

  $("#backToLoginBtn")?.addEventListener("click", () => {
    authMode = "login";
    updateAuthModalUI();
  });

  $("#authForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = ($("#authEmail")?.value || "").trim();
    const password = $("#authPassword")?.value || "";
    const errEl = $("#authError");
    if (errEl) errEl.textContent = "";

    try {
      if (authMode === "recover") {
        const res = await post("/api/auth/reset-password", { email });
        toast(res.message || "Enlace enviado a tu correo.");
        authMode = "login";
        updateAuthModalUI();
        return;
      }

      const endpoint = authMode === "register" ? "/api/auth/register" : "/api/auth/login";
      const user = await post(endpoint, { email, password });
      currentUser = user;
      store.set("polyglot_user", JSON.stringify(user));
      toast(`¡Bienvenido, ${user.email}!`);
      const modal = $("#authModal");
      if (modal) modal.hidden = true;
      paint();
      await refresh();
      switchTab("hubView");
    } catch (err) {
      if (errEl) errEl.textContent = err.message || "Ocurrió un error al procesar tu solicitud.";
    }
  });

  $("#logoutBtn")?.addEventListener("click", async () => {
    currentUser = null;
    try { localStorage.removeItem("polyglot_user"); } catch {}
    toast("Sesión cerrada.");
    const modal = $("#authModal");
    if (modal) modal.hidden = true;
    paint();
    await refresh();
    switchTab("landingView");
  });

  // Eventos de Lista de Espera de Chino
  $("#zhWaitlistBtn")?.addEventListener("click", () => {
    const modal = $("#zhWaitlistModal");
    if (modal) modal.hidden = false;
  });

  $("#closeZhWaitlistModal")?.addEventListener("click", () => {
    const modal = $("#zhWaitlistModal");
    if (modal) modal.hidden = true;
  });

  $("#zhWaitlistForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const waitlistEmail = ($("#zhWaitlistEmail")?.value || "").trim();
    if (waitlistEmail) {
      toast("¡Gracias! Te avisaremos por correo en cuanto lancemos el tutor de chino.");
      if ($("#zhWaitlistModal")) $("#zhWaitlistModal").hidden = true;
      $("#zhWaitlistEmail").value = "";
    }
  });

  // Eventos de Auditoría de Suficiencia y Certificación (Fase 3)
  $("#hubOpenExitExamBtn")?.addEventListener("click", () => openProficiencyModal("certification_exit"));
  $("#hubOpenPlacementBtn")?.addEventListener("click", () => openProficiencyModal("placement"));
  $("#hubViewCertsBtn")?.addEventListener("click", () => viewCertificates());
  $("#closeProficiencyModal")?.addEventListener("click", () => closeProficiencyModal());
  $("#profStartExamBtn")?.addEventListener("click", () => startActiveProficiencyExam());
  $("#phaseANextBtn")?.addEventListener("click", () => onPhaseANext());
  $("#phaseBSubmitBtn")?.addEventListener("click", () => submitProfPhaseB());
  $("#phaseCNextTurnBtn")?.addEventListener("click", () => onPhaseCNextTurn());

  // Eventos de Salas Co-Op y Mapa de Formantes (Fase II)
  $("#hubEnterCoopBtn")?.addEventListener("click", () => switchTab("coop"));

  document.querySelectorAll("#hubCoopDomainChips button").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#hubCoopDomainChips button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const domain = btn.dataset.domain;
      const select = $("#coopDomainSelect");
      if (select && domain) select.value = domain;
      switchTab("coop");
    });
  });

  $("#coopFindRoomBtn")?.addEventListener("click", () => joinOrMatchCoopRoom());
  $("#coopLeaveRoomBtn")?.addEventListener("click", () => leaveCoopRoomAction());
  $("#coopSimulateTurnBtn")?.addEventListener("click", () => takeCoopTurn());
  $("#coopOpenPeerReviewBtn")?.addEventListener("click", () => openPeerReviewModal());
  $("#closePeerReviewModal")?.addEventListener("click", () => {
    if ($("#peerReviewModal")) $("#peerReviewModal").hidden = true;
  });
  $("#peerSendBtn")?.addEventListener("click", () => sendPeerFeedback());

  $("#coopOpenFormantBtn")?.addEventListener("click", () => openFormantMap());
  $("#closeFormantMapModal")?.addEventListener("click", () => {
    if ($("#formantMapModal")) $("#formantMapModal").hidden = true;
  });
  $("#formantUnderstoodBtn")?.addEventListener("click", () => {
    if ($("#formantMapModal")) $("#formantMapModal").hidden = true;
  });

  window.speechSynthesis?.getVoices();

  // Iniciar en Landing (si no autenticado) o Hub (si autenticado)
  switchTab(currentUser ? "hubView" : "landingView");
}

init();
