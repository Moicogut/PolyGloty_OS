# Polyglot Voice · Plataforma de Aprendizaje por Competencias Lingüísticas
> **Release Oficial Fase I (v1.0.0)** · Tutoría con IA, Estructura Curricular por Créditos ECTS/EdTech y Certificación Auditada CEFR/HSK.

[![Node.js Version](https://img.shields.io/badge/Node.js-%E2%89%A520.6-339933?logo=node.js)](https://nodejs.org/)
[![Standard](https://img.shields.io/badge/Est%C3%A1ndar-CEFR%20%2F%20MCER%20%26%20HSK-blue)](https://www.coe.int/en/web/common-european-framework-reference-languages)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-0%20External%20NPM-success)]()
[![Multi-tenancy](https://img.shields.io/badge/Security-Multi--tenant%20RLS-orange)](https://supabase.com/)
[![Tests](https://img.shields.io/badge/Tests-73%20tests%20(72%20pass%2C%201%20skipped)-brightgreen)]()

---

## 1. Resumen Ejecutivo de la Fase I

Polyglot Voice es un SaaS educativo inteligente de alta fidelidad diseñado para el dominio acelerado del **inglés internacional** y **chino mandarín**, compitiendo con plataformas líderes como *Praktika*, *Speak* y *Duolingo Max*.

Esta versión consolida el cierre oficial de la **Fase I**, integrando un ecosistema pedagógico completo: desde el onboarding y calentamiento de memoria de trabajo, hasta el libro de texto oficial y la certificación de competencias auditada con firma criptográfica.

### 🌐 Despliegue en Producción
- **URL Oficial**: [https://polyglot-voice-jtu6.onrender.com/](https://polyglot-voice-jtu6.onrender.com/)
- **Infraestructura**: Render Web Service (`srv-dbb3qfg473hc73chkkng`) gestionado mediante Blueprint y Auto-Deploy conectado a GitHub.
- **Base de Datos**: Supabase PostgreSQL con Row Level Security (RLS) multi-tenant estricto.

---

## 2. Los 3 Pilares Pedagógicos de la Fase I

```
                               ┌──────────────────────────────────────────────────────────┐
                               │           POLYGLOT VOICE · ECOSISTEMA FASE I             │
                               └────────────────────────────┬─────────────────────────────┘
                                                            │
         ┌──────────────────────────────────────────────────┼─────────────────────────────────────────────────┐
         ▼                                                  ▼                                                 ▼
┌──────────────────────────────┐        ┌───────────────────────────────────────┐        ┌────────────────────────────────────────┐
│  PILAR 1: PERSONALIZACIÓN    │        │      PILAR 2: CURRÍCULUM 36 CRÉDITOS  │        │   PILAR 3: SUFICIENCIA Y CERTIFICADO   │
├──────────────────────────────┤        ├───────────────────────────────────────┤        ├────────────────────────────────────────┤
│ • Landing Page de Conversión │        │ • 3 Módulos de 12 Créditos (36 Total) │        │ • Test de Ubicación Diagnóstico        │
│ • Auth Wall Estricto         │        │ • 6 Lecciones de 2 Créditos c/u       │        │ • Examen de Salida de Nivel            │
│ • Student Hub con Radar 4D   │        │ • Polyglot Curriculum Handbook        │        │ • Fase A: CAT Cloze (Timer 45s)        │
│ • Racha, XP y Retos Dinámicos│        │   (5 Dimensiones Canónicas)           │        │ • Fase B: Redacción CEFR (TTR)         │
│ • Pre-sesión Warm-up Booster │        │ • Desbloqueo Automático a 36 Créditos │        │ • Fase C: Entrevista Wetty Examinadora │
│   (90s Active Recall +10 XP) │        │ • Acreditación Idempotente            │        │ • Certificado Digital SHA-256          │
└──────────────────────────────┘        └───────────────────────────────────────┘        └────────────────────────────────────────┘
```

### 1. Personalización E2E, Hub del Estudiante y Warm-up Booster
- **Landing Page & Auth Wall**: Entrada elegante con estética obsidian dark, muestra de voz nativa de Wetty, tabla de valor comparativa y muro de autenticación estricto que protege el acceso a la plataforma.
- **Student Hub (`#hubView`)**:
  - Saludo motivacional adaptativo basado en la teoría de autoeficacia.
  - Insignia de Nivel Actual (A1–C1 / HSK 1–3).
  - Contador de Créditos Académicos (`X / 36 Créditos`) con barra de progreso reactiva.
  - Radar de Competencias 4D: Comprensión auditiva, Fluidez temporal, Precisión gramatical y Variedad léxica.
  - Racha de días consecutivos (`🔥 Racha`) y saldo total de experiencia (`⭐ XP`).
- **Pre-sesión Warm-up Booster (`#warmupModal`)**:
  - Modal interactivo de recuperación activa previa a la sesión de conversación.
  - 3 micro-retos pedagógicos (90 segundos): discriminación auditiva, reparación de fósiles gramaticales y anticipación comunicativa.
  - Recompensa de +10 XP y transición fluida a la lección en vivo.

### 2. Estructura Curricular Modular por Créditos y Textbook Oficial
- **Arquitectura de Créditos Académicos (Equivalencia ECTS)**:
  - Cada nivel CEFR requiere **36 créditos académicos**.
  - Estructurado en **3 módulos temáticos de 12 créditos cada uno**.
  - Cada módulo contiene **6 lecciones de 2 créditos cada una** (18 lecciones secuenciales por nivel).
  - Requisito de aprobación: Cumplimiento de al menos 2 objetivos conductuales *Can-Do* con puntaje $\ge 70\%$.
- **Polyglot Curriculum Handbook (`#handbookModal`)**:
  - Libro de texto digital canónico integrado en la plataforma.
  - Cada lección cuenta con un capítulo estructurado en **5 dimensiones**:
    1. **Descriptores Can-Do (CEFR 2020)**: Metas observables de desempeño.
    2. **Corpus Gramatical & Mediación Contrastiva**: Fórmulas funcionales y tabla de contraste español-idioma meta para erradicar errores fosilizados (ej. *"I have 30 years"* $\rightarrow$ *"I am 30 years old"*).
    3. **Colocaciones de Alta Frecuencia & Fonética IPA**: Expresiones clave con transcripción fonética y reproductor de audio nativo integrable con un clic.
    4. **Diálogo Modelo Anotado**: Transcripción completa de un intercambio natural con notas al margen sobre registro y cortesía.
    5. **Ficha de Tareas de Salida**: Consolidación previa, central y posterior en mazo SRS.

### 3. Módulo de Pruebas de Suficiencia Auditada y Certificación Digital
- **Doble Modalidad de Examen**:
  - *Test de Ubicación Diagnóstico*: Evalúa de A1 a B2 para situar al alumno nuevo.
  - *Examen de Certificación de Nivel*: Se desbloquea al acumular 36 créditos. Si el alumno aprueba con $\ge 75\%$, se promueve al siguiente nivel.
- **Evaluación en 3 Fases**:
  - **Fase A (CAT Cloze Test)**: 6 reactivos adaptativos cronometrados con 45 segundos por pregunta (`#phaseATimer`).
  - **Fase B (Producción Escrita Auditada)**: Redacción sobre consigna situacional evaluada mediante rúbrica cuantitativa CEFR: índice *Type-Token Ratio* (TTR), variedad léxica, longitud y conectores.
  - **Fase C (Entrevista Oral con Wetty)**: Diálogo oral de 4 turnos donde Wetty asume el rol formal de **Examinadora** (sin interrupciones pedagógicas ni pistas).
- **Certificado Digital Inmutable**:
  - Serial único oficial: `POLY-[LEVEL]-[HEX4]-[HEX4]`.
  - Firma criptográfica SHA-256 verificable públicamente en `/api/proficiency/certificate?code=...`.
  - Plantilla visual con marco dorado, sello de acreditación y reglas de impresión limpia `@media print`.

---

## 3. Arquitectura Técnica y Stack Tecnológico

- **Backend Zero-Dependency**: Node.js $\ge 20.6$ nativo ESM (`http`, `crypto`, `fs`, `path`). Sin librerías externas pesadas como Express.
- **Modelos de Inteligencia Artificial**:
  - `gemini-3.8-flash`: Evaluación conversacional por turnos con Structured Outputs (JSON Schema estricto) y mediación contrastiva.
  - `gemini-3.8-live` / `OpenAI Realtime`: Conexión de voz bidireccional de baja latencia vía WebSockets / WebRTC.
  - Speech Synthesis nativa con voces neuronales internacionales.
- **Frontend Obsidian PWA-like**:
  - Vanilla JavaScript moderno (módulos ES6).
  - Vanilla CSS3 con diseño de alto impacto: glassmorphism, gradientes HSL calibrados, tipografía *Plus Jakarta Sans* y componentes responsivos para móvil y escritorio.
- **Seguridad Multi-Tenant SaaS**:
  - Aislamiento estricto por `user_id` / `tenant_id` en todas las consultas y escrituras.
  - Rate limiting por IP y por usuario para mitigar abusos de cómputo y API.

---

## 4. Base de Datos Relacional y Migraciones Supabase

El esquema de base de datos multi-tenant reside en Supabase PostgreSQL con Row Level Security (RLS) habilitado en el 100% de las tablas:

1. [001_rls_por_usuario.sql](file:///c:/Users/Rolando/Downloads/POLYGLOTY%20IN/polyglot-voice/supabase/migrations/001_rls_por_usuario.sql): Tablas base de perfiles (`profiles`), tarjetas SRS (`cards`) y conversaciones (`conversations`).
2. [003_uso_diario.sql](file:///c:/Users/Rolando/Downloads/POLYGLOTY%20IN/polyglot-voice/supabase/migrations/003_uso_diario.sql): Tabla `user_usage` para trazabilidad de cuota y minutos consumidos por usuario al día.
3. [004_curriculum_suficiencia.sql](file:///c:/Users/Rolando/Downloads/POLYGLOTY%20IN/polyglot-voice/supabase/migrations/004_curriculum_suficiencia.sql):
   - `user_credits`: Registro de créditos aprobados por lección y módulo.
   - `proficiency_audits`: Auditoría inmutable de exámenes, transcripciones y certificados.
   - `user_challenges`: Retos dinámicos diarios y semanales.

---

## 5. Batería de Pruebas Automatizadas

El proyecto cuenta con una cobertura completa de pruebas unitarias y de integración sobre Node.js Test Runner nativo:

```bash
npm test
```

### Métricas de Calidad
- **Total de pruebas ejecutadas**: 73 tests.
- **Resultado**: 72 aprobados al 100%, 0 fallos, 1 omitido defensivamente (requiere credenciales Supabase en vivo para test E2E de dos usuarios simultáneos).
- **Latencia conversacional**: Promedio de 1474 ms por turno (P90 de 1655 ms).
- **Componentes verificados**: Algoritmo YIN de tonos, repetición espaciada SRS, motor pedagógico CEFR, árbol curricular de 36 créditos, validador defensivo, CAT Cloze y firma SHA-256 de certificados.

---

## 6. Instalación y Ejecución Local

### Prerrequisitos
- Node.js versión $\ge 20.6$.
- Cuenta de Google Gemini API o OpenAI API (opcional para desarrollo local; sin API keys funcionan las pruebas, tonos y repaso).

### Pasos
```bash
# 1. Clonar el repositorio
git clone https://github.com/Moicogut/PolyGloty_OS.git
cd PolyGloty_OS

# 2. Configurar variables de entorno
cp .env.example .env
# Configura GEMINI_API_KEY o OPENAI_API_KEY en .env

# 3. Iniciar el servidor
npm start

# 4. Abrir en el navegador
# http://localhost:3000/
```

---

## 7. Plan de Transición hacia la Fase II

Con el cierre y respaldo oficial de la **Fase I**, la plataforma queda lista para iniciar la **Fase II**, la cual abarcará:

1. **Expansión Curricular A2–B2**: Incorporación de los contenidos oficiales del Handbook para las lecciones intermedias y avanzadas.
2. **Activación Plena de Chino Mandarín**: Modelado de tonos HSK 1 y 2 con Wetty y retroalimentación de pinyin en tiempo real.
3. **Descarga de Certificado en PDF Vectorizado**: Motor de renderizado directo en cliente con jsPDF/Canvas y QR dinámico de verificación institucional.
4. **App Móvil Híbrida / PWA Offline**: Capacidad de instalar la aplicación en pantallas de inicio con almacenamiento en IndexedDB.
