# Polyglot Voice

Tutor personal de **inglés** y **chino mandarín** con:

- **Voz en tiempo real de baja latencia**: audio por WebRTC contra la API Realtime de OpenAI (voz a voz, interrupciones naturales, detección de turnos semántica).
- **Puntuación de tonos**: seguimiento de tono fundamental (YIN) en tu navegador, segmentación por sílaba y comparación con contornos modelo. El audio de los ejercicios no sale de tu equipo.
- **Repaso espaciado**: variante de SM-2 con tarjetas que crea el propio tutor durante la conversación.
- **Gamificación contextual**: misiones con objetivos que el tutor marca según lo que realmente dices, XP, nivel, racha, medallas y misiones diarias que cambian según tus tarjetas vencidas y tus errores recientes.

Sin dependencias de npm. Solo Node.js ≥ 20.6.

## Instalación

```bash
cd polyglot-voice
cp .env.example .env      # en Windows: copy .env.example .env
# edita .env y pon tu OPENAI_API_KEY
npm start
```

Abre http://localhost:3000 en Chrome o Edge y acepta el permiso de micrófono.
Sin clave de API, los tonos y el repaso funcionan igual; solo la conversación queda desactivada.

Pruebas: `npm test` (34 pruebas: SRS, análisis de tonos con señales sintéticas, herramientas del tutor y servidor con OpenAI simulado).

## Cómo funciona

```
Navegador ──WebRTC (audio + canal de eventos)──► API Realtime
   │  ▲                                              │
   │  └── transcripciones, llamadas a herramientas ──┘
   ├── POST /api/session   SDP → el servidor añade clave, instrucciones y herramientas
   ├── POST /api/tool      add_card · log_error · mission_progress  (lógica en el servidor)
   └── tonos: micrófono → YIN → sílabas → contorno vs. modelo (todo local)
```

La clave de API **nunca llega al navegador**: el servidor negocia la sesión (interfaz unificada `/v1/realtime/calls`) y solo escucha en `127.0.0.1`, rechazando peticiones de otros orígenes.

### Gamificación contextual
- El tutor llama a `mission_progress` cuando cumples un objetivo con tus palabras (+30 XP; misión completa +60 y medalla).
- Cada error real que corrige se guarda con `log_error`; los puntos débiles de los últimos 14 días se inyectan en las instrucciones de la siguiente sesión, y las tarjetas vencidas se reutilizan en la conversación.
- Las misiones diarias se calculan con tu estado: repaso si hay tarjetas vencidas, ejercicios de tonos si practicas mandarín o fallas tonos.

### Puntuación de tonos
1. Submuestreo a 16 kHz, YIN por tramas de 50 ms (paso de 10 ms), rango 70–400 Hz.
2. Segmentos sonoros → N sílabas (une huecos pequeños; si hay sílabas pegadas, corta en el mínimo de energía).
3. Contorno en semitonos con media cero (independiente de tu registro de voz), comparado con modelos de tono 1–4, tercer tono "a medias" y neutro. Aplica la regla 3+3→2+3 y 不 + tono 4.
4. Puntaje 0–100 por sílaba y total; indica qué tono "sonó" cuando no coincide.

## Límites que conviene conocer

- **Probado con señales sintéticas y servidor simulado, no con voz humana ni con la API real.** El primer uso real puede pedir ajustes de umbrales de tono o de nombres de modelo.
- La API Realtime cambia con frecuencia. Si ves un error al conectar, el mensaje de OpenAI aparece en el chat. Ajusta `REALTIME_MODEL` en `.env` (por defecto `gpt-realtime-2.1`; alternativa `gpt-realtime`).
- El análisis de tonos evalúa **forma del contorno**, no la pronunciación de consonantes y vocales. Es una guía, no un examinador HSK.
- Tercer tono aislado y voz muy ronca (creaky) son difíciles de seguir para cualquier detector de tono.
- Costo: la voz en tiempo real se cobra por minuto de audio. La sesión se cierra sola a los 20 minutos.
- Los datos se almacenan en `data/` aislados por usuario (`state.json` para default, `state_{userId}.json` para multi-tenant vía cabecera `x-user-id` o query `user_id`).

## Privacidad y Reconocimiento de Voz

- **Procesamiento de voz en el navegador:** Cuando utilizas la función de voz (micrófono), la API nativa `Web Speech API` de tu navegador transcribe el audio a texto. Dependiendo del navegador y sistema operativo (p. ej. Google Chrome en Android/Windows o Safari en iOS/macOS), el navegador puede enviar el fragmento de audio a sus servidores de reconocimiento de voz (Google o Apple) para generar la transcripción.
- **Alternativa 100% disponible por texto:** El modo de texto permanece siempre activo y accesible sin restricciones en caso de que el micrófono esté bloqueado, no cuentes con hardware de audio o tu navegador no soporte reconocimiento por voz.


