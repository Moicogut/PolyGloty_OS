# Registro de Ejecución Agéntica · Polyglot Voice Parte 1B

## Línea Base Inicial (Paso 0)
- **Rama activa:** `fix/parte-1b`
- **Resultado inicial de tests (`npm test`):** 41 de 41 tests pasando (100% verde).
- **Entorno de ejecución:** Node.js v24.18.1, Windows, Common/ES Modules.

---

## Tabla de Seguimiento de Tareas

| Tarea | Estado | Evidencia | Pendiente Humano |
|---|---|---|---|
| **A2. Claves y Secretos** | DONE | `git log --all -- .env` vacío. `grep` en `public/` (sk-, AIza, eyJ, apiKey, service_role) = 0 hallazgos. `gemini-live.js` solo recibe token efímero vía constructor. `SUPABASE_KEY` solo opera en `lib/supabase.js` en backend. `estado-polyglot.txt` eliminado y añadido a `.gitignore`. `npm test` verde (41/41). | Ninguno. Claves seguras en servidor. |
| **A1. RLS Abierto (Bloqueante)** | DONE | Creada migración `supabase/migrations/001_rls_por_usuario.sql` revocando `anon`, asignando políticas por operación (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) con `auth.uid() = user_id`. `supabase/schema.sql` sincronizado. `test/rls.test.js` implementado con skip defensivo ante ausencia de credenciales. `npm test` verde (41 passing, 1 skipped). | PASO HUMANO: Ejecutar `001_rls_por_usuario.sql` en SQL Editor de Supabase y correr `test/rls.test.js` con 2 cuentas de prueba. |
| **A3. Estado por Usuario** | DONE | `lib/store.js` ajustado: nuevos usuarios inician con XP=0 y competencias en `null` (no valores ficticios). `data/state.json` queda restringido como fallback de desarrollo local y deshabilitado como estado global compartido en producción (`NODE_ENV=production`). `test/isolation.test.js` ampliado verificando que dos usuarios conservan estados independientes, competencias nulas al inicio y persistencia aislada tras reinicio de store. `npm test` verde (41 passing, 1 skipped). | Ninguno. |
| **A5. Límites por Usuario** | DONE | Clave de limitador asociada a `user_id` en rutas autenticadas (fallback IP). Integrada cuota configurable `DAILY_MINUTES_LIMIT` (30 min por defecto) en `lib/limiter.js` y sincronizada en Supabase con `getDailyUsage`/`trackDailyUsage`. Al agotarse cuota responde 429 con `{ "error": "limite_diario", "resetIn": <segundos> }`. Frontend adaptado mostrando `"Llegaste al límite de hoy. Vuelve mañana."`. Validadas entradas texto/audio con `lib/validator.js`. `npm test` verde (41 passing, 1 skipped). | Ninguno. |
| **A7. Prueba Rota** | DONE | `test/server.test.js` helper `start()` actualizado con `getFreePort()` (puerto 0 del SO) para eliminar riesgos de colisión de puertos efímeros en Windows o timeouts de undici. Todos los 6 tests de `server.test.js` pasan limpiamente de forma determinista (41 passing, 1 skipped global). | Ninguno. |
| **A4. Render y Modelo** | DONE | Endpoint `GET /health` responde 200 con `{ ok: true, status: "ok" }` sin tocar DB (test añadido a `server.test.js`). Modelo unificado con `VOICE_PROVIDER` y `VOICE_MODEL: gemini-2.0-flash` estable (sin `-exp`) y `VOICE_BACKUP_MODEL: gemini-1.5-flash` configurable. Frontend muestra `"Despertando el tutor, un momento..."` tras 3 s de espera. Documentadas opciones de suspensión en `DEPLOYMENT.md`. `npm test` verde (42 passing, 1 skipped). | PASO HUMANO: Decidir en Render si cambiar a plan Starter o configurar monitor de 10 min a `/health`. |
| **A6. Latencia y Navegadores** | PENDIENTE | Por agregar advertencia de privacidad para proveedores Web Speech. | Ninguno. |

---

## Registro Detallado por Tarea

*(Se actualizará iteración por iteración)*
