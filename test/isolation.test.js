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
  assert.equal(storeB.data.profile.xp, 0, "Cuenta B no debe tener la experiencia de Cuenta A");

  // 4. Modificación de Cuenta B no altera Cuenta A
  storeB.data.profile.xp = 50;
  storeB.data.cards.push({ id: "card_b_1", front: "B Card", back: "B", lang: "en", due: Date.now() });
  storeB.save();

  const verifyA = repo.getStore(userA.id);
  assert.equal(verifyA.data.profile.xp, 120, "XP de Cuenta A permanece intacta");
  assert.equal(verifyA.data.cards.length, 1, "Tarjetas de Cuenta A no sufren modificaciones por Cuenta B");
  assert.equal(verifyA.data.cards[0].id, "card_a_1");
});
