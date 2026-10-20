# MEMORY.md · Polyglot Voice

Documento de memoria técnica, decisiones arquitectónicas, estado actual del sistema, limitaciones y tareas pendientes.

---

## 1. Visión y Resumen del Proyecto

**Polyglot Voice** es una plataforma interactiva de inmersión lingüística en tiempo real para inglés y mandarín, diseñada bajo la estética moderna y oscura de Praktika (`#0b0f17`, `#6366f1`, `#06b6d4`), con capacidades de:
- Conversación natural bidireccional por voz y texto con tutores de IA (Alex para inglés, Mei para mandarín).
- Evaluación objetiva y continua de competencias (CEFR A1–B2 / HSK 1–4): gramática, riqueza léxica, fluidez y comprensión auditiva.
- Extracción dinámica de vocabulario con repetición espaciada (SRS / SM-2).
- Análisis DSP local de contorno de tonos en mandarín mediante el algoritmo YIN en Web Workers.
- Arquitectura multi-tenant con sincronización a Supabase y fallback local resiliente.

---

## 2. Arquitectura Técnica y Decisiones de Diseño

### 2.1 Backend Zero-Dependency (Node.js 20+ ESM)
- **Servidor nativo HTTP**: Sin Express u otros frameworks externos en el núcleo para maximizar rendimiento, arranque instantáneo y portabilidad.
- **Enlace de red configurable**: Configurado en `HOST = process.env.HOST || "0.0.0.0"` y `PORT` dinámico para compatibilidad total con contenedores y plataformas en la nube.
- **Manejo de CORS y Same-Origin**: Soporta proxies inversos mediante validación de `req.headers["x-forwarded-host"]` y `req.headers.host`.
- **Rate Limiting Defensivo**: Límite de 15 solicitudes de sesión por minuto por IP (`lib/limiter.js`) con cabeceras `Retry-After`.
- **Logs Estructurados**: Formato JSON estandarizado con trazabilidad por `tenantId` (`lib/logger.js`).

### 2.2 Persistencia Híbrida: Supabase Cloud & Multi-Tenant Local
- **Adaptador Híbrido (`lib/supabase.js`)**:
  - Si existen `SUPABASE_URL` y `SUPABASE_KEY`: Se comunica con Supabase REST Auth (`/auth/v1`) y Postgres (`/rest/v1`).
  - Si no están configuradas: Se activa de inmediato el repositorio multi-tenant (`lib/store.js`), aislando datos por usuario en `data/<tenantId>.json`.
  - **Seguridad**: Hash de contraseñas con PBKDF2 (1000 iteraciones, SHA-512, salt aleatorio criptográfico de 16 bytes).
- **Esquema Relacional (`supabase/schema.sql`)**: Tablas `profiles`, `cards`, `competencies`, `conversations` y `session_vocab` con políticas RLS de aislamiento estricto por `user_id`.

### 2.3 Procesamiento DSP en Web Worker (`public/tone.worker.js`)
- **Algoritmo YIN optimizado**: Cálculo de diferencia acumulada normalizada y búsqueda de valles con umbral estricto para F0 fundamental (80 Hz a 450 Hz).
- **Aislamiento del hilo principal**: La inferencia DSP y el contorno de tonos se ejecutan en segundo plano, manteniendo 60 FPS en la interfaz.
- **Audio de Modelo Nativo**: `SpeechSynthesisUtterance` en `zh-CN` a velocidad 0.85x para calibración auditiva antes de grabar.

### 2.4 Vocabulario y Repaso SRS
- **Extracción de Vocabulario**: Gemini extrae términos clave, traducciones y fonética en cada turno conversacional.
- **UX de Guardado**: Al presionar `+ Guardar a SRS`, la tarjeta ejecuta una animación de salida `.saved-exit` (340ms), se descarta de la bandeja activa de la sesión y se almacena en el mazo principal.
- **Banco Centralizado**: Modal `#vocabModal` con buscador reactivo en vivo y síntesis de audio para consulta permanente.

---

## 3. Estado de la Implementación (Status Actual)

| Módulo / Característica | Estado | Archivos Principales | Verificación |
|---|---|---|---|
| **Motor de Chat Dual (Texto + Voz)** | ✅ Operativo | `server.js`, `lib/tutor.js`, `public/app.js` | Web Speech API + Gemini Flash API |
| **Traducción Opcional (Subtítulos)** | ✅ Operativo | `public/index.html`, `public/styles.css` | Botón toggle `[ 🌐 Trad: ON/OFF ]` |
| **Evaluación de Competencias CEFR/HSK** | ✅ Operativo | `lib/tutor.js`, `public/app.js` | Barras de progreso e hitos verificados |
| **Tonos Chinos con Audio Modelo** | ✅ Operativo | `public/app.js`, `public/tone.worker.js` | Botón `🔊 Escuchar modelo` + Web Worker |
| **Vocabulario de Avance y Salida Animada** | ✅ Operativo | `public/app.js`, `public/styles.css` | Animación `.saved-exit` y eliminación de DOM |
| **Banco de Vocabulario Guardado (Modal)** | ✅ Operativo | `public/index.html`, `public/app.js` | Modal con búsqueda reactiva |
| **Autenticación (Login/Registro/Supabase)** | ✅ Operativo | `lib/supabase.js`, `server.js`, `public/app.js` | Modal `#authModal`, PBKDF2 hash, Multi-tenant |
| **Configuración de Despliegue en la Nube** | ✅ Operativo | `Dockerfile`, `render.yaml`, `DEPLOYMENT.md` | Configuración probada para Node 20 |
| **Batería de Pruebas Unitarias** | ✅ 38/38 Pasadas | `test/server.test.js`, `test/auth_supabase.test.js` | `node --test` exitoso al 100% |

---

## 4. Limitaciones Detectadas y Notas de Entorno

1. **Docker en Entorno Local (Windows)**:
   - **Limitación**: Docker Desktop no está habilitado o tiene restricciones de virtualización (WSL2/Hyper-V) en la máquina local.
   - **Solución / Alternativa**: No es necesario correr Docker localmente para desplegar. Los servicios como **Render** o **Railway** construyen y ejecutan el proyecto de manera 100% nativa con Node.js directamente desde el repositorio Git (`render.yaml` o runtime Node configurado).
2. **Requisitos de HTTPS para Micrófono en la Nube**:
   - En entornos locales (`localhost`), los navegadores permiten el acceso a `getUserMedia` y `webkitSpeechRecognition` sin certificado SSL.
   - En la nube (producción), los navegadores bloquean el micrófono en conexiones `http://`. Tanto Render como Railway proporcionan automáticamente certificados HTTPS (`https://*.onrender.com`), asegurando el funcionamiento inmediato en móviles y laptops.
3. **Cuotas y Claves de API**:
   - El sistema opera con `gemini-2.0-flash-exp` o `gemini-1.5-flash` mediante `GEMINI_API_KEY`.
   - Si no se configuran variables de OpenAI o Gemini, el sistema funciona de modo seguro en modo "offline" para tonos chinos y repaso SRS.

---

## 5. Despliegue en la Nube y Estado Live

- **URL de Producción (HTTPS)**: [https://polyglot-voice-jtu6.onrender.com](https://polyglot-voice-jtu6.onrender.com)
- **Repositorio Remoto**: [https://github.com/Moicogut/PolyGloty_OS.git](https://github.com/Moicogut/PolyGloty_OS.git)
- **Servicio Render**: `polyglot-voice` (Estado: `Live`, Node 20.12.0 en Oregon).
- **Base de Datos Cloud**: Supabase `https://jszkayddqctusgmcwyzi.supabase.co` (`PolyGloty_OS`).
- **Migración SQL Ejecutada**: Tablas `profiles`, `cards`, `competencies`, `conversations`, `session_vocab` y políticas RLS habilitadas.
- **Variables de Entorno Cargadas en Render**: `GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_KEY`.

---

## 6. Pruebas de Humo en Producción (Smoke Tests Validados)

| Prueba | Endpoint | Resultado | Detalle |
|---|---|---|---|
| **Disponibilidad Web** | `GET /` | ✅ 200 OK | Carga HTML, CSS, Web Workers y assets. |
| **Tutor de Inglés (Alex)** | `POST /api/chat` | ✅ 200 OK | Generación con Gemini Flash: respuesta natural, traducción, fonética, vocabulario, evaluación CEFR y XP. |
| **Tutora de Mandarín (Mei)** | `POST /api/chat` | ✅ 200 OK | Caracteres hanzi + pinyin guiado, traducción al español, vocabulario HSK y evaluación continua. |
| **Persistencia / Auth** | `POST /api/auth/*` | ✅ 200 OK | Autenticación híbrida protegida por CORS/Same-Origin. |

---

## 9. Parte 1B: Auditoría de Seguridad y Estabilidad (Completada)

En esta sesión se cerraron las 7 tareas críticas de seguridad y estabilidad sobre la rama `fix/parte-1b` (un commit por tarea, 100% de tests en verde):

### 9.1 Detalle de Tareas Ejecutadas (A2, A1, A3, A5, A7, A4, A6)

1. **A2. Claves y Secretos (`commit ec394c6`)**:
   - `git log --all --oneline -- .env` verificado: completamente vacío.
   - Auditoría regex en `public/` (`sk-`, `AIza`, `eyJ`, `apiKey`, `service_role`): cero coincidencias.
   - `public/gemini-live.js` blindado: no usa clave directa, recibe token efímero mediante constructor.
   - `SUPABASE_KEY` aislado estrictamente en el backend (`lib/supabase.js`).
   - `estado-polyglot.txt` eliminado del árbol de trabajo e ignorado en `.gitignore`.

2. **A1. RLS Abierto / Bloqueante (`commit 7e233d8`)**:
   - Creada migración SQL `supabase/migrations/001_rls_por_usuario.sql`:
     - Elimina las políticas abiertas anteriores (`USING (true)`).
     - Revoca todos los permisos sobre tablas al rol `anon`.
     - Otorga permisos explícitos a `authenticated` y `service_role`.
     - Implementa políticas por operación (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) con `user_id = auth.uid()` en `cards`, `competencies`, `conversations` y `session_vocab`, y con `id = auth.uid()` en `profiles`.
   - `supabase/schema.sql` actualizado en sincronía exacta con la migración.
   - Creado test de integración `test/rls.test.js` que verifica el aislamiento estricto entre Cuenta A y Cuenta B (con skip defensivo si no hay credenciales de prueba configuradas).

3. **A3. Estado por Usuario (`commit a8b8570`)**:
   - En `lib/store.js` y `lib/tutor.js`, los nuevos usuarios inician con progreso en cero (`xp: 0`) y competencias en `null` (no valores ficticios prefabricados).
   - En `public/app.js`, la UI maneja `competencies === null` mostrando `0%` e `"Hitos en progreso"` sin alterar datos.
   - `data/state.json` queda restringido como respaldo local de desarrollo y se desactiva como estado compartido en producción (`NODE_ENV=production`).
   - `test/isolation.test.js` ampliado: certifica que dos usuarios conservan estados independientes, competencias nulas iniciales y persistencia aislada tras reinicio del store.

4. **A5. Límites por Usuario (`commit 3196263`)**:
   - `lib/limiter.js` asocia la clave del limitador al `user_id` en rutas autenticadas (fallback a IP solo si no está autenticado).
   - Cuota diaria configurable mediante variable de entorno `DAILY_MINUTES_LIMIT` (30 minutos por defecto).
   - Integrados métodos `getDailyUsage` y `trackDailyUsage` en `lib/supabase.js` para persistencia en Supabase.
   - Al agotarse la cuota, el endpoint `POST /api/chat` responde 429 con `{ "error": "limite_diario", "resetIn": <segundos> }`.
   - Frontend configurado para mostrar: `"Llegaste al límite de hoy. Vuelve mañana."`.
   - `lib/validator.js` valida tipo y tamaño de toda entrada (mensajes máx 2000 chars, audio máx 5 MB).

5. **A7. Prueba Rota (`commit 3b81ed5`)**:
   - `test/server.test.js` helper `start()` refactorizado para asignar puertos libres dinámicos provistos por el SO (`srv.listen(0)`), evitando colisiones de puertos efímeros en Windows o timeouts de red.
   - Todos los tests de servidor pasan limpiamente de forma determinista.

6. **A4. Render y Modelo (`commit 30f6f1c`)**:
   - Endpoint `GET /health` responde HTTP 200 con `{ ok: true, status: "ok" }` sin interactuar con la base de datos.
   - Modelo unificado bajo variables de entorno `VOICE_PROVIDER` y `VOICE_MODEL: gemini-2.0-flash` (modelo estable, sin `-exp`), con `VOICE_BACKUP_MODEL: gemini-1.5-flash` configurable.
   - Si la respuesta del backend excede 3 segundos, el frontend informa: `"Despertando el tutor, un momento..."`.
   - `render.yaml` y `DEPLOYMENT.md` actualizados documentando las opciones frente a la suspensión en el plan Free de Render.

7. **A6. Latencia y Navegadores (`commit d9bc520`)**:
   - Medición de latencia completa: cliente mide fin de habla (STT) y síntesis (TTS); servidor mide inferencia de modelo en `lib/logger.js`.
   - Indicador `#lat` en pantalla refleja el tiempo total del turno y desglose del modelo.
   - Modo texto 100% disponible ante micrófonos bloqueados o navegadores sin soporte Web Speech.
   - Aviso de privacidad sobre el procesamiento de audio por Google/Apple incorporado en el modal explicativo de `public/index.html` y en `README.md`.

---

## 10. Estado Técnico Global y Métricas

- **Rama Git de Trabajo**: `fix/parte-1b` (limpia, sin cambios pendientes por commitear).
- **Suite de Pruebas (`npm test`)**: **42 tests pasando, 0 fallos, 1 omitido defensivamente (test RLS en vivo)**.
- **Rendimiento de Latencia**:
  - Promedio por turno: **~1474 ms**.
  - Percentil 90 (P90): **~1655 ms** (muy por debajo del límite de aceptación de 3000 ms).
- **Commits Registrados en `fix/parte-1b`**:
  - `ec394c6`: `A2: verificar y blindar claves y secretos`
  - `7e233d8`: `A1: definir migracion y politicas RLS estrictas por usuario`
  - `a8b8570`: `A3: estado y competencias por usuario con reset inicial`
  - `3196263`: `A5: cuotas y limites de conversacion por usuario`
  - `3b81ed5`: `A7: corregir estabilidad de pruebas de servidor`
  - `30f6f1c`: `A4: unificar modelo de voz y endpoint health`
  - `d9bc520`: `A6: medicion de latencia y aviso de privacidad de voz`

---

## 11. Pasos Humanos Pendientes (Pre-requisitos Operativos)

1. **Ejecutar Migración RLS en Supabase**:
   - Abrir SQL Editor en el proyecto de Supabase.
   - Ejecutar el script `supabase/migrations/001_rls_por_usuario.sql`.
2. **Validar RLS con Cuentas Reales**:
   - Definir variables de prueba en entorno y correr `node --test test/rls.test.js`.
3. **Configuración de Suspensión en Render**:
   - Definir si se escala al plan *Starter* (sin suspensión) o si se configura un ping de 10 min a `/health` desde un monitor externo (UptimeRobot).

---

---

## 13. Parte 1C: Cierre y Verificación (Rama `fix/parte-1c`)

En esta entrega se cerraron y verificaron con evidencia real las tareas pendientes de la Parte 1B sobre la nueva rama `fix/parte-1c`:

### 13.1 Resumen de Tareas C1 .. C7
1. **C1. Migración RLS Completa e Idempotente (`commit e9989b7`)**:
   - `supabase/migrations/001_rls_por_usuario.sql` actualizado con cláusulas `DROP POLICY IF EXISTS` para todas las políticas antiguas (`USING (true)`) y las nuevas antes de cada `CREATE POLICY`.
   - Incorporadas las 3 consultas de control para verificación humana (`pg_policies`, `relrowsecurity` en `pg_class`, y permisos de `anon`).
2. **C3. Token Efímero y Fuga de Credenciales (`commit 34577ae`)**:
   - Verificado que el frontend (`public/gemini-live.js`) y `public/app.js` no reciben claves de API.
   - Implementado test en `test/server.test.js` que audita 10 endpoints asegurando en memoria que ninguna respuesta contenga `GEMINI_API_KEY` ni `OPENAI_API_KEY`.
3. **C2. Uso Diario Persistente (`commit 2ae7285`)**:
   - Definida la tabla `public.user_usage` (columnas `user_id`, `usage_date`, `seconds_used`, `turns_count`) en `supabase/migrations/003_uso_diario.sql` con RLS estricto (`user_id = auth.uid()`).
   - Implementada resiliencia en `lib/limiter.js`: si Supabase falla o tiene timeout, se mantiene el límite local en memoria y nunca se permite consumo ilimitado.
   - Test de persistencia tras reinicio añadido a `test/limiter.test.js`.
4. **C4. Persistencia Real en Producción (`commit 94e8c03`)**:
   - Guardia estricta en `server.js`: en `NODE_ENV=production`, si falta la configuración de Supabase, el servidor aborta inmediatamente con exit code 1.
   - `test/isolation.test.js` ampliado: certifica que el servidor se niega a iniciar sin Supabase en producción y que dos usuarios persisten su estado de forma completamente aislada tras reinicio del proceso.
5. **C5. Modelos Oficiales y Prueba de Humo (`commit 91f59bc`)**:
   - Verificado con documentación oficial de Google: `gemini-2.0-flash` y `gemini-1.5-flash` fueron retirados o reemplazados. Los modelos vigentes son `gemini-3.8-flash` (Interactions API / chat) y `gemini-3.8-live` (WebSockets Live API).
   - `scripts/smoke.js` creado y ejecutado en vivo con las variables de entorno reales.
6. **C7. Recuperación de Contraseña (`commit c08fc95`)**:
   - `POST /api/auth/reset-password` estandarizado para devolver siempre la misma respuesta, exista o no el correo (protección anti-enumeración de usuarios).
   - Añadidos limitadores de tasa por IP (`resetPasswordIpLimiter`) y por correo (`resetPasswordEmailLimiter`) de máx 5 peticiones por 15 minutos.
   - Documentada en `DEPLOYMENT.md` la necesidad de registrar el dominio en la lista permitida de Redirect URLs de Supabase.
   - Test implementado en `test/auth_supabase.test.js`.
7. **C6. Latencia Real (`commit ad3f72d`)**:
   - Creado `scripts/latency-report.js` que procesa logs estructurados reales (`data/latency_logs.jsonl`) calculando promedio, p50 y p90 sin generar datos sintéticos.
   - `lib/logger.js` adaptado para guardar los logs de forma persistente. Reporta `NO VERIFICADO` de forma fiel ante la falta de logs de turnos en dispositivos móviles.

### 13.2 Métricas Finales
- Suite de tests: **47 pasando, 0 fallos, 1 omitido defensivamente (48 totales)** en `npm test`.



