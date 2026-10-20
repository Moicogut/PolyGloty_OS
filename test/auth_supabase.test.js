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

test("C7: POST /api/auth/reset-password responde idéntico para correo existente o inexistente y limita por IP y correo", async () => {
  const { spawn } = await import("node:child_process");
  const http = await import("node:http");

  async function getPort() {
    return new Promise((resolve) => {
      const s = http.createServer();
      s.listen(0, "127.0.0.1", () => {
        const p = s.address().port;
        s.close(() => resolve(p));
      });
    });
  }

  const port = await getPort();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pvreset-"));
  fs.cpSync(path.resolve(import.meta.dirname, ".."), dir, {
    recursive: true,
    filter: (s) => !s.includes("node_modules") && !s.endsWith("state.json") && !s.endsWith(".env"),
  });

  const proc = spawn("node", ["server.js"], {
    cwd: dir,
    env: { ...process.env, PORT: String(port), HOST: "127.0.0.1", NODE_ENV: "development" },
    stdio: "ignore",
  });

  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/health`);
      if (res.ok) break;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  const base = `http://127.0.0.1:${port}`;

  try {
    // 1. Correo existente
    await fetch(`${base}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: base },
      body: JSON.stringify({ email: "existente@example.com", password: "Password123!" }),
    });

    const resExistente = await fetch(`${base}/api/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: base },
      body: JSON.stringify({ email: "existente@example.com" }),
    });
    const dataExistente = await resExistente.json();

    // 2. Correo inexistente
    const resInexistente = await fetch(`${base}/api/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: base },
      body: JSON.stringify({ email: "fantasma_inexistente@example.com" }),
    });
    const dataInexistente = await resInexistente.json();

    // Comprobar que ambas respuestas son exactamente idénticas
    assert.equal(resExistente.status, 200);
    assert.equal(resInexistente.status, 200);
    assert.deepEqual(dataExistente, dataInexistente);
    assert.equal(dataExistente.message, "Si la cuenta existe, se ha enviado un enlace a tu correo para restablecer tu contraseña.");

    // 3. Rate limiting por correo: realizar múltiples peticiones para el mismo correo hasta agotar cuota
    const targetEmail = "spam_test@example.com";
    let reachedLimit = false;
    for (let i = 0; i < 7; i++) {
      const r = await fetch(`${base}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: base },
        body: JSON.stringify({ email: targetEmail }),
      });
      if (r.status === 429) {
        reachedLimit = true;
        const errJson = await r.json();
        assert.ok(errJson.error.includes("Demasiad"));
        break;
      }
    }
    assert.equal(reachedLimit, true, "Debe limitar por correo o por IP tras exceder intentos");
  } finally {
    proc.kill();
  }
});


