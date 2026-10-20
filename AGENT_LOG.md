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
| **A5. Límites por Usuario** | PENDIENTE | Por enlazar `DAILY_MINUTES_LIMIT` con user_id. | Ninguno. |
| **A7. Prueba Rota** | PENDIENTE | Verificado: test de endpoints y validación defensiva pasando 41/41. | Ninguno. |
| **A4. Render y Modelo** | PENDIENTE | Por auditar modelo no experimental y timeout de 3s. | Decisión de plan en Render o cron ping a `/health`. |
| **A6. Latencia y Navegadores** | PENDIENTE | Por agregar advertencia de privacidad para proveedores Web Speech. | Ninguno. |

---

## Registro Detallado por Tarea

*(Se actualizará iteración por iteración)*
