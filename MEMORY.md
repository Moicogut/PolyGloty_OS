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

## 7. Próximos Pasos Recomendados

1. **Pruebas de Campo en Dispositivos Móviles**:
   - Abrir [https://polyglot-voice-jtu6.onrender.com](https://polyglot-voice-jtu6.onrender.com) en iPhone (Safari) y Android (Chrome).
   - Probar la interacción por voz (botón mantener para hablar y síntesis auditiva).
   - Probar el módulo de calibración de tonos chinos (Web Worker YIN DSP).
2. **Monitoreo**:
   - Supervisar logs de Render en caso de consultas concurrentes o picos de tráfico.
