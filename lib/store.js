import fs from "node:fs";
import path from "node:path";

export const EMPTY_STATE = () => ({
  cards: [],
  profile: { xp: 0, streak: 0, lastDay: "", badges: [], missionsDone: {} },
  errors: [], // { cat, said, better, lang, t }
  daily: { date: "", reviews: 0, drills: 0, missions: 0, cardsAdded: 0, turns: 0 },
  competencies: null,
  sessionVocab: [],
});

export const dayKey = (t = Date.now()) => new Date(t).toLocaleDateString("sv-SE"); // AAAA-MM-DD local

// Sanitiza el ID de usuario/inquilino para prevenir path traversal
export function sanitizeTenantId(id) {
  if (!id || typeof id !== "string") return "default";
  const clean = id.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
  return clean.length > 0 && clean.length <= 64 ? clean : "default";
}

/**
 * Abre o crea un Store individual para un archivo específico.
 * Compatible hacia atrás con openStore(filePath).
 */
export function openStore(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  let data = EMPTY_STATE();
  try {
    data = { ...EMPTY_STATE(), ...JSON.parse(fs.readFileSync(file, "utf8")) };
    if (!Array.isArray(data.sessionVocab)) data.sessionVocab = [];
  } catch (e) {
    if (e.code !== "ENOENT") {
      fs.copyFileSync(file, `${file}.corrupt-${Date.now()}`);
      console.warn(`Archivo de datos ${file} ilegible; se respaldó y se inicia vacío.`);
    }
  }
  const save = () => {
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
    fs.renameSync(tmp, file);
  };
  const rollDay = (now = Date.now()) => {
    const k = dayKey(now);
    if (data.daily.date !== k) data.daily = { ...EMPTY_STATE().daily, date: k };
  };
  rollDay();
  return { data, save, rollDay, file };
}

/**
 * Gestor de Repositorio Multi-Inquilino (SaaS Multi-tenancy).
 * Aísla datos por tenantId / userId en directorios o archivos dedicados.
 */
export class TenantRepository {
  constructor(baseDir) {
    this.baseDir = baseDir;
    this.instances = new Map();
    fs.mkdirSync(this.baseDir, { recursive: true });
  }

  getStore(rawTenantId = "default") {
    const isProduction = process.env.NODE_ENV === "production";
    const tenantId = sanitizeTenantId(rawTenantId);
    if (this.instances.has(tenantId)) {
      return this.instances.get(tenantId);
    }

    // En producción nunca se comparte un state.json global entre usuarios; cada tenant tiene su archivo o respaldo
    const fileName = (tenantId === "default" && !isProduction) ? "state.json" : `state_${tenantId}.json`;
    const filePath = path.join(this.baseDir, fileName);

    const storeInstance = openStore(filePath);
    storeInstance.tenantId = tenantId;
    this.instances.set(tenantId, storeInstance);
    return storeInstance;
  }
}
