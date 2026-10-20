import test from "node:test";
import assert from "node:assert/strict";

test("A1: RLS multi-tenant por usuario en Supabase (E2E o Skip defensivo)", async (t) => {
  const {
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    TEST_USER_A_EMAIL,
    TEST_USER_A_PASSWORD,
    TEST_USER_B_EMAIL,
    TEST_USER_B_PASSWORD,
  } = process.env;

  const hasCredentials = Boolean(
    SUPABASE_URL &&
    SUPABASE_ANON_KEY &&
    TEST_USER_A_EMAIL &&
    TEST_USER_A_PASSWORD &&
    TEST_USER_B_EMAIL &&
    TEST_USER_B_PASSWORD
  );

  if (!hasCredentials) {
    t.skip("Omitido: Se requieren SUPABASE_URL, SUPABASE_ANON_KEY, TEST_USER_A_EMAIL/PASSWORD y TEST_USER_B_EMAIL/PASSWORD para verificar RLS en vivo.");
    return;
  }

  // 1. Iniciar sesión con Usuario A
  const loginA = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email: TEST_USER_A_EMAIL, password: TEST_USER_A_PASSWORD }),
  });
  const dataA = await loginA.json();
  assert.ok(dataA.access_token, "Usuario A debe autenticarse exitosamente");

  // 2. Iniciar sesión con Usuario B
  const loginB = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email: TEST_USER_B_EMAIL, password: TEST_USER_B_PASSWORD }),
  });
  const dataB = await loginB.json();
  assert.ok(dataB.access_token, "Usuario B debe autenticarse exitosamente");

  // 3. Usuario A crea una tarjeta
  const cardId = `test_card_${Date.now()}`;
  const insertCard = await fetch(`${SUPABASE_URL}/rest/v1/cards`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${dataA.access_token}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      id: cardId,
      user_id: dataA.user.id,
      front: "Private A Word",
      back: "Palabra Privada A",
      lang: "en",
      due: Date.now(),
    }),
  });
  assert.equal(insertCard.status, 201, "Usuario A puede insertar su propia tarjeta");

  // 4. Usuario B intenta leer la tarjeta de Usuario A (RLS debe devolver vacío [])
  const readByB = await fetch(`${SUPABASE_URL}/rest/v1/cards?id=eq.${cardId}`, {
    method: "GET",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${dataB.access_token}`,
    },
  });
  const cardsSeenByB = await readByB.json();
  assert.equal(cardsSeenByB.length, 0, "Usuario B NO debe poder ver tarjetas de Usuario A vía RLS");

  // 5. Usuario B intenta modificar la tarjeta de Usuario A (RLS no debe permitir cambios)
  const updateByB = await fetch(`${SUPABASE_URL}/rest/v1/cards?id=eq.${cardId}`, {
    method: "PATCH",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${dataB.access_token}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({ front: "Hacked by B" }),
  });
  const patchResult = await updateByB.json();
  assert.equal(patchResult.length, 0, "Usuario B NO debe poder actualizar tarjetas de Usuario A vía RLS");

  // 6. Limpieza por Usuario A
  await fetch(`${SUPABASE_URL}/rest/v1/cards?id=eq.${cardId}`, {
    method: "DELETE",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${dataA.access_token}`,
    },
  });
});
