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
   - `GEMINI_API_KEY`: Tu clave de Google Gemini.
   - `VOICE_PROVIDER`: `gemini`
   - `GEMINI_LIVE_MODEL`: `gemini-2.0-flash-exp` (o `gemini-1.5-flash`)
   - `SUPABASE_URL`: *(Opcional)* URL de tu proyecto Supabase (ej. `https://xxxx.supabase.co`).
   - `SUPABASE_KEY`: *(Opcional)* Clave pública o de servicio de Supabase.

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
