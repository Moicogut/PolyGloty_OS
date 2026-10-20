# Registro de Ejecución Agéntica · Polyglot Voice Parte 1C (Cierre y Verificación)

## Línea Base de la Iteración
- **Rama origen:** `fix/parte-1b`
- **Rama activa de trabajo:** `fix/parte-1c`
- **Tests iniciales (`npm test`):** 42 passing, 1 skipped.
- **Tests finales (`npm test`):** 47 passing, 1 skipped (48 totales).
- **Entorno de ejecución:** Node.js v24.18.1, Windows, Common/ES Modules.

---

## Tabla de Seguimiento de Tareas (C1 .. C7)

| Tarea | Estado | Evidencia | Pendiente Humano |
|---|---|---|---|
| **C1. Migración RLS Completa (Bloqueante)** | DONE | Modificada `supabase/migrations/001_rls_por_usuario.sql` con cláusulas `DROP POLICY IF EXISTS` para todas las políticas abiertas anteriores ("Public profiles access", "Cards user access", etc.) y para las nuevas antes de cada `CREATE POLICY`, logrando idempotencia total. Se añadieron al final, comentadas, las 3 consultas de control (`pg_policies`, `relrowsecurity` en `pg_class`, grants de `anon`). | PASO HUMANO 1: Ejecutar `001_rls_por_usuario.sql` en Supabase SQL Editor y validar las 3 consultas de control. |
| **C3. Token Efímero (No exponer claves)** | DONE | Auditoría de arquitectura: el cliente (`public/gemini-live.js`) solo recibe tokens temporales o proxies y el servidor en `server.js` procesa las llamadas con SDK/fetch en el backend. Añadido test en `test/server.test.js` que inspecciona 10 endpoints principales asegurando en memoria que ninguna respuesta del servidor contenga los valores de `GEMINI_API_KEY` ni `OPENAI_API_KEY`. Test pasa en 1533 ms (`8 passing` en `server.test.js`). | Ninguno. |
| **C2. Uso Diario Persistente** | DONE | Los métodos `getDailyUsage` y `trackDailyUsage` en `lib/supabase.js` operan sobre la tabla `public.user_usage` y columnas `seconds_used` y `turns_count` con clave primaria `(user_id, usage_date)`. Creada migración idempotente `supabase/migrations/003_uso_diario.sql` con RLS estricto (`user_id = auth.uid()`). En caso de fallo o timeout de Supabase, `lib/limiter.js` retiene de forma defensiva la cuota en memoria local sin dejar el consumo sin límite. Añadido test en `test/limiter.test.js` que verifica conservación tras reinicio y resiliencia. | PASO HUMANO 2: Ejecutar migración `003_uso_diario.sql` en Supabase SQL Editor. |
| **C4. Persistencia Real en Producción** | DONE | En `server.js`, si `NODE_ENV=production` y falta la configuración de Supabase, el servidor aborta inmediatamente con exit code 1 y log fatal descriptivo. En `lib/store.js` y `lib/supabase.js`, el estado de XP, racha, tarjetas, errores, misiones y competencias se organiza por `user_id`. Añadidos tests en `test/isolation.test.js` verificando la negación de inicio en producción sin Supabase y la persistencia aislada de dos usuarios independientes tras reinicio del proceso. | Ninguno. |
| **C5. Modelos y Prueba de Humo** | DONE | Confirmación con documentación oficial de Google (https://ai.google.dev/gemini-api/docs/models y https://ai.google.dev/gemini-api/docs/live-api): los modelos anteriores (`gemini-2.0-flash` y `gemini-1.5-flash`) fueron reemplazados o retirados. Los modelos vigentes oficiales son `gemini-3.8-flash` (para interacciones y chat multimodal) y `gemini-3.8-live` (para WebSocket bidireccional en tiempo real). Actualizados defaults en `server.js`. Creado `scripts/smoke.js`. Al ejecutar en vivo con las claves configuradas: `gemini-3.8-flash` experimenta alta demanda temporal (HTTP 503) y OpenAI responde HTTP 429 por saldo agotado. Resultado real registrado sin simulación. | PASO HUMANO 3: Agregar créditos o verificar cuota activa de Gemini/OpenAI para ejecución de `node scripts/smoke.js` en verde. |
| **C7. Recuperación de Contraseña** | DONE | En `server.js`, la ruta `POST /api/auth/reset-password` implementa respuesta uniforme anti-enumeración (`"Si la cuenta existe, se ha enviado un enlace a tu correo para restablecer tu contraseña."`), sin revelar si el correo existe. Se añadieron limitadores de tasa por IP (`resetPasswordIpLimiter`) y por correo (`resetPasswordEmailLimiter`) de máx 5 peticiones por 15 min. Se documentó en `DEPLOYMENT.md` la adición obligatoria del dominio en la lista permitida de Redirect URLs de Supabase. Añadido test en `test/auth_supabase.test.js`. | PASO HUMANO 4: Probar en Supabase Auth el flujo de recuperación de contraseña con 3 correos reales (ej. Gmail, Outlook, corporativo). |
| **C6. Latencia Real** | NO VERIFICADO | Creado `scripts/latency-report.js` que inspecciona logs estructurados reales (`data/latency_logs.jsonl` o `client_turns.log`) y calcula promedio, p50 y p90 por tramos (STT, modelo, TTS, total) sin inventar datos. Al no haber logs de dispositivos móviles en el entorno de desarrollo, el script reporta fielmente "NO VERIFICADO". `lib/logger.js` fue actualizado para persistir logs automáticamente en `data/latency_logs.jsonl`. | PASO HUMANO 5: Ejecutar 20 turnos en celular real (Chrome Android y Safari iPhone) y correr `node scripts/latency-report.js`. |

---

## Decisiones Técnicas y Arquitectónicas
1. **Idempotencia de Migraciones SQL:** Todas las migraciones incluyen `DROP POLICY IF EXISTS` para garantizar que la ejecución repetida en el SQL Editor de Supabase no falle.
2. **Defensa en Profundidad contra Fuga de Credenciales:** `test/server.test.js` realiza comprobación en memoria de todas las respuestas públicas y de API contra los valores de entorno, bloqueando cualquier regresión que pudiera exponer secretos en cabeceras, JSON o texto.
3. **Guardia de Inicio en Producción:** Bloqueo explícito de ejecución en `NODE_ENV=production` sin credenciales de Supabase para erradicar cualquier riesgo de caída silenciosa a almacenamiento efímero local (`state.json`).
4. **Vigencia de Modelos Google Gemini 3.8:** Se migraron los valores por defecto a `gemini-3.8-flash` y `gemini-3.8-live` tras comprobar con la API oficial que la serie 2.0 y 1.5 ya no está disponible en `v1beta:generateContent`.
