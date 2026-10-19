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
  if (!r.ok) throw new Error(j?.error || t || `HTTP ${r.status}`);
  return j ?? t;
};
const post = (p, b) => api(p, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b ?? {}) });
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

function paint() {
  $("#lv").textContent = `Nv ${S.level}`;
  $("#xb").style.width = `${(S.levelProgress / S.levelSize) * 100}%`;
  $("#xp").textContent = `${S.xp} XP`;
  $("#streak").textContent = `🔥 Racha ${S.streak} ${S.streak === 1 ? "día" : "días"}`;
  $("#duechip").textContent = `📚 ${S.due} por repasar`;

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
  $("#mission").replaceChildren(...S.missions.map((m) => { const o = el("option", "", m.title); o.value = m.id; o.selected = m.id === savedM; return o; }));
  renderObjectives();
}

$("#lang").addEventListener("change", async () => {
  store.set("lang", lang());
  fillSelectors();
  updateTutorPersona();
  await refresh();
  loadDrills();
});
$("#level").addEventListener("change", () => store.set(`level_${lang()}`, $("#level").value));
$("#mission").addEventListener("change", () => {
  store.set("mission", $("#mission").value);
  done.clear();
  renderObjectives();
});

const done = new Set();
const mission = () => S.missions.find((m) => m.id === $("#mission").value);

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
  const m = mission();
  $("#objs").replaceChildren(...(m ? m.objectives : []).map((o, i) => el("li", done.has(i) ? "done" : "", `${done.has(i) ? "✓" : "○"} ${o}`)));
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
  $("#avatarIcon").textContent = isZh ? "👩🏻" : "🧑🏼";
  $("#tutorName").textContent = isZh ? "Mei (美) · Tutora de Chino" : "Alex · Tutor de Inglés";
  $("#tutorRole").textContent = isZh
    ? "Practica pronunciación tonal y conversación guiada en mandarín."
    : "Mejora tu fluidez y vocabulario con conversación natural.";
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
  rec.continuous = false;
  rec.interimResults = true;
  rec.maxAlternatives = 1;

  let activeTranscript = "";

  rec.onstart = () => {
    isRecording = true;
    activeTranscript = "";
    if ($("#voiceBtn")) $("#voiceBtn").classList.add("recording");
    if ($("#pulseDot")) $("#pulseDot").style.display = "block";
    const langName = speechInputLang === "es" ? "español" : (lang() === "zh" ? "chino mandarín" : "inglés");
    status(`🔴 Escuchando en ${langName}… habla ahora`);
  };

  rec.onresult = (e) => {
    let interim = "";
    activeTranscript = "";
    for (let i = 0; i < e.results.length; ++i) {
      if (e.results[i].isFinal) {
        activeTranscript += e.results[i][0].transcript;
      } else {
        interim += e.results[i][0].transcript;
      }
    }
    const current = (activeTranscript || interim).trim();
    if (current && $("#chatText")) {
      $("#chatText").value = current;
    }
  };

  rec.onerror = (e) => {
    console.warn("Speech recognition error:", e.error);
    isRecording = false;
    if ($("#voiceBtn")) $("#voiceBtn").classList.remove("recording");
    if ($("#pulseDot")) $("#pulseDot").style.display = "none";
    if (e.error === "not-allowed") {
      toast("Permiso de micrófono denegado en el navegador.");
    } else if (e.error === "no-speech") {
      status("No se detectó voz. Vuelve a pulsar el micrófono.");
    }
  };

  rec.onend = async () => {
    isRecording = false;
    if ($("#voiceBtn")) $("#voiceBtn").classList.remove("recording");
    if ($("#pulseDot")) $("#pulseDot").style.display = "none";
    status(isConnected ? "Listo: habla o escribe tu respuesta" : "Desconectado");

    const textToSend = ($("#chatText")?.value || activeTranscript || "").trim();
    if (textToSend) {
      await sendUserTurn(textToSend);
    }
  };

  return rec;
}

function toggleRecording() {
  if (!isConnected) {
    toast("Presiona 'Empezar' para iniciar la sesión con tu tutor.");
    return;
  }
  if (!recognition) recognition = initSpeechRecognition();
  if (!recognition) {
    toast("Navegador sin soporte de voz. Escribe directamente en el chat.");
    return;
  }
  if (isRecording) {
    recognition.stop();
  } else {
    recognition.lang = getSpeechLangCode();
    try {
      recognition.start();
    } catch (err) {
      console.warn("Error al iniciar reconocimiento:", err);
    }
  }
}

async function sendUserTurn(rawText) {
  const text = (rawText || "").trim();
  if (!text) return;
  if (!isConnected) {
    toast("Primero presiona 'Empezar' para abrir la sesión.");
    return;
  }

  say("me", text);
  if ($("#chatText")) $("#chatText").value = "";
  tStop = performance.now();
  await sendTurnToTutor(text);
}

// Envío del turno a Gemini (Backend)
async function sendTurnToTutor(userText) {
  status("Alex está pensando…");
  $("#avatarIcon").classList.add("speaking");

  conversationHistory.push({
    role: "user",
    parts: [{ text: userText }]
  });

  try {
    const res = await post("/api/chat", {
      messages: conversationHistory,
      lang: lang(),
      level: $("#level").value,
      mission: $("#mission").value,
    });

    const reply = res.reply || "";
    if (tStop) {
      $("#lat").textContent = `${Math.round(performance.now() - tStop)} ms`;
    }

    conversationHistory.push({
      role: "model",
      parts: [{ text: reply }]
    });

    say("ai", reply, {
      translation: res.translation,
      tip: res.feedback?.tip || null,
    });

    if (res.feedback?.tip && $("#liveFeedbackNotice")) {
      $("#liveFeedbackNotice").textContent = `💡 ${res.feedback.tip}`;
    }

    status("Conectado: responde por texto o voz");
    speakVoice(reply);

    // Revisar objetivos
    checkMissionProgress(userText);
    await refresh();
  } catch (err) {
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
  window.speechSynthesis.cancel();

  const clean = cleanTextForSpeech(text);
  if (!clean) return;

  const ut = new SpeechSynthesisUtterance(clean);
  const targetLang = lang();
  ut.lang = targetLang === "zh" ? "zh-CN" : "en-US";
  ut.rate = targetLang === "zh" ? 0.90 : 0.95;
  ut.pitch = 1.0;

  if (!cachedVoices.length) loadSystemVoices();

  // Buscar preferentemente voces naturales / mejor calidad
  const langPrefix = targetLang === "zh" ? "zh" : "en";
  const candidates = cachedVoices.filter((v) => v.lang.toLowerCase().startsWith(langPrefix));
  const premiumVoice = candidates.find((v) => /natural|premium|online|google|samantha|karen|tingting/i.test(v.name)) || candidates[0];
  if (premiumVoice) ut.voice = premiumVoice;

  ut.onstart = () => {
    $("#avatarIcon")?.classList.add("speaking");
    const badge = $("#tutorBadge");
    if (badge) badge.textContent = "Hablando…";
  };
  ut.onend = () => {
    $("#avatarIcon")?.classList.remove("speaking");
    const badge = $("#tutorBadge");
    if (badge) badge.textContent = isConnected ? "Escuchando" : "Listo";
  };
  ut.onerror = () => {
    $("#avatarIcon")?.classList.remove("speaking");
    const badge = $("#tutorBadge");
    if (badge) badge.textContent = isConnected ? "Listo" : "Desconectado";
  };

  window.speechSynthesis.speak(ut);
}

function checkMissionProgress(userText) {
  const m = mission();
  if (!m || !m.objectives.length) return;
  m.objectives.forEach((obj, idx) => {
    if (!done.has(idx) && userText.length > 5) {
      if (Math.random() > 0.45) {
        done.add(idx);
        renderObjectives();
        post("/api/tool", { name: "mission_progress", args: { objective_index: idx }, lang: lang(), mission: m.id, done: [...done] }).then((r) => applyFx(r.fx)).catch(() => {});
      }
    }
  });
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
  renderObjectives();
  if ($("#chat")) $("#chat").replaceChildren();
  status("Conectando con el tutor…");

  try {
    const q = new URLSearchParams({ lang: lang(), level: $("#level").value, mission: $("#mission").value });
    const sess = await api(`/api/session?${q}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });

    isConnected = true;
    conversationHistory = [];
    if ($("#hangup")) $("#hangup").disabled = false;
    if ($("#connect")) $("#connect").disabled = true;
    if ($("#chatText")) { $("#chatText").disabled = false; $("#chatText").focus(); }
    if ($("#sendBtn")) $("#sendBtn").disabled = false;
    if ($("#voiceBtn")) $("#voiceBtn").disabled = false;
    if ($("#tutorBadge")) $("#tutorBadge").textContent = "Conectado";

    // Mensaje de apertura de la escena
    const greeting = lang() === "zh"
      ? "你好！很高兴见到你。今天你想练习什么？"
      : "Hello! Nice to meet you. Are you ready for our conversation?";

    const greetingTrans = lang() === "zh"
      ? "¡Hola! Mucho gusto en verte. ¿Qué te gustaría practicar hoy?"
      : "¡Hola! Mucho gusto en conocerte. ¿Estás listo para nuestra conversación?";

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

// ---------------------------------------------------------------- modal de usuario / auth
let authMode = "login";

function openAuthModal() {
  const modal = $("#authModal");
  if (!modal) return;
  modal.hidden = false;
  const errEl = $("#authError");
  if (errEl) errEl.textContent = "";

  if (currentUser) {
    $("#authLoggedInView").hidden = false;
    $("#authLoggedOutView").hidden = true;
    $("#userProfileEmail").textContent = currentUser.email || "Usuario activo";
    $("#userProfileId").textContent = `ID de sesión: ${currentUser.id} · Modo: ${currentUser.provider || "local"}`;
  } else {
    $("#authLoggedInView").hidden = true;
    $("#authLoggedOutView").hidden = false;
  }
}

function closeAuthModal() {
  if ($("#authModal")) $("#authModal").hidden = true;
}

$("#authBtn")?.addEventListener("click", openAuthModal);
$("#closeAuthModal")?.addEventListener("click", closeAuthModal);
$("#themeToggleBtn")?.addEventListener("click", () => {
  const nextTheme = currentTheme === "light" ? "dark" : "light";
  applyTheme(nextTheme);
  toast(`Modo cambiado a: ${nextTheme === "light" ? "Visión Clara (Día) ☀️" : "Visión Oscura (Noche) 🌙"}`);
});

$("#tabLogin")?.addEventListener("click", () => {
  authMode = "login";
  $("#tabLogin").classList.add("active");
  $("#tabRegister").classList.remove("active");
  $("#authSubmitBtn").textContent = "Ingresar";
  const errEl = $("#authError");
  if (errEl) errEl.textContent = "";
});

$("#tabRegister")?.addEventListener("click", () => {
  authMode = "register";
  $("#tabRegister").classList.add("active");
  $("#tabLogin").classList.remove("active");
  $("#authSubmitBtn").textContent = "Crear Cuenta";
  const errEl = $("#authError");
  if (errEl) errEl.textContent = "";
});

$("#authForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = $("#authEmail").value.trim();
  const password = $("#authPassword").value;
  const errEl = $("#authError");
  if (errEl) errEl.textContent = "";

  try {
    const endpoint = authMode === "register" ? "/api/auth/register" : "/api/auth/login";
    const res = await post(endpoint, { email, password });
    currentUser = res;
    store.set("polyglot_user", JSON.stringify(currentUser));
    toast(authMode === "register" ? "¡Cuenta registrada exitosamente!" : "¡Bienvenido de vuelta!");
    closeAuthModal();
    await refresh();
  } catch (err) {
    if (errEl) errEl.textContent = err.message || "Error al autenticar";
  }
});

$("#logoutBtn")?.addEventListener("click", async () => {
  currentUser = null;
  store.set("polyglot_user", "");
  toast("Sesión cerrada");
  closeAuthModal();
  await refresh();
});

// ---------------------------------------------------------------- evaluación y competencias
function renderCompetencies() {
  const comp = S?.competencies || { grammar: 60, vocabulary: 65, fluency: 55, comprehension: 70, milestones: [] };

  const g = Math.round(comp.grammar || 60);
  const v = Math.round(comp.vocabulary || 65);
  const f = Math.round(comp.fluency || 55);
  const c = Math.round(comp.comprehension || 70);

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
function switchTab(t) {
  document.querySelectorAll(".tabs button, .bottom-nav button").forEach((x) => {
    const isSelected = x.dataset.tab === t;
    x.setAttribute("aria-selected", isSelected ? "true" : "false");
    if (isSelected) x.classList.add("active");
    else x.classList.remove("active");
  });
  document.querySelectorAll("main section").forEach((s) => (s.hidden = s.id !== t));
  if (t === "review") loadReview();
  if (t === "tones") loadDrills();
  if (t === "progress") paintProgress();
}

document.querySelectorAll(".tabs button, .bottom-nav button").forEach((b) => {
  b.addEventListener("click", () => switchTab(b.dataset.tab));
});

async function refresh() {
  S = await api(`/api/state?lang=${lang()}`);
  paint();
  paintProgress();
  renderSessionVocab();
}

async function init() {
  $("#lang").value = store.get("lang", "en");
  await refresh();
  fillSelectors();
  updateTutorPersona();
  updateTransToggle();
  loadDrills();
  window.speechSynthesis?.getVoices();
}

init();
