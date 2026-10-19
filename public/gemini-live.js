// Adaptador cliente para Gemini Live API mediante WebSockets nativos en el navegador.
// Entrada de audio: Captura de micrófono convertida a PCM 16-bit mono 16 kHz en Base64.
// Salida de audio: Decodificación y reproducción de PCM 24-bit/16-bit a 24 kHz via Web Audio API AudioContext.

export class GeminiLiveSession {
  constructor({ token, wsUrl, setup, onMessage, onError, onClose, onOpen }) {
    this.token = token;
    this.wsUrl = wsUrl;
    this.setup = setup;
    this.onMessage = onMessage;
    this.onError = onError;
    this.onClose = onClose;
    this.onOpen = onOpen;

    this.ws = null;
    this.audioCtx = null;
    this.micStream = null;
    this.processor = null;
    this.inputSource = null;
    this.playbackQueue = [];
    this.isPlaying = false;
    this.scheduledTime = 0;
  }

  async start() {
    // 1. Iniciar AudioContext
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.audioCtx = new AudioContextClass({ sampleRate: 24000 });
    if (this.audioCtx.state === "suspended") {
      await this.audioCtx.resume();
    }

    // 2. Conectar WebSocket a Gemini con el token efímero
    const url = `${this.wsUrl}?access_token=${encodeURIComponent(this.token)}`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      // Enviar mensaje de setup inicial
      this.ws.send(JSON.stringify(this.setup));
      this.startMic();
      if (this.onOpen) this.onOpen();
    };

    this.ws.onmessage = async (evt) => {
      let data = evt.data;
      if (data instanceof Blob) {
        data = await data.text();
      }
      try {
        const msg = JSON.parse(data);
        this.handleServerMessage(msg);
      } catch (e) {
        console.error("Error parseando mensaje de Gemini:", e);
      }
    };

    this.ws.onerror = (e) => {
      if (this.onError) this.onError(e);
    };

    this.ws.onclose = (e) => {
      this.stop();
      if (this.onClose) this.onClose(e);
    };
  }

  async startMic() {
    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, sampleRate: 16000 }
      });

      const micCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      this.inputSource = micCtx.createMediaStreamSource(this.micStream);
      // ScriptProcessorNode para empaquetar bloques PCM 16-bit
      this.processor = micCtx.createScriptProcessor(2048, 1, 1);

      this.processor.onaudioprocess = (e) => {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
        const inputData = e.inputBuffer.getChannelData(0);
        // Convertir Float32 a Int16 PCM
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }
        // Base64 encode
        const base64Audio = this.bufferToBase64(pcm16.buffer);
        const payload = {
          realtimeInput: {
            mediaChunks: [
              {
                mimeType: "audio/pcm;rate=16000",
                data: base64Audio,
              },
            ],
          },
        };
        this.ws.send(JSON.stringify(payload));
      };

      this.inputSource.connect(this.processor);
      this.processor.connect(micCtx.destination);
      this.micCtx = micCtx;
    } catch (err) {
      if (this.onError) this.onError(err);
    }
  }

  handleServerMessage(msg) {
    if (this.onMessage) this.onMessage(msg);

    // Reproducir audio recibido
    const parts = msg.serverContent?.modelTurn?.parts || [];
    for (const part of parts) {
      if (part.inlineData && part.inlineData.data) {
        this.playPcmChunk(part.inlineData.data);
      }
    }

    if (msg.serverContent?.interrupted) {
      // Limpiar cola si el usuario interrumpió al tutor
      this.scheduledTime = this.audioCtx ? this.audioCtx.currentTime : 0;
    }
  }

  playPcmChunk(base64Data) {
    if (!this.audioCtx) return;
    const binary = atob(base64Data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768.0;
    }

    const audioBuf = this.audioCtx.createBuffer(1, float32.length, 24000);
    audioBuf.copyToChannel(float32, 0);

    const source = this.audioCtx.createBufferSource();
    source.buffer = audioBuf;
    source.connect(this.audioCtx.destination);

    const now = this.audioCtx.currentTime;
    if (this.scheduledTime < now) {
      this.scheduledTime = now;
    }
    source.start(this.scheduledTime);
    this.scheduledTime += audioBuf.duration;
  }

  sendToolResponse(callId, name, result) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const msg = {
      toolResponse: {
        functionResponses: [
          {
            response: { output: result },
            id: callId,
          },
        ],
      },
    };
    this.ws.send(JSON.stringify(msg));
  }

  bufferToBase64(buffer) {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  stop() {
    try {
      this.processor?.disconnect();
      this.inputSource?.disconnect();
      this.micStream?.getTracks().forEach((t) => t.stop());
      this.micCtx?.close();
      this.audioCtx?.close();
      this.ws?.close();
    } catch { /* ignorar */ }
    this.ws = null;
    this.micStream = null;
    this.audioCtx = null;
  }
}
