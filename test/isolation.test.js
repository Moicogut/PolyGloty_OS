import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { TenantRepository } from "../lib/store.js";
import { SupabaseAdapter } from "../lib/supabase.js";

test("TAREA 5: Seguridad de Datos y Aislamiento Multi-Tenant (Cuenta A vs Cuenta B)", async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pvsec-"));
  const repo = new TenantRepository(tmpDir);
  const adapter = new SupabaseAdapter({ tenantRepo: repo });

  // 1. Crear Cuenta A y agregar tarjetas y conversación privada
  const userA = await adapter.register({ email: "usuario_a@polyglot.ai", password: "PasswordA123!" });
  const storeA = repo.getStore(userA.id);
  storeA.data.cards.push({
    id: "card_a_1",
    front: "Confidential Project A",
    back: "Proyecto Confidencial A",
    lang: "en",
    due: Date.now(),
  });
  storeA.data.profile.xp = 120;
  storeA.save();

  await adapter.saveConversation(userA.id, {
    lang: "en",
    level: "B2",
    mission: "business",
    turns: [{ role: "user", text: "Turn secret A" }, { role: "model", text: "Secret reply A" }],
  });

  // 2. Crear Cuenta B
  const userB = await adapter.register({ email: "usuario_b@polyglot.ai", password: "PasswordB123!" });
  const storeB = repo.getStore(userB.id);

  // 3. Verificación de aislamiento estricto (Cuenta B NUNCA ve datos de Cuenta A)
  assert.notEqual(userA.id, userB.id, "Los identificadores de tenant deben ser distintos");
  assert.equal(storeB.data.cards.length, 0, "Cuenta B no debe tener las tarjetas de Cuenta A");
  assert.equal((storeB.data.conversations || []).length, 0, "Cuenta B no debe tener el historial de Cuenta A");
  assert.equal(storeB.data.profile.xp, 0, "Cuenta B debe iniciar con progreso en cero");
  assert.equal(storeB.data.competencies, null, "Nuevo usuario debe iniciar con competencias en null");

  // 4. Modificación de Cuenta B no altera Cuenta A
  storeB.data.profile.xp = 50;
  storeB.data.cards.push({ id: "card_b_1", front: "B Card", back: "B", lang: "en", due: Date.now() });
  storeB.save();

  // 5. Reinicio de store (simular reinicio de servidor / recarga de repositorio)
  const freshRepo = new TenantRepository(tmpDir);
  const verifyA = freshRepo.getStore(userA.id);
  const verifyB = freshRepo.getStore(userB.id);

  assert.equal(verifyA.data.profile.xp, 120, "XP de Cuenta A permanece intacta");
  assert.equal(verifyA.data.cards.length, 1, "Tarjetas de Cuenta A no sufren modificaciones por Cuenta B");
  assert.equal(verifyA.data.cards[0].id, "card_a_1");
  assert.equal(verifyB.data.profile.xp, 50, "XP de Cuenta B permanece aislada tras reinicio");
  assert.equal(verifyB.data.cards.length, 1, "Tarjetas de Cuenta B persisten aisladamente tras reinicio");
});

test("C4: el servidor en NODE_ENV=production se niega a iniciar sin Supabase", async () => {
  const { spawn } = await import("node:child_process");
  const serverPath = path.resolve(import.meta.dirname, "..", "server.js");

  // Iniciar servidor con NODE_ENV=production y sin variables de Supabase
  const proc = spawn("node", [serverPath], {
    env: {
      ...process.env,
      NODE_ENV: "production",
      SUPABASE_URL: "",
      SUPABASE_KEY: "",
      SUPABASE_SERVICE_ROLE_KEY: "",
      TEST_MODE: "", // asegurar que evalúe la guardia de inicio
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stderrOutput = "";
  proc.stderr.on("data", (chunk) => {
    stderrOutput += chunk.toString();
  });

  const exitCode = await new Promise((resolve) => {
    proc.on("close", resolve);
  });

  // Debe terminar con código 1 y advertencia clara
  assert.equal(exitCode, 1, "El servidor debe abortar con exit code 1");
  assert.ok(
    stderrOutput.includes("FATAL: En NODE_ENV=production se requiere configurar SUPABASE_URL") ||
    stderrOutput.includes("missing_production_supabase"),
    "Debe emitir mensaje fatal descriptivo impidiendo inicio sin Supabase"
  );
});

test("C4: persistencia multi-tenant real (XP, racha, tarjetas, errores, misiones, competencias) con dos usuarios y reinicio", async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pvc4-"));
  const repo1 = new TenantRepository(tmpDir);

  const userA = "alumno_c4_alpha";
  const userB = "alumno_c4_beta";

  const storeA1 = repo1.getStore(userA);
  const storeB1 = repo1.getStore(userB);

  // 1. Estado Usuario A: XP, racha, tarjetas, errores, misiones, competencias
  storeA1.data.profile.xp = 250;
  storeA1.data.profile.streak = 5;
  storeA1.data.profile.lastDay = "2026-10-20";
  storeA1.data.profile.missionsDone = { cafe: 2 };
  storeA1.data.profile.badges = ["Cafe Connoisseur"];
  storeA1.data.cards = [{ id: "c_a1", front: "Thank you", back: "Gracias", lang: "en", due: 1700000000000 }];
  storeA1.data.errors = [{ cat: "grammar", said: "I has a pen", better: "I have a pen", lang: "en", t: 1700000000000 }];
  storeA1.data.competencies = { grammar: 75, vocabulary: 80, fluency: 70, comprehension: 85 };
  storeA1.save();

  // 2. Estado Usuario B: Diferente y aislado
  storeB1.data.profile.xp = 80;
  storeB1.data.profile.streak = 1;
  storeB1.data.profile.lastDay = "2026-10-19";
  storeB1.data.profile.missionsDone = { taxi: 1 };
  storeB1.data.profile.badges = ["Navigator"];
  storeB1.data.cards = [{ id: "c_b1", front: "Hotel", back: "Hotel", lang: "en", due: 1700000500000 }];
  storeB1.data.errors = [{ cat: "pronunciation", said: "tree", better: "three", lang: "en", t: 1700000500000 }];
  storeB1.data.competencies = { grammar: 50, vocabulary: 60, fluency: 55, comprehension: 65 };
  storeB1.save();

  // 3. Reinicio completo del proceso / recreación del repositorio desde almacenamiento
  const repo2 = new TenantRepository(tmpDir);
  const storeA2 = repo2.getStore(userA);
  const storeB2 = repo2.getStore(userB);

  // 4. Verificación de A: Integridad total, sin mezcla con B
  assert.equal(storeA2.data.profile.xp, 250);
  assert.equal(storeA2.data.profile.streak, 5);
  assert.equal(storeA2.data.profile.missionsDone.cafe, 2);
  assert.equal(storeA2.data.profile.badges[0], "Cafe Connoisseur");
  assert.equal(storeA2.data.cards.length, 1);
  assert.equal(storeA2.data.cards[0].id, "c_a1");
  assert.equal(storeA2.data.errors.length, 1);
  assert.equal(storeA2.data.errors[0].said, "I has a pen");
  assert.equal(storeA2.data.competencies.grammar, 75);

  // 5. Verificación de B: Integridad total, sin mezcla con A
  assert.equal(storeB2.data.profile.xp, 80);
  assert.equal(storeB2.data.profile.streak, 1);
  assert.equal(storeB2.data.profile.missionsDone.taxi, 1);
  assert.equal(storeB2.data.profile.badges[0], "Navigator");
  assert.equal(storeB2.data.cards.length, 1);
  assert.equal(storeB2.data.cards[0].id, "c_b1");
  assert.equal(storeB2.data.errors.length, 1);
  assert.equal(storeB2.data.errors[0].said, "tree");
  assert.equal(storeB2.data.competencies.grammar, 50);
});

