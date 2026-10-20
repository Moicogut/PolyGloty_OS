# Guía de Despliegue en la Nube · Polyglot Voice

Esta guía detalla cómo subir **Polyglot Voice** a la nube para compartirlo con el equipo de trabajo y realizar pruebas reales con retroalimentación en vivo.

---

## Opción 1: Despliegue Gratuito en Render (Recomendado)

Render permite alojar aplicaciones Node.js con HTTPS gratis (ideal para Web Speech API y micrófonos, que requieren HTTPS).

1. **Subir el código a GitHub o GitLab**:
   ```bash
   git init
   git add .
   git commit -m "feat: polyglot voice cloud release"
   git remote add origin https://github.com/TU_USUARIO/polyglot-voice.git
   git push -u origin main
   ```

2. **Crear Web Service en Render**:
   - Ingresa a [render.com](https://render.com) e inicia sesión.
   - Haz clic en **New +** > **Web Service**.
   - Conecta tu repositorio `polyglot-voice`.
   - Render detectará automáticamente el archivo `render.yaml` o configura manualmente:
     - **Runtime**: `Node`
     - **Build Command**: *(dejar en blanco o `npm install`)*
     - **Start Command**: `node server.js`
     - **Instance Type**: `Free`

3. **Variables de Entorno en Render** (Pestaña *Environment*):
   - `VOICE_PROVIDER`: `gemini` (o `openai`).
   - `VOICE_MODEL`: `gemini-2.0-flash` (modelo estable, no experimental).
   - `VOICE_BACKUP_MODEL`: `gemini-1.5-flash` (modelo de respaldo configurable).
   - `GEMINI_API_KEY`: Tu clave de Google Gemini.
   - `SUPABASE_URL`: *(Opcional)* URL de tu proyecto Supabase (ej. `https://xxxx.supabase.co`).
   - `SUPABASE_KEY`: *(Opcional)* Clave pública o de servicio de Supabase.

> [!IMPORTANT]
> **Gestión de Suspensión en Render (Plan Free vs Pago):**
> En el plan gratuito (`plan: free`), las instancias entran en suspensión tras 15 minutos de inactividad, provocando un retraso de 30-50 segundos en el primer arranque en frío.
> Dispones de dos opciones recomendadas (Decisión humana):
> - **Opción A (Recomendada para producción):** Actualizar el plan en Render a *Starter* (sin suspensión por inactividad).
> - **Opción B (Gratuita con chequeo externo):** Mantener el `plan: free` y configurar un monitor externo (ej. UptimeRobot, cron job o GitHub Action) que realice una petición `GET https://TU-APP.onrender.com/health` cada 10 minutos para mantener la instancia caliente.
> El frontend maneja este estado informando: *"Despertando el tutor, un momento..."* si el backend tarda más de 3 segundos en responder.

4. **Compartir con el equipo**:
   - Render te otorgará una URL segura con SSL (ej. `https://polyglot-voice.onrender.com`).
   - Comparte este enlace con tu equipo para pruebas en móviles y laptops.

---

## Opción 2: Despliegue en Railway

1. Ingresa a [railway.app](https://railway.app) y pulsa **New Project** > **Deploy from GitHub repo**.
2. Selecciona el repositorio. Railway usará automáticamente el `Dockerfile` o el runtime Node.
3. En la pestaña **Variables**, añade `GEMINI_API_KEY`.
4. En **Settings** > **Networking**, haz clic en **Generate Domain** para obtener tu enlace público HTTPS.

---

## Opción 3: Despliegue con Docker / Cloud Run

1. **Construir la imagen localmente**:
   ```bash
   docker build -t polyglot-voice .
   ```

2. **Ejecutar el contenedor**:
   ```bash
   docker run -p 3000:3000 -e GEMINI_API_KEY="tu_clave_aqui" polyglot-voice
   ```

3. **Desplegar en Google Cloud Run**:
   ```bash
   gcloud run deploy polyglot-voice --source . --port 3000 --allow-unauthenticated
   ```

---

## Conexión con Supabase (Base de Datos en la Nube)

1. En el panel de [supabase.com](https://supabase.com), crea un nuevo proyecto.
2. Ve al **SQL Editor** y ejecuta el script incluido en este repositorio:
   `supabase/schema.sql`
3. Ve a **Project Settings** > **API** y copia:
   - **Project URL** -> `SUPABASE_URL`
   - **anon / service_role key** -> `SUPABASE_KEY`
4. Pega estos valores en tu `.env` o en las variables de entorno de tu servidor en la nube.

> **Nota de Resiliencia:** Si `SUPABASE_URL` no está configurada, el sistema activa automáticamente el motor **Multi-tenant Local**, aislando a cada usuario por su ID sin romper la aplicación.

---

## Cambios de Despliegue · Parte 1: Estabilidad y Seguridad (Bloqueantes)

1. **Endpoint de Salud / Health Check:**
   - Creado `GET /health` que responde código 200 `{ status: "ok" }` de forma inmediata.
   - Actualizado `render.yaml` con `healthCheckPath: /health` para monitoreo continuo y evitar suspensión.
   - Frontend con aviso de activación `"Despertando el tutor, un momento..."` si el backend frío tarda > 3 s.

2. **Seguridad y Row Level Security (RLS) en Supabase:**
   - Activado RLS estricto en `profiles`, `cards`, `competencies`, `conversations` y `session_vocab`.
   - Políticas con `auth.uid() = user_id` o `service_role`. Ningún usuario puede consultar ni alterar datos de otro inquilino.
   - Verificado `.gitignore` y auditoría de historial: ninguna clave en el código ni en el navegador.

3. **Límites de Uso y Validación Antifraude:**
   - `lib/limiter.js`: Límite por minuto (máximo 15 turnos) y límite diario (30 minutos de conversación activa / 1800 s).
   - Bloqueo automático al agotar la cuota diaria mostrando `"Llegaste al límite de hoy. Vuelve mañana."` con contador de reinicio.
   - `lib/validator.js`: Validación estricta de tamaño y tipo para payloads de texto (máx 2000 chars/turno) y audio (máx 5 MB).

4. **Flujo de Cuentas y Recuperación:**
   - Endpoint `POST /api/auth/reset-password` integrado con Supabase Auth y persistencia local defensiva.
   - Mensajes limpios en español claro, sin códigos de error técnicos.

5. **Enfoque MVP Inglés:**
   - Chino desactivado con selector en modo `"Chino: próximamente"` y modal de lista de espera con captura opcional de correo.

