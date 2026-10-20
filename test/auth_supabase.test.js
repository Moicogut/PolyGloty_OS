import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { TenantRepository } from "../lib/store.js";
import { SupabaseAdapter } from "../lib/supabase.js";

test("SupabaseAdapter: registro, hashing de contraseñas y login local defensivo", async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pvauth-"));
  const repo = new TenantRepository(tmpDir);
  const adapter = new SupabaseAdapter({ tenantRepo: repo });

  // 1. Registro con datos válidos
  const user = await adapter.register({ email: "tester@polyglot.ai", password: "secretpassword123" });
  assert.equal(user.email, "tester@polyglot.ai");
  assert.equal(user.provider, "local");
  assert.ok(user.id);

  // 2. Comprobar que la contraseña está hasheada con PBKDF2 y salt
  const store = repo.getStore(user.id);
  assert.ok(store.data.profile.auth.hash.includes(":"));
  assert.notEqual(store.data.profile.auth.hash, "secretpassword123");

  // 3. Intento de registro duplicado debe lanzar error
  await assert.rejects(
    () => adapter.register({ email: "tester@polyglot.ai", password: "otherpassword" }),
    /ya se encuentra registrado/
  );

  // 4. Login con contraseña correcta
  const logged = await adapter.login({ email: "tester@polyglot.ai", password: "secretpassword123" });
  assert.equal(logged.id, user.id);

  // 5. Login con contraseña incorrecta
  await assert.rejects(
    () => adapter.login({ email: "tester@polyglot.ai", password: "wrongpassword" }),
    /Contraseña incorrecta/
  );

  // 6. Guardar conversación
  await adapter.saveConversation(user.id, {
    lang: "en",
    level: "A1",
    mission: "cafe",
    turns: [{ role: "user", text: "Hello" }, { role: "model", text: "Hi there!" }],
  });

  const updatedStore = repo.getStore(user.id);
  assert.equal(updatedStore.data.conversations.length, 1);
  assert.equal(updatedStore.data.conversations[0].turns.length, 2);

  // 7. Prueba obligatoria: 3 tipos de correo (Gmail, Outlook y corporativo)
  const testEmails = [
    { email: "estudiante.apex@gmail.com", domain: "Gmail" },
    { email: "alumno.polyglot@outlook.com", domain: "Outlook" },
    { email: "director.idiomas@empresa-tech.com", domain: "Corporativo" },
  ];

  for (const item of testEmails) {
    const reg = await adapter.register({ email: item.email, password: "SecurePassword2026!" });
    assert.equal(reg.email, item.email, `Registro exitoso para dominio ${item.domain}`);

    const log = await adapter.login({ email: item.email, password: "SecurePassword2026!" });
    assert.equal(log.email, item.email, `Login exitoso para dominio ${item.domain}`);

    const rec = await adapter.recoverPassword({ email: item.email });
    assert.equal(rec.ok, true, `Recuperación de contraseña para dominio ${item.domain}`);
    assert.ok(rec.message.includes("instrucciones") || rec.message.includes("enlace"));
  }
});

