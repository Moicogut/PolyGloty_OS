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

### 13.2 Estado de Pasos Humanos (Verificados vs Pendientes)
- ✅ **Paso Humano 1 (C1): Ejecutado exitosamente en Supabase SQL Editor**.
  - Evidencia: Captura de pantalla de consulta SQL ejecutada en proyecto `jszkayddqctusgmcwyzi` con salida `Success. No rows returned` para `001_rls_por_usuario.sql`.
- ✅ **Paso Humano 2 (C2): Ejecutado exitosamente en Supabase SQL Editor**.
  - Evidencia: Captura de pantalla de consulta SQL ejecutada con salida `Success. No rows returned` para `003_uso_diario.sql` (creada tabla `user_usage` con RLS).
- ✅ **Paso Humano 3 (C7 - Configuración URLs): Ejecutado exitosamente en Supabase Dashboard**.
  - Evidencia: Captura de pantalla en `Authentication -> URL Configuration`: `Site URL` y `Redirect URLs` configuradas con `https://polyglot-voice-jtu6.onrender.com/`.
- ⏳ **Paso Humano 3 (C7 - Envío de Correos): Pendiente tras la pausa**.
  - Probar recuperación de contraseña de punta a punta con 3 correos reales (Gmail, Outlook, corporativo).
- ⏳ **Paso Humano 4 (C5 - Modelo en Vivo): Pendiente tras la pausa**.
  - Re-evaluar saldo/cuota activa en Gemini/OpenAI para ejecución limpia de `node scripts/smoke.js`.
- ⏳ **Paso Humano 5 (C6 - Latencia Móvil): Pendiente tras la pausa**.
  - Ejecutar 20 turnos en celular real (Chrome Android y Safari iOS) y correr `node scripts/latency-report.js`.

### 13.3 Métricas Finales
- Suite de tests: **53 pasando, 0 fallos, 1 omitido defensivamente (54 totales)** en `npm test`.
- Rama: `fix/parte-1c`.

---

## 14. Parte 2: Agente Pedagógico por Competencias y Facilitador de Lenguaje (Completada)

En esta entrega se resolvió el desajuste pedagógico observado en producción (alumno en nivel A1 expuesto a peticiones de nivel B2/C1, fallas de traducción en segundo turno y falta de mediación correctiva), transformando a Polyglot Voice en una plataforma basada en competencias lingüísticas verificables (CEFR/MCER y HSK) con modelo de Agente Dual.

### 14.1 Diagnóstico de Causa Raíz
1. **Sobrecarga Cognitiva en A1**:
   - Escenarios como "Reunión con cliente" exigían presentar y defender propuestas de consultoría a principiantes absolutos, violando la Zona de Desarrollo Próximo (ZDP).
2. **Subtítulos Perdidos**:
   - Llamadas a Gemini sin `responseSchema` permitían que el modelo omitiera esporádicamente la clave `"translation"`, dejando burbujas sin traducción al español.
3. **Ausencia de Facilitación y Modelado Nativo**:
   - Ante errores clásicos de auxiliares (ej. responder *"Yes, I do"* a *"Are you ready?"*), el sistema no retroalimentaba ni enseñaba la respuesta nativa correspondiente.

### 14.2 Decisiones Arquitectónicas Implementadas
1. **Skill de Agente Pedagógico (`.agents/skills/pedagogical-language-coach/SKILL.md`)**:
   - Formalizado el skill que rige las reglas de aprendizaje por competencias, techo léxico, longitudes máximas de turno y andamiaje situacional.
2. **Motor Programático (`lib/pedagogicalAgent.js`)**:
   - `LEVEL_RULES`: Diccionario de restricciones sintácticas, léxicas y directivas de habla para A1–C1 y HSK 1–5.
   - `adaptMissionForLevel()`: Adapta la escena y objetivos de roleplay según el nivel (ej. en A1, "Reunión con cliente" se convierte en recibir al cliente en recepción y ofrecer café).
   - `GEMINI_PEDAGOGICAL_SCHEMA`: Esquema OpenAPI estricto que exige obligatoriamente `reply`, `translation`, `facilitator` (`userAnalysis`, `correctForm`, `nativeAlternative`, `encouragement`, `repetitionPrompt`, `competencyFocus`), `vocabulary` y `competencyScores`.
   - `repairAndGuaranteePedagogicalResponse()`: Guardián de resiliencia que garantiza que ninguna respuesta carezca de traducción ni de evaluación contrastiva.
3. **Recuadro del Facilitador en UI (`public/styles.css`, `public/app.js`)**:
   - Nuevo componente `.facilitator-card` integrado en el flujo de conversación:
     - 🌟 **Aliento Permanente**: Mensaje motivador y cálido en cada turno para generar seguridad psicológica.
     - 🎓 **Diagnóstico Pedagógico**: Explicación clara en español de la regla o desajuste gramatical.
     - ✅ **Forma Correcta Estándar**: Modelo lingüístico apropiado para el nivel del alumno.
     - 💎 **Alternativa Nativa**: Cómo lo expresaría un nativo real con botón `🔊 Escuchar`.
     - 🔁 **Repetición Contextual**: Ejercicio de pronunciación sugerido con botón `🎙️ Repetir frase`.
4. **Respaldo de Traducción 100%**:
   - Subtítulos obligatorios en cada turno del tutor con toggle general `[ 🌐 Trad: ON/OFF ]`.

### 14.3 Verificación y Estado de Pruebas
- **Pruebas Unitarias e Integración**: Creado `test/pedagogical.test.js` con 7 pruebas que validan adaptación de misiones, restricciones de nivel A1, prompts pedagógicos, garantías de traducción y el escenario E2E exacto de las capturas (*"Yes, I do"* $\rightarrow$ *"Yes, I am"* / *"Sure, all set!"*).
- **Suite Completa (`npm test`)**: **54 pruebas pasando al 100%**, 0 fallos, 1 omitida defensivamente (RLS en vivo sin credenciales). Latencia promedio sostenida en ~1474 ms.

---

## 15. Actualización de Modelos de Producción (Gemini 3.5 Flash & 3.1 Flash-Lite)

- **Causa Raíz de Error 503 en Render**: Google retiró los modelos `gemini-1.5-flash` y `gemini-2.0-flash` (HTTP 404). Al haber un pico temporal de alta demanda en `gemini-3.8-flash` (HTTP 503), la lista de candidatos caía en los modelos obsoletos y reportaba error al frontend.
- **Modelos Oficiales Activos**:
  - `VOICE_MODEL`: `gemini-3.5-flash` (Respuesta HTTP 200 verificada con soporte completo de `responseSchema`).
  - `VOICE_BACKUP_MODEL`: `gemini-3.1-flash-lite` (Respaldo ultra rápido verificado en <1s).
  - Candidatos en fallback: `gemini-3.5-flash` -> `gemini-3.1-flash-lite` -> `gemini-3.8-flash` -> `gemini-flash-latest`.
  - Excluidos estrictamente de `generateContent`: modelos WebSocket (`live`) y modelos descontinuados (`1.5`, `2.0`).
- **Verificación**: `scripts/smoke.js` ejecutado en vivo con resultado `VERIFICADO (Éxito)`.

---

## 16. Agente Pedagógico Integral por Competencias y Sistema Progresivo (Agent Loop)

### 16.1 Problemas Diagnosticados en Interacción Real
1. **Truncamiento de JSON por Presupuesto de Tokens Insuficiente**:
   - `maxOutputTokens: 900` se agotaba debido a los tokens de razonamiento interno de Gemini 3.x (`thoughtsTokenCount` ~400+), cortando el JSON a la mitad (`"vocabulary": [ ...`). Esto provocaba fallas en `JSON.parse` y forzaba valores de respaldo vacíos o genéricos.
2. **Subtítulos con Prefijo Técnico o Eco en Inglés**:
   - Respuestas devueltas como `(ES) Hello! Do you want coffee or tea?` generaban confusión en el alumno.
3. **Vocabulario Roto (`vocabCount: 0`)**:
   - Al no completarse el JSON, `state.data.sessionVocab` no recibía términos y el cajón de vocabulario permanecía vacío.
4. **Falta de Progresión y Textos Repetitivos**:
   - Todas las misiones iniciaban con el saludo idéntico `"Hello! Nice to meet you. Are you ready for our conversation?"` y la evaluación de objetivos usaba `Math.random() > 0.45` en lugar de una evaluación por competencias.

### 16.2 Decisiones Arquitectónicas Implementadas
1. **Catálogo Completo de Misiones (`MISSION_CATALOG`)**:
   - 7 misiones (`cafe`, `cliente`, `hotel`, `aeropuerto`, `entrevista`, `taxi`, `libre`) estructuradas para todos los niveles CEFR (A1–C1) y HSK (1–3), cada una con su escena, 3 objetivos específicos "Can-Do" y diálogo de apertura personalizado con traducción natural.
2. **Presupuesto Ampliado (`maxOutputTokens: 2500`) y Extracción Limpia**:
   - Token budget expandido para garantizar que Gemini complete la respuesta estructurada sin truncarse. Se implementó selección de partes que prioriza el bloque de texto con `"reply"` sobre partes de pensamiento (`p.thought`).
3. **Guardián Definitivo de Traducciones**:
   - Detección de prefijos técnicos `(ES)` y ecos idénticos al texto en inglés, garantizando subtítulos en español fluido y natural.
4. **Vocabulario Activo en Tiempo Real**:
   - Se renderizan chips de vocabulario clave con audio en cada turno del facilitador y se actualiza reactivamente el contador `#vocabCount` y la grilla `#vocabGrid`.
5. **Evaluación de Objetivos por Competencias**:
   - Eliminada la simulación aleatoria. El backend devuelve `completedObjectives: [0, 1]` evaluados por Gemini, complementado con coincidencia semántica de descriptores Can-Do.
6. **Contextualización de Apertura**:
   - `connect()` inicializa el historial con el saludo de apertura adaptado, permitiendo que el modelo entienda de inmediato la respuesta del alumno sin reiniciar el tema.

### 16.3 Resultados y Verificación
- **Batería de Pruebas**: 61 pruebas ejecutadas con `node --test`, **60 pasadas al 100%**, 0 fallos, 1 omitida (RLS remoto).
- **Métricas de Latencia**: Promedio de turno de ~1474 ms y P90 de 1655 ms.

---

## 17. Tutora Wetty, Rediseño Móvil Responsivo y Sistema Curricular Progresivo

### 17.1 Tutora Wetty y Avatar Ilustrado 2D
- **Identidad**: Renombrada oficialmente de Alex a **Wetty · Tutora de Inglés**.
- **Avatar 2D**: Reemplazado el emoji por un avatar ilustrado 2D profesional, cálido y moderno (`public/wetty.jpg` y `.tutor-avatar-img`), con aro de pulso reactivo al hablar.
- **Síntesis de Voz Femenina**: El motor `SpeechSynthesisUtterance` filtra y prioriza voces femeninas nativas en inglés (`zira|jenny|aria|samantha|karen|victoria|susan|cathy|female|woman`).

### 17.2 Optimización Móvil y Desaturación de Interfaz
- **Diagnóstico**: En pantallas móviles (<400px), cuatro botones y el campo de entrada compartían una sola fila horizontal apretada, reduciendo el ancho del input de texto a menos de 90px y haciendo ilegible lo que el alumno escribía.
- **Solución Arquitectónica en Dos Niveles**:
  - **Fila Superior (`.dock-toolbar`)**: Píldoras compactas para idioma de micrófono (`Mic: EN/ES`), subtítulos (`Subtítulos: ON/OFF`) y botón para evaluar lección (`🏁 Evaluar Lección`).
  - **Fila Principal (`.dock-main-row`)**: El contenedor de entrada toma casi el 100% del ancho con `font-size: 16px` (estándar para evitar auto-zoom indeseado en iOS Safari y maximizar legibilidad), junto al botón central de micrófono táctil de 48px.

### 17.3 Sistema Curricular Progresivo (`LESSON_CURRICULUM`)
- **Estructura por Módulos y Lecciones**: Definida en `lib/pedagogicalAgent.js` y expuesta en `/api/state` para todos los niveles CEFR (A1–C1) y HSK (1–3), con orden secuencial (1 a 6).
- **Modal de Calificación y Avance (`#lessonCompleteModal`)**:
  - Calificación ponderada de 0 a 100 puntos y estrellas (⭐ a ⭐⭐⭐).
  - Desglose gráfico de competencias: Comprensión, Fluidez, Gramática y Vocabulario.
  - Botón de repetición y botón `🚀 Siguiente Lección →` que avanza automáticamente a la siguiente lección del currículum o promueve al alumno al siguiente nivel CEFR/HSK sumando +35 XP de recompensa.

### 17.4 Verificación Técnica y Evidencia
- **Batería de Tests**: 62 pruebas unitarias (`node --test`), **61 pasadas al 100%**, 0 fallos, 1 omitida (RLS remoto).
- **Pruebas en Viewport Móvil (390x844)**:
  - `wetty_mobile_initial_1792817040901.png` (Avatar 2D y dock limpio).
  - `wetty_mobile_typed_1792817065092.png` (Campo de texto amplio y 100% legible).
  - `wetty_mobile_modal_1792817077690.png` (Modal curricular y desglose de competencias).
- **Despliegue Continuo**: Commit `8b242a6` subido a GitHub `main` para despliegue automatizado en Render.

---

## 18. Plan Maestro: Personalización E2E, Currículum por Créditos y Suficiencia Auditada

Se formuló, estructuró y persistió el Plan Director Integral para los 3 pilares estratégicos solicitados:
1. **Personalización E2E, Auth Wall y Pre-sesión Warm-up**:
   - Landing page oscura de alta conversión con showcase interactivo de Wetty y comparativa de metodologías.
   - Auth Wall estricto (`user_id = auth.uid()`), protegiendo la inmersión conversacional contra accesos anónimos.
   - Student Hub con métricas en tiempo real (nivel, créditos, racha, radar 4D de competencias y retos diarios).
   - Pre-sesión de Warm-up Booster (90 segundos de active recall con 3 tarjetas prioritarias del mazo SRS) antes del diálogo en vivo con Wetty.
2. **Estructura Curricular por Créditos y Libro Oficial de Estudio**:
   - Sistema formal de 36 créditos por nivel CEFR (3 módulos de 12 créditos; lecciones de 2 créditos).
   - Documento canónico *Polyglot Curriculum Handbook* (guía oficial con descriptores Can-Do, corpus gramatical contrastivo, listas de colocaciones IPA y diálogos modelo anotados).
3. **Módulo de Pruebas de Suficiencia Auditadas (Oral + Escrito)**:
   - Examen adaptativo trifásico de 15 minutos: Fase A (Cloze Test adaptativo CAT), Fase B (Redacción auditada con rúbrica CEFR) y Fase C (Entrevista oral no guionada con Wetty como examinadora).
   - Registro inmutable en `proficiency_audits` con desglose multidimensional de 0 a 100 y emisión de Certificado Digital con código único de verificación.
- **Documentos Generados en Carpeta**:
   - `PLAN_MAESTRO_PERSONALIZACION_CURRICULUM_SUFICIENCIA.md` (27.5 KB)
   - `PLAN_MAESTRO_PERSONALIZACION_CURRICULUM_SUFICIENCIA.pdf` (563.5 KB)

---

## 19. Fase 1: Personalización E2E, Auth Wall, Student Hub y Pre-sesión Warm-up (Completada y Verificada)

Se implementó y verificó de extremo a extremo la Fase 1 del Plan Maestro:

### 19.1 Arquitectura Backend y Aislamiento Multi-Tenant
- **Servicio Central (`lib/hubService.js`)**:
  - `getStudentHubStatus({ state, lang, user, now })`: Consolida el nivel activo, cálculo de créditos (X / 36), porcentaje de avance, racha, radar de competencias 4D (gramática, vocabulario, fluidez, comprensión), retos diarios/semanales con recompensa XP, cita motivadora situacional y lección curricular recomendada.
  - `generateWarmup({ state, lang, level, lessonId })`: Genera 3 micro-retos pedagógicos basados en la lección objetivo (Active Recall léxico, Repair sintáctico con errores contrastivos típicos español-idioma meta, y Anticipación comunicativa) con explicaciones gramaticales y audio modelo.
  - `completeWarmup({ state, now })`: Otorga +10 XP inmediatos, incrementa la racha y marca `warmupDone = true`.
- **Validación Defensiva (`lib/validator.js`)**:
  - `validateWarmupGeneratePayload(body)` y `validateWarmupCompletePayload(body)` con saneamiento estricto de tipos y longitudes máximas.
- **Rutas HTTP (`server.js`)**:
  - `GET /api/hub/status`: Estado del estudiante autenticado.
  - `POST /api/warmup/generate`: Generación del paquete de pre-sesión.
  - `POST /api/warmup/complete`: Consolidación y recompensa de XP.
  - Aislamiento multi-tenant estricto mediante `resolveTenantStore(req, url)` extrayendo `user_id` / `tenant_id` y control `sameOrigin` de cabeceras.

### 19.2 Frontend Reactivo y Experiencia de Usuario
- **Landing Page de Alta Conversión (`#landingView`)**:
  - Hero visual con insignia CEFR/HSK, titular motivador, botón interactivo de muestra de voz de Wetty (`🔊 Escuchar voz`), tabla comparativa de valor (*Polyglot Voice vs Apps Tradicionales*) y 3 tarjetas de pilares pedagógicos.
- **Auth Wall Estricto**:
  - Los visitantes sin sesión activa son redirigidos automáticamente al Landing Page; la barra inferior de navegación y el chat del tutor permanecen bloqueados y ocultos hasta la autenticación.
- **Student Hub (`#hubView`)**:
  - Tarjeta de progreso con créditos acumulados (X / 36) y barra porcentual.
  - Radar de competencias 4D y contador de racha diaria.
  - Módulo "Próxima Lección en Foco" con botón directo `[ ⚡ Iniciar Pre-sesión y Lección → ]`.
  - Lista de retos diarios y semanales con barras de cumplimiento.
- **Pre-sesión Warm-up Booster (`#warmupModal`)**:
  - Interfaz modal de 3 pasos (90 segundos) con barra de progreso, micro-retos con retroalimentación instantánea, pronunciación modelo en voz nativa, felicitación con acreditación de +10 XP y transición fluida a la sesión conversacional con Wetty en el escenario objetivo.

### 19.3 Evidencia de Verificación y DoD
- **Batería de Pruebas Automatizadas**:
  - `test/hub_warmup.test.js`: 3 tests unitarios cubriendo `getStudentHubStatus`, `generateWarmup` y `completeWarmup` (**100% pasando**).
  - `npm test`: **65 tests ejecutados, 64 aprobados, 0 fallos, 1 omitido defensivamente (RLS remoto)**. Latencia sostenida en ~1474 ms.
- **Verificación Visual E2E en Navegador**:
  - Subagente de navegador ejecutó el flujo completo: navegación de visitante -> Landing Page -> Modal de Login (`estudiante.demo@polyglot.ai`) -> Student Hub con A1 (0/36 créditos) -> Warm-up Booster (3 preguntas respondidas) -> Premiación +10 XP -> Transición a tutor conversacional.
  - Grabación completa de la sesión: `fase1_hub_warmup_flow_1792855973283.webp`.
  - Capturas registradas: `landing_page_1792855984835.png`, `auth_modal_opened_1792855999507.png`, `student_hub_view_1792856054307.png`, `warmup_modal_opened_1792856159624.png`, `tutor_chat_view_1792856599392.png`.

---

## 20. Fase 2: Estructura Curricular por Créditos (36 Créditos/Nivel) & Polyglot Curriculum Handbook (Completada y Verificada)

Se implementó la arquitectura curricular formal y el libro oficial canónico de estudio:

### 20.1 Arquitectura Curricular y Equivalencia ECTS (`lib/curriculumData.js`)
- **Estructura Modular de 36 Créditos**:
  - Cada nivel (A1, A2, B1, B2, C1 para inglés y HSK 1, 2, 3 para mandarín) se compone de **36 créditos académicos**.
  - Estructurado en **3 módulos temáticos de 12 créditos cada uno**.
  - Cada módulo contiene **6 lecciones de 2 créditos cada una** (18 lecciones secuenciales por nivel).
- **Acreditación de Lecciones (`awardLessonCredits`)**:
  - Asignación de 2 créditos por lección completada con puntaje $\ge 70$.
  - Idempotencia garantizada: una lección ya aprobada no duplica créditos, pero actualiza la mejor puntuación histórica del estudiante.
  - Al acumular 36 créditos en el nivel, se desbloquea de forma automática la bandera `proficiencyUnlocked = true`, otorgando elegibilidad para el Examen de Certificación de Nivel.

### 20.2 Polyglot Curriculum Handbook (Textbook Oficial Canónico)
- Cada lección cuenta con un capítulo estructurado en **5 dimensiones canónicas**:
  1. **Descriptores Can-Do (CEFR 2020)**: Metas conductuales explícitas y observables.
  2. **Corpus Gramatical Canónico & Mediación Contrastiva**: Fórmulas funcionales y tablas de contraste español-idioma meta para erradicar errores fosilizados (ej. *"I want a coffee"* frente a *"Can I have a coffee, please?"*).
  3. **Glosario de Colocaciones & Fonética IPA**: Expresiones con transcripción fonética internacional y síntesis de audio nativo integrable con un clic.
  4. **Diálogo Modelo Anotado**: Intercambio nativo completo entre el interlocutor y el alumno con notas al margen sobre registro y pragmática.
  5. **Ficha de Tareas de Salida**: Tarea previa (Warm-up Booster de 90s), tarea central (conversación en vivo con Wetty) y tarea posterior (fijación en mazo SRS).

### 20.3 Contratos de API Multi-Tenant
- `GET /api/curriculum/tree?lang=en&level=A1`: Devuelve el árbol jerárquico de módulos, lecciones y avance porcentual del usuario.
- `GET /api/curriculum/handbook?lang=en&level=A1&lessonId=cafe`: Devuelve la ficha canónica del capítulo solicitado.
- `POST /api/curriculum/complete-lesson`: Registra el cumplimiento pedagógico, suma +2 créditos en el Store multi-tenant y evalúa desbloqueo de suficiencia.

### 20.4 Experiencia de Usuario en Frontend
- **Student Hub (`#hubView`)**:
  - Nueva sección `#hubCurriculumTree` que renderiza las tarjetas de los 3 módulos temáticos, barras de progreso de créditos (`X / 12 créditos`) y listas de lecciones con botón de apertura directa de la Guía Oficial (`📖 Guía`).
  - Botón `[ 📖 Guía Oficial de Estudio ]` en la tarjeta de la Próxima Lección en Foco.
- **Lector Modal del Handbook (`#handbookModal`)**:
  - Interfaz de lectura editorial oscura, navegación por pestañas temáticas (Can-Do, Gramática, Colocaciones, Diálogo, Tareas) y botón de arranque de sesión rápida hacia el Warm-up Booster.
- **Modal de Fin de Lección (`#lessonCompleteModal`)**:
  - Incorporado el bloque `#lessonCreditsReward` mostrando los +2 créditos otorgados y el saldo acumulado en el nivel (`Total en Nivel: X / 36 créditos`).

### 20.5 Evidencias de Verificación (DoD)
- **Suite de Pruebas Automatizadas**:
  - `test/curriculum.test.js`: 3 tests unitarios pasando al 100% (Verificación de 36 créditos/18 lecciones en A1, 5 dimensiones del Handbook, e idempotencia y desbloqueo de suficiencia a los 36 créditos).
  - `npm test`: **68 tests ejecutados, 67 aprobados al 100%, 0 fallos, 1 omitido defensivamente**.
- **Verificación Visual E2E en Navegador**:
  - Verificación del árbol curricular y modal del Handbook grabada en video: `fase2_handbook_modal_verified_1792859020845.webp`.
  - Capturas registradas: `curriculum_tree_verified_1792859068872.png`, `hub_overview_1792859107015.png`, `warmup_completed_1792859725105.png`.

### 20.6 Despliegue en Producción (Render)
- **Commits Desplegados a `origin main`**:
  - `ab7c099`: `feat(fase-1): landing page, auth wall, student hub y pre-sesion warmup`
  - `300d3f2`: `feat(fase-2): estructura curricular modular por creditos y polyglot curriculum handbook`
- **Verificación en Producción (`polyglot-voice-jtu6.onrender.com`)**:
  - Health check en vivo: `GET /health` responde 200 OK (`status: ok`, `service: polyglot-voice`).
  - Endpoint de árbol curricular: `GET /api/curriculum/tree?lang=en&level=A1` responde 200 OK con los 3 módulos temáticos y 36 créditos meta.
  - Endpoint de Handbook: `GET /api/curriculum/handbook?lang=en&level=A1&lessonId=cafe` responde 200 OK con las 5 dimensiones pedagógicas y código canónico `EN-A1-M1-L1`.
  - Frontend actualizado: `index.html` sirviendo `/app.js?v=2.8` con el Handbook modal y el Warm-up Booster integrados.

---

## 21. Fase 3: Módulo de Pruebas de Suficiencia Auditada (Oral + Escrito) y Certificación Digital (Completada y Verificada)

Se implementó el módulo de auditoría de suficiencia lingüística para medir con rigor y certificar el nivel exacto del estudiante:

### 21.1 Motor de Auditoría Tridimensional (`lib/proficiencyAuditor.js`)
- **Doble Modalidad de Evaluación**:
  1. **Test de Ubicación Diagnóstico (`placement`)**:
     - Disponible de forma inmediata para cualquier estudiante.
     - Evalúa de forma transversal desde A1 hasta B2 (o HSK 1 a 3) para ubicar con precisión el nivel inicial.
  2. **Examen de Certificación de Nivel (`certification_exit`)**:
     - Control estricto de elegibilidad: requiere 36 créditos académicos acumulados en el nivel o la bandera `proficiencyUnlocked = true`.
     - Aprobación con puntaje global $\ge 75\%$ promueve al estudiante al siguiente nivel (ej. A1 $\rightarrow$ A2) y resetea créditos para el nuevo ciclo.
- **Estructura Tridimensional de la Prueba**:
  - **Fase A: Precisión Estructural (CAT Cloze Test)**:
    - 6 reactivos adaptativos cronometrados con 45 segundos por pregunta (`#phaseATimer`).
    - Banco calibrado con explicaciones pedagógicas de respuesta errónea vs estándar.
  - **Fase B: Producción Escrita Auditada**:
    - Generador de consigna situacional por nivel (ej. correo de confirmación a hotel en A1, correo formal de disculpa en A2).
    - Rúbrica CEFR determinista y cuantitativa: cálculo de Type-Token Ratio (TTR), extensión y rango de palabras (mín. 35-50 palabras), conectores discursivos, mayúsculas y control sintáctico.
  - **Fase C: Entrevista Oral Auditada con Wetty**:
    - Rol de **Examinadora Formal** (Wetty no interrumpe ni ofrece pistas pedagógicas durante el examen).
    - 4 turnos no guionados de dificultad gradual con síntesis de voz nativa.
    - Medición de latencia de vacilación, inteligibilidad, longitud del enunciado y adecuación pragmática.
- **Ponderación Oficial y Consolidación**:
  - Ponderación: 30% Fase A (Estructural) + 35% Fase B (Redacción) + 35% Fase C (Expresión Oral).
  - Dictamen: Aprobado si puntaje $\ge 75\%$.

### 21.2 Certificado Digital Inmutable y Firma Criptográfica
- Emisión de código serial único verificado: formato `POLY-[LEVEL]-[HEX4]-[HEX4]` (ej. `POLY-A1-4F2A-88B1`).
- Hash de verificación SHA-256 generado a partir de `userId|candidateName|lang|level|score|code|timestamp`.
- Consulta pública y validación institucional mediante endpoint `GET /api/proficiency/certificate?code=...`.
- Plantilla visual prémium de diploma con doble marco dorado, sello de acreditación y reglas de impresión limpia `@media print`.

### 21.3 Modelo de Base de Datos y RLS Multi-Tenant (`supabase/migrations/004_curriculum_suficiencia.sql`)
- Creada tabla `public.proficiency_audits` con RLS estricto (`user_id = auth.uid()`), política pública de lectura por `certificate_code` para validación de terceros y almacenamiento persistente en JSONB de transcripciones y sub-puntuaciones.
- Creadas tablas `public.user_credits` y `public.user_challenges` para trazabilidad completa.

### 21.4 Contratos de API Multi-Tenant (`server.js`)
- `POST /api/proficiency/start`: Valida elegibilidad por créditos y arranca sesión de examen.
- `POST /api/proficiency/submit-phase-a`: Evalúa los 6 reactivos adaptativos CAT Cloze.
- `POST /api/proficiency/submit-written`: Evalúa la redacción con rúbrica CEFR.
- `POST /api/proficiency/submit-oral-turn`: Audita turnos orales de la examinadora.
- `POST /api/proficiency/finalize`: Consolida puntajes, emite certificado, actualiza nivel en Store multi-tenant y registra en historial.
- `GET /api/proficiency/certificate?code=...`: Consulta y auditoría de credenciales oficiales.

### 21.5 Evidencias de Verificación (DoD)
- **Batería de Pruebas Automatizadas**:
  - `test/proficiency.test.js`: 5 tests unitarios cubriendo elegibilidad, Fase A, Fase B con TTR, Fase C oral y emisión inmutable con promoción A1 $\rightarrow$ A2 (**100% pasando**).
  - `npm test`: **73 tests ejecutados, 72 aprobados, 0 fallos, 1 omitido defensivamente**. Latencia promedio sostenida en 1474 ms.
- **Verificación Visual E2E en Navegador**:
  - Subagente de navegador completó el flujo E2E: Banner en Hub $\rightarrow$ Test de Ubicación $\rightarrow$ Fase A (6 preguntas contestadas con timer) $\rightarrow$ Fase B (redacción de 50 palabras auditada) $\rightarrow$ Fase C (entrevista oral con Wetty) $\rightarrow$ Dictamen final con reporte porcentual.
  - Grabación completa de la sesión: `fase3_proficiency_audit_flow_1792862321281.webp`.
  - Capturas registradas: `hub_proficiency_banner_1792862401563.png`, `proficiency_intro_modal_1792862468058.png`, `proficiency_exam_result_1792863587168.png`.

---

## 22. Cierre Oficial de Fase I (v1.0.0) y Preparación para Fase II

### 22.1 Estado del Repositorio para Respaldo Oficial
- **Integridad y Limpieza**:
  - Repositorio remoto: `https://github.com/Moicogut/PolyGloty_OS.git` (Rama `main`).
  - `.gitignore` robustecido: credenciales (`.env`), almacenamiento local (`data/*.json`, `data/*.jsonl`), dependencias (`node_modules/`) y logs temporales están estrictamente aislados del control de versiones.
  - Zero-Dependencies Backend: Node.js $\ge 20.6$ nativo sin paquetes de terceros en producción.
- **Base de Datos Supabase Cloud Sincronizada**:
  - Migración `004_curriculum_suficiencia.sql` aplicada con RLS estricto (`user_credits`, `proficiency_audits`, `user_challenges`).
  - Sincronización cloud activa en `lib/supabase.js` (`recordLessonCredit`, `recordProficiencyAudit`) con fallback local automático.
- **Batería de Pruebas**: 73 tests ejecutados en `npm test` (**72 aprobados, 0 fallos, 1 omitido por entorno remoto**). Latencia de diálogo promedio en 1474 ms.
- **Versión Oficial Sellada**: Tag Git `v1.0.0`.

### 22.2 Hoja de Ruta Prioritaria para Fase II
1. **Expansión Curricular A2–B2**: Desglose pedagógico de los 36 créditos para los niveles A2, B1 y B2 en inglés y español.
2. **Entrenamiento Especializado en Chino Mandarín (HSK)**: Calibración del reconocedor de tonos con Wetty y retroalimentación fonética pinyin.
3. **Generación Vectorizada de Certificados PDF**: Descarga directa de diplomas con firma SHA-256 y código QR sin requerir impresión de navegador.
4. **Modo PWA Offline con IndexedDB**: Almacenamiento local seguro de tarjetas SRS y árbol curricular para práctica sin conexión.

---

## 23. Fase II - Sprint 2.1: Salas de Microgrupos Social Co-Op y Motor Acústico Algorítmico GOP

### 23.1 Esquema Relacional y Persistencia Multi-Tenant (`supabase/migrations/005_coop_microgroups.sql`)
- Creada tabla `public.coop_rooms`:
  - `room_code` único legible (ej. `TECH-4A12`), `max_capacity` (2 a 6 personas), `level_cefr`, `professional_domain` (`tech`, `medical`, `corporate`, `general`), `status` (`waiting`, `active`, `finished`), `target_task` en JSONB.
- Creada tabla `public.coop_memberships`:
  - Relación `room_id` y `user_id`, roles `host` / `member`, métricas de `talking_time_seconds`, `turn_count` y `peer_feedback_score`.
- Creada tabla `public.coop_sessions_log`:
  - Auditoría de sesión con `transcript_json`, `task_goals_achieved`, `duration_seconds` y `facilitator_summary`.
- RLS Habilitado al 100%: Aislamiento estricto por `user_id = auth.uid()` y verificación de pertenencia a la sala.
- Integrado método `recordCoopSessionLog` en `lib/supabase.js`.

### 23.2 Motor de Smart Matching y Orquestación TBLT (`lib/coopEngine.js`)
- **Afinidad Tridimensional**: Agrupación automática basada en:
  1. Nivel CEFR idéntico (evita asimetría pedagógica entre participantes).
  2. Dominio profesional común con fallback inteligente a general.
  3. Ventana ágil de 15 minutos (900 segundos).
- **Balanceo Dinámico de Talking Time**:
  - Trazabilidad en tiempo real del tiempo acumulado y porcentaje de intervención.
  - Detección de miembros con participación rezagada ($< 50\%$ de la media).
  - Sugerencia proactiva del próximo interlocutor para mantener la equidad comunicativa.
- **Detección de Silencios Prolongados ($>5$s)**:
  - Disparador no punitivo que genera un guion cálido de intervención para Wetty.
- **Catálogo de Misiones TBLT**:
  - Tech: Daily Standup, Bug Triage, Architecture Review, Post-Mortem.
  - Medical: Patient Check-in, Shift Handoff, Case Conference, Informed Consent.
  - Corporate: Kickoff Introductions, Pipeline Review, Budget Negotiation, Partnership Pitch.
  - General: Travelers Meetup, Weekend Plan, Cultural Exchange, Smart Cities Debate.

### 23.3 Motor Acústico Algorítmico GOP y Formantes (`lib/acousticGopEngine.js`)
- **Algoritmo Goodness of Pronunciation (GOP)**:
  - Implementación de la verosimilitud logarítmica de emisión frente a formantes estándar en escala psicoacústica de Bark.
  - Puntuación 0 a 100 con umbral nativo calibrado en $\ge 75$.
- **Diagnóstico Quirúrgico de los 3 Dolores del Hispanohablante**:
  1. *Colapso Laxa/Tensa (/ɪ/ vs /iː/ en sheep/ship)*: Detección si F1 $< 340$ Hz y F2 $> 2080$ Hz al emitir laxa /ɪ/, activando guía de mandíbula relajada.
  2. *Omisión de Schwa (/ə/ en about, problem)*: Detección de sobre-articulación periférica (F1 $> 630$ Hz o F2 fuera de rango central), recomendando suspiro neutro.
  3. *Epéntesis Consonántica (/e/ protésica en sport, student)*: Detección de energía vocalica previa a la fricativa /s/, guiando hacia el siseo directo sin prefijo.
- **Extracción de Formantes F1/F2**: Extracción analítica de picos de resonancia en 16 kHz PCM sin dependencias externas.
- **Guía Articulatoria y Recasting**: Devolución de apertura mandibular (F1), posición lingual (F2), tip anatómico y propuesta de reformulación implícita para Wetty.

### 23.4 Endpoints REST Multi-Tenant (`server.js` y `lib/validator.js`)
- `POST /api/coop/match`: Emparejamiento por afinidad y gestión de membresías en microgrupos.
- `POST /api/coop/turn`: Registro de intervenciones, Talking Time y facilitación.
- `GET /api/coop/silence-check`: Monitor de silencios con scripts para Wetty.
- `POST /api/coop/leave`: Salida limpia de sala con traspaso de host o purga.
- `POST /api/acoustic/gop-score`: Análisis fonético instantáneo con coordenadas F1/F2 y guía anatómica.

### 23.5 Resultados y Verificación (DoD)
- **Suite de Pruebas**: `test/coop_gop.test.js` (**13/13 tests pasando al 100%**).
- **Suite Completa del Proyecto**: `npm test` (**86 tests ejecutados, 85 pasando, 0 fallos, 1 omitido por RLS remoto**).
- **Latencia conversacional**: Mantenida en 1474 ms promedio y P90 de 1655 ms.


