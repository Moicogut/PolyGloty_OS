# PLAN MAESTRO DE ARQUITECTURA Y PEDAGOGÍA LINGÜÍSTICA
## Polyglot Voice: Personalización E2E, Currículum Modular por Créditos y Pruebas de Suficiencia Auditadas

---

### Ficha Técnica del Documento
- **Plataforma**: Polyglot Voice (AI Language Immersion Engine)
- **Tutor Principal**: Wetty · Tutora de Inglés (Voz, Diálogo Situacional y Facilitación Pedagógica)
- **Marco de Referencia**: CEFR/MCER (A1–C1) y HSK 3.0 (HSK 1–3)
- **Fecha de Emisión**: 24 de Octubre de 2026
- **Estado**: Aprobado para Implementación
- **Versión**: 3.0 (Plan Director)

---

## 1. Resumen Ejecutivo y Diagnóstico

Tras la validación satisfactoria en entornos de escritorio y móviles (estabilidad en ~1474 ms de latencia, avatar ilustrado 2D de Wetty, mediación pedagógica contrastiva y mazo SRS), la plataforma requiere evolucionar de un prototipo interactivo con personalidad a un **SaaS educativo institucional de alta retención**.

Este Plan Maestro aborda los tres pilares estratégicos solicitados:
1. **Personalización Integral del Usuario (E2E)**: Landing page de diseño moderno de alta conversión, Auth Wall estricto, Student Hub con estado en tiempo real y retos motivacionales dinámicos, complementado con una **Pre-sesión de Repaso (Warm-up Booster)** obligatoria antes de cada lección conversacional.
2. **Estructura Curricular Modular por Créditos y Libro Oficial de Estudio**: Reorganización formal del aprendizaje en niveles (36 créditos), módulos (12 créditos) y lecciones (2 créditos), respaldada por el **Polyglot Curriculum Handbook** (libro canónico oficial de enseñanza/aprendizaje con corpus gramatical, colocaciones y diálogos anotados).
3. **Módulo de Pruebas de Suficiencia Auditadas (Oral + Escrito)**: Sistema evaluativo de alta exigencia para diagnóstico inicial (*Placement Test*) y certificación de fin de nivel (*Level Exit Audit*), auditando objetivamente la producción escrita y oral bajo rúbricas inmutables y emitiendo un Certificado Digital verificable.

---

## 2. Fundamentos Científicos y Casos de Éxito Internacionales

El diseño de este plan no se basa en heurísticas empíricas arbitrarias, sino en la convergencia de la psicolingüística contemporánea, la psicometría computacional y los casos de mayor éxito en la industria EdTech global:

```
+---------------------------------------------------------------------------------------------------+
|                                  PILAR CIENTÍFICO Y EMPÍRICO                                     |
+------------------------------------+--------------------------------+-----------------------------+
| Marco / Referencia                 | Evidencia Científica / Autores | Implementación en Polyglot  |
+------------------------------------+--------------------------------+-----------------------------+
| 1. Descriptores Can-Do y Créditos  | Consejo de Europa (CEFR 2020)  | Estructura de 36 créditos   |
|    Académicos ECTS/Carnegie        | Casos: Busuu/McGraw-Hill,      | por nivel CEFR; metas       |
|                                    | Babbel Intensive               | conductuales verificables.  |
|                                    |                                |                             |
| 2. Pre-sesión de Repaso            | Testing Effect & Active Recall | Warm-up Booster de 90s      |
|    (Retrieval Practice)            | (Roediger & Karpicke, 2006);   | con 3 tarjetas clave antes  |
|                                    | Cognitive Load Theory (Sweller)| del diálogo con Wetty.      |
|                                    |                                |                             |
| 3. Pruebas de Suficiencia          | Duolingo English Test (DET)    | Examen adaptativo trifásico |
|    Auditadas (CAT & IRT)           | (Settles et al., 2020);        | (Cloze + Redacción +        |
|                                    | ACTFL OPI/WPT Guidelines       | Entrevista Oral auditada).  |
|                                    |                                |                             |
| 4. Psicología Motivacional y       | Self-Efficacy Theory (Bandura) | Micro-copy motivador según  |
|    Filtro Afectivo                 | Affective Filter (Krashen 1982)| racha y métricas reales;    |
|                                    | Growth Mindset (Carol Dweck)   | retos diarios y semanales.  |
+------------------------------------+--------------------------------+-----------------------------+
```

### 2.1. El Efecto del Calentamiento Cognitivo (Retrieval Practice)
La investigación en neurociencia del aprendizaje (*Roediger & Karpicke, 2006; Karpicke & Blunt, 2011*) demuestra que la recuperación activa de conceptos (*active recall*) inmediatamente antes de una tarea compleja incrementa la retención a largo plazo en un **400%** comparado con la simple relectura. 

En la adquisición de segundas lenguas, la teoría de la carga cognitiva de Sweller postula que si un estudiante principiante (A1–A2) entra directamente a un escenario conversacional sin haber "precargado" las colocaciones y estructuras clave en su memoria fonológica de trabajo, el esfuerzo de recuperación léxica bloquea la fluidez sintáctica y detona ansiedad comunicativa (*Krashen's Affective Filter*). El **Warm-up Booster** de Polyglot Voice mitiga este fenómeno en 90 segundos.

### 2.2. Estandarización de Créditos y Casos Busuu / Babbel
Busuu logró asociarse con McGraw-Hill Education mediante la creación de un plan de estudios estructurado en niveles CEFR donde cada módulo representa competencias comprobables. En nuestro modelo, el crédito académico actúa como unidad atómica de progreso: **1 Crédito = 1 unidad de logro verificada** (1 sesión conversacional exitosa con $\ge 75\%$ de metas logradas + 1 tarea de consolidación escrita o repaso léxico).

### 2.3. Evaluación Adaptativa por Computadora (CAT) y Caso DET
El *Duolingo English Test* demostró que un examen adaptativo de 45 minutos puede alcanzar la misma validez psicométrica que un TOEFL de 3 horas. Polyglot Voice adopta la rúbrica multidimensional del CEFR Companion Volume (2020):
- **Precisión Gramatical** (*Grammatical Accuracy*): Control de flexiones, tiempos y orden oracional.
- **Amplitud y Variedad Léxica** (*Lexical Resource / Type-Token Ratio*).
- **Fluidez Oral y Discurso** (*Speech Rate & Turn Hesitation*).
- **Control Fonológico** (*Pronunciation & Phonemic Contrast*).
- **Adecuación Pragmática y Coherencia** (*Sociolinguistic Appropriateness*).

---

## 3. Pilar 1: Personalización E2E, Auth Wall, Landing Page y Pre-sesión de Repaso

```
[ Visitante Público ] 
       │
       ▼
[ Landing Page de Alta Conversión ] ──▶ [ Modal Login / Registro (Supabase / Local) ]
                                                        │
                                                        ▼ (Sesión Autenticada)
                                           [ Student Hub / Dashboard ]
                                           ├── Estado de Nivel & Créditos
                                           ├── Radar de Competencias
                                           ├── Racha & Mensaje Motivador
                                           └── Retos del Día / Semana
                                                        │
                                                        ▼ [ Continuar Lección ]
                                           [ Warm-up Booster (90s) ]
                                           ├── 3 Tarjetas SRS / Active Recall
                                           └── Micro-corrección Estructural
                                                        │ (Superado: +10 XP)
                                                        ▼
                                           [ Sesión en Vivo con Wetty ]
```

### 3.1. Landing Page Elegante y Moderna
- **Estética Visual**: Estilo Obsidian/Praktika en modo oscuro (`#0b0f17`, `#111827`, `#6366f1`, `#06b6d4`), tipografía moderna *Plus Jakarta Sans*, contrastes limpios y diseño responsivo para móviles (390px) y pantallas de escritorio.
- **Secciones del Landing Page**:
  1. **Hero Section**:
     - Titular motivador: *"Habla inglés y mandarín con fluidez real desde tu primera sesión"*.
     - Subtítulo: *"Inmersión conversacional asistida por IA con facilitación pedagógica instantánea, retroalimentación nativa y currículum por créditos"*.
     - Tarjeta interactiva con el avatar 2D de Wetty y muestra de voz sintetizada.
     - Botón principal de llamada a la acción (CTA): `[ 🚀 Comenzar Mi Aprendizaje ]` y `[ Iniciar Sesión ]`.
  2. **Comparativa Metodológica Contrastiva**:
     - *Apps tradicionales*: Repetición de palabras sueltas, opción múltiple estéril, nula corrección de habla real.
     - *Polyglot Voice*: Inmersión guiada por roles, facilitador pedagógico que enseña la forma estándar y el giro nativo, y seguimiento por créditos auditables.
  3. **Módulos y Demo Visual**:
     - Exhibición interactiva de la tarjeta del facilitador (aliento, regla contrastiva, alternativa nativa, botón de repetición).
     - Vista del Mazo de Vocabulario SRS y detección de tonos fonéticos.
  4. **Prueba Social y Garantía de Estándar**:
     - Alineación con los estándares oficiales CEFR (A1–C1) y HSK (1–3).

### 3.2. Auth Wall Obligatorio y Persistencia Multi-Tenant
- **Barrera de Acceso**: La aplicación conversacional y los módulos de práctica quedan estrictamente protegidos tras el muro de autenticación. Los usuarios no autenticados solo tienen acceso al Landing Page y al diálogo de autenticación.
- **Manejo de Sesión**:
  - Al iniciar sesión mediante Supabase Auth o el almacén local seguro (PBKDF2 con sal criptográfica), el estado almacena el token JWT y el identificador de usuario `user_id` / `tenant_id`.
  - El backend valida el encabezado `Authorization: Bearer <token>` en todas las rutas protegidas (`/api/state`, `/api/chat`, `/api/cards`, `/api/proficiency/*`).
- **Cierre de Sesión Limpio**: Botón de Logout en el avatar de usuario que purga tokens en `localStorage`/`sessionStorage` y restablece la vista al Landing Page.

### 3.3. Student Hub / Dashboard del Alumno
Al acceder, el usuario visualiza su panel de control personalizado:
1. **Header de Progreso**:
   - Saludo personalizado: *"¡Hola, [Nombre]! Listo para tu sesión de hoy."*
   - Insignia de Nivel Actual: `Nivel A1 · Principiante Acceso`.
   - Transcripción de Créditos: `14 / 36 Créditos de Nivel A1 acumulados` con barra de progreso porcentual.
   - Experiencia y Racha: `🔥 Racha de 3 días` | `⭐ 245 XP`.
2. **Radar de Competencias Cuadridimensional**:
   - Comprensión Auditiva (82%) | Fluidez y Ritmo (65%) | Precisión Gramatical (70%) | Riqueza de Vocabulario (78%).
3. **Retos Dinámicos Activos**:
   - *Reto Diario*: *"Completa el Warm-up y 1 lección hoy"* (+25 XP).
   - *Reto Semanal*: *"Alcanza 6 créditos y 15 turnos de conversación con Wetty"* (+100 XP).
4. **Micro-copy Motivador Adaptativo**:
   - Algoritmo que evalúa la última sesión del alumno y genera mensajes basados en la teoría de autoeficacia:
     - Si la gramática mejoró: *"Tu uso de los auxiliares 'do/does' subió 12% ayer. ¡Tu precisión está despegando!"*
     - Si hubo errores recurrentes: *"Los errores son el mapa de tu aprendizaje. Hoy dominaremos 'I want' vs 'I would like'."*
     - Si tiene racha alta: *"4 días consecutivos construyendo nuevos caminos neuronales en inglés. ¡Mantén el fuego!"*

### 3.4. Pre-sesión de Repaso (Warm-up Booster)
Antes de ingresar a la lección seleccionada:
1. El botón `[ Iniciar Lección ]` del Dashboard abre el modal **Warm-up Booster**.
2. **3 Micro-Retos de Recuperación Activa** (duración: ~90 segundos):
   - *Micro-Reto 1 (Léxico clave)*: Presentación de un término de la lección previa o del mazo SRS con audio nativo; el alumno debe seleccionar su traducción o pronunciarlo.
   - *Micro-Reto 2 (Reparación de frase)*: Se muestra una frase con el error típico del nivel (ej. *"She have two cats"*) y el alumno selecciona la corrección (*"She has two cats"*).
   - *Micro-Reto 3 (Anticipación comunicativa)*: Una pregunta breve en el idioma meta que introduce el tema de la lección (ej. *"Are you ready to order?"* $\rightarrow$ Selección de *"Yes, please"*).
3. **Recompensa**: Al completar los 3 micro-retos, se acreditan +10 XP con animación de logro y se transiciona directamente al diálogo inmersivo con Wetty, la cual saluda haciendo referencia al éxito del calentamiento.

---

## 4. Pilar 2: Estructura Curricular por Créditos y Libro Oficial de Estudio (Textbook)

```
[ NIVEL CEFR: 36 CRÉDITOS ]
  │
  ├── MÓDULO 1: Primeros Contactos y Supervivencia (12 Créditos)
  │     ├── Lección 1: En la Cafetería (2 Créditos) ─────────┐
  │     ├── Lección 2: Check-in en el Hotel (2 Créditos)      │
  │     ├── Lección 3: En el Taxi y Direcciones (2 Créditos)  │  [ GUÍA OFICIAL DE ESTUDIO ]
  │     ├── Lección 4: Menús y Preferencias (2 Créditos)      ├──▶ 📖 Handbook Digital:
  │     ├── Lección 5: Información Personal (2 Créditos)      │    - Descriptores Can-Do
  │     └── Lección 6: Hito Integrador Módulo 1 (2 Créditos)  │    - Corpus Gramatical Canónico
  │                                                           │    - Colocaciones & Fonética
  ├── MÓDULO 2: Interacción Social y Rutinas (12 Créditos)    │    - Diálogo Modelo Anotado
  │     └── [Lecciones 7 a 12: 2 Créditos c/u]                │
  │                                                           │
  └── MÓDULO 3: Servicios, Compras y Trabajo (12 Créditos)    │
        └── [Lecciones 13 a 18: 2 Créditos c/u] ──────────────┘
```

### 4.1. Sistema de Créditos Académicos (Equivalencia ECTS/EdTech)
- **Regla de Ponderación**:
  - Cada nivel CEFR se compone de **36 créditos** estructurados en **3 módulos temáticos de 12 créditos cada uno**.
  - Cada módulo contiene **6 lecciones de 2 créditos cada una**.
  - **Desglose de los 2 Créditos por Lección**:
    - **1 Crédito**: Ejecución de la sesión de conversación con Wetty cumpliendo al menos 2 de los 3 objetivos *Can-Do* con puntaje $\ge 70/100$.
    - **1 Crédito**: Completar la tarea de consolidación posterior (Warm-up superado + guardado de 2 tarjetas al mazo SRS o redacción de 1 frase resumen).
- **Condición de Desbloqueo**: Al acumular los 36 créditos de un nivel, se desbloquea automáticamente el acceso al **Examen de Suficiencia de Salida de Nivel**.

### 4.2. Documento Base Oficial de Aprendizaje ("Polyglot Curriculum Handbook")
Para dotar de solidez institucional al aprendizaje, cada lección cuenta con su **Capítulo Oficial de Enseñanza/Aprendizaje** integrado en la plataforma a través de un lector modal interactivo (`[ 📖 Guía Oficial de Estudio ]`).

#### Estructura Estándar de la Ficha Canónica por Lección:
1. **Identificador Canónico**: Código único (ej. `EN-A1-M1-L2`), Título oficial, Nivel CEFR, Créditos asignados y Duración sugerida.
2. **Descriptores Conductuales Can-Do (CEFR Companion Volume 2020)**:
   - *"El alumno es capaz de solicitar un servicio básico formulando una petición formal con 'Could I have...' o 'Can I have...'."*
   - *"El alumno comprende preguntas rutinarias de confirmación de datos personales formuladas por el recepcionista."*
3. **Corpus Gramatical Canónico y Mediación Contrastiva**:
   - Explicación de la regla sin tecnicismos innecesarios.
   - Tabla de contraste español-inglés para erradicar vicios fósiles (ej. uso incorrecto de *"I have 30 years"* frente a *"I am 30 years old"*).
4. **Glosario de Colocaciones y Frecuencia Léxica**:
   - Lista de 8 a 10 unidades léxicas de alta frecuencia con transcripción fonética IPA, función gramatical, colocación típica y audio nativo reproducible con un clic.
5. **Diálogo Modelo Anotado**:
   - Transcripción de una interacción modelo nativa completa con llamadas al margen sobre pragmática, cortesía y registro.
6. **Ficha de Tareas y Metas de Salida**:
   - Tarea previa (calentamiento), tarea central (conversación en vivo) y tarea posterior (fijación en SRS).

---

## 5. Pilar 3: Módulo de Pruebas de Suficiencia Auditada (Oral + Escrito)

```
[ SOLICITUD DE PRUEBA DE SUFICIENCIA ]
  │
  ├── Modalidad 1: Test de Ubicación Diagnóstico (Placement Test)
  └── Modalidad 2: Examen de Certificación de Nivel (Level Exit Exam)
  │
  ▼
[ FASE A: Comprensión y Precisión Estructural (5 min) ]
  ├── 6 Reactivos Adaptativos (Cloze Test + Audio)
  └── Control estricto de tiempo (45s por reactivo)
  │
  ▼
[ FASE B: Producción Escrita Auditada (6 min) ]
  ├── Redacción de 40 a 80 palabras sobre un prompt situacional
  └── Auditoría IA: TTR (riqueza léxica), sintaxis, puntuación y cohesión
  │
  ▼
[ FASE C: Entrevista Oral en Vivo con Wetty (5 min) ]
  ├── 4 Turnos no guionados en rol de examinadora
  └── Medición de latencia de habla, fluidez, pronunciación y adecuación
  │
  ▼
[ INFORME DE AUDITORÍA INMUTABLE & CERTIFICADO DIGITAL ]
  ├── Registro en DB (proficiency_audits) con Hash de Verificación
  ├── Desglose porcentual por sub-competencia (0–100)
  └── Promoción oficial de nivel o reubicación curricular
```

### 5.1. Doble Modalidad del Módulo
1. **Test de Ubicación Diagnóstico (*Placement Test*)**:
   - Disponible en el primer inicio de sesión para saltar niveles si el usuario cuenta con conocimientos previos.
   - Evalúa de forma transversal desde A1 hasta B2 para ubicar con exactitud el punto de inicio.
2. **Examen de Certificación de Nivel (*Level Exit Audit*)**:
   - Examen de alta exigencia que se desbloquea al acumular los 36 créditos del nivel actual.
   - La aprobación con puntaje global $\ge 75\%$ promueve oficialmente al usuario al siguiente nivel CEFR/HSK.

### 5.2. Estructura de las Fases del Examen

#### Fase A: Comprensión y Precisión Estructural (CAT Cloze Test)
- **Mecánica**: 6 reactivos adaptativos de opción múltiple y relleno de espacios en blanco con audio modelo.
- **Teoría de Respuesta al Ítem (IRT)**: Si el usuario responde correctamente un reactivo A1, el siguiente se calibra a A2; si falla, se mantiene en A1.
- **Tiempo límite**: 45 segundos por pregunta con temporizador visual para evitar consultas externas.

#### Fase B: Producción Escrita Auditada (Written Assessment)
- **Mecánica**: El sistema genera un prompt situacional aleatorio adaptado al nivel objetivo (ej. *"Escribe un correo electrónico formal de 50 palabras a un hotel solicitando la confirmación de tu reserva y pidiendo una habitación silenciosa"*).
- **Rúbrica Automatizada con Gemini**:
  - *Riqueza Léxica*: Índice Type-Token Ratio (variedad de vocabulario sin repeticiones básicas).
  - *Precisión Sintáctica*: Uso correcto de tiempos verbales, concordancia sujeto-verbo y conectores.
  - *Cohesión y Registro*: Organización del texto y adecuación al tono requerido (formal/informal).

#### Fase C: Entrevista Oral Auditada con Wetty (Spoken Assessment)
- **Mecánica**: Diálogo oral en vivo de 4 turnos donde Wetty asume el rol de **Examinadora Formal**.
- **Diferencia con las lecciones habituales**:
  - Durante el examen, Wetty no interrumpe con el Facilitador Pedagógico ni ofrece pistas.
  - Wetty formula preguntas abiertas de dificultad gradual, seguidas de contra-preguntas que exigen justificación o descripción detallada.
- **Métricas Auditadas**:
  - *Fluidez Temporal*: Medición del tiempo de vacilación (*pause latency*) antes de emitir la respuesta.
  - *Adecuación Pragmática*: Capacidad de responder directamente a lo solicitado sin evasivas.
  - *Control Fonológico*: Análisis de inteligibilidad acústica y contorno de tonos en mandarín.

### 5.3. Registro de Auditoría y Certificación
- Cada prueba genera un registro inmutable en la tabla `proficiency_audits` con:
  - `user_id`, `test_type`, `overall_score`, `scores` por sub-competencia (Gramática, Léxico, Fluidez, Escritura).
  - Transcripciones completas del diálogo y texto del alumno.
  - `certificate_code`: Código alfanumérico único para verificación institucional.
- Se genera un **Certificado Digital de Competencia** con diseño prémium exportable a PDF.

---

## 6. Arquitectura Técnica y Modelo de Datos Multi-Tenant

### 6.1. Esquema Relacional en Supabase (`supabase/migrations/004_curriculum_suficiencia.sql`)

```sql
-- 1. Registro de Créditos y Progreso Curricular por Usuario
CREATE TABLE IF NOT EXISTS public.user_credits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  lang VARCHAR(8) NOT NULL DEFAULT 'en',
  level VARCHAR(8) NOT NULL, -- 'A1', 'A2', 'B1', etc.
  module_id VARCHAR(64) NOT NULL,
  lesson_id VARCHAR(64) NOT NULL,
  credits_earned INTEGER NOT NULL DEFAULT 2,
  score INTEGER NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_lesson UNIQUE (user_id, lang, level, lesson_id)
);

ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_credits_isolation" ON public.user_credits
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 2. Auditoría Inmutable de Pruebas de Suficiencia
CREATE TABLE IF NOT EXISTS public.proficiency_audits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  lang VARCHAR(8) NOT NULL DEFAULT 'en',
  test_type VARCHAR(32) NOT NULL, -- 'placement' | 'certification_exit'
  target_level VARCHAR(8) NOT NULL,
  assigned_level VARCHAR(8) NOT NULL,
  overall_score NUMERIC(5,2) NOT NULL,
  grammar_score NUMERIC(5,2) NOT NULL,
  vocabulary_score NUMERIC(5,2) NOT NULL,
  fluency_score NUMERIC(5,2) NOT NULL,
  written_score NUMERIC(5,2) NOT NULL,
  audio_transcripts JSONB NOT NULL DEFAULT '[]'::jsonb,
  written_submission TEXT,
  examiner_notes TEXT,
  certificate_code VARCHAR(32) UNIQUE,
  passed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.proficiency_audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "proficiency_audits_isolation" ON public.proficiency_audits
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 3. Retos Motivacionales y Registro de Cumplimiento
CREATE TABLE IF NOT EXISTS public.user_challenges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  challenge_type VARCHAR(16) NOT NULL, -- 'daily', 'weekly'
  title TEXT NOT NULL,
  target_count INTEGER NOT NULL,
  current_count INTEGER NOT NULL DEFAULT 0,
  xp_reward INTEGER NOT NULL DEFAULT 25,
  completed BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_challenges_isolation" ON public.user_challenges
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

### 6.2. Contratos de API REST (Backend Zero-Dependency)
1. `GET /api/hub/status`:
   - Devuelve: `{ ok: true, user: { name, level, credits, totalCreditsNeeded, streak, xp, radar: { grammar, vocabulary, fluency, comprehension } }, challenges: [...], motivationalQuote }`.
2. `GET /api/curriculum/handbook/:lang/:level/:lessonId`:
   - Devuelve la ficha oficial canónica con todos los metadatos y contenidos del libro de estudio.
3. `POST /api/curriculum/complete-lesson`:
   - Payload: `{ lang, level, moduleId, lessonId, score, completedObjectives }`.
   - Asigna los 2 créditos en `user_credits` y valida promoción si suma 36 créditos.
4. `POST /api/warmup/generate`:
   - Devuelve 3 micro-ejercicios adaptados a la lección seleccionada.
5. `POST /api/proficiency/start`:
   - Inicia sesión de prueba de suficiencia y bloquea trampas de concurrencia.
6. `POST /api/proficiency/submit-written`:
   - Evalúa el ensayo con rúbrica CEFR mediante `gemini-3.5-flash` con esquema OpenAPI estricto.
7. `POST /api/proficiency/finalize`:
   - Consolida puntajes de audio y escritura, genera el certificado y actualiza el nivel del usuario.

---

## 7. Plan de Implementación Paso a Paso (Fases de Ejecución)

### FASE 1: Personalización E2E, Landing Page, Auth Wall y Pre-sesión de Repaso
- **Hito 1.1**: Creación del componente `Landing Page` con estética oscura obsidian, tipografía Plus Jakarta Sans, hero con Wetty y tabla comparativa.
- **Hito 1.2**: Implementación del Auth Wall estricto en frontend (`public/app.js`) y backend (`server.js`), ocultando la app a visitantes y habilitando logout fluido.
- **Hito 1.3**: Creación del `Student Hub` (Dashboard con radar de competencias, contador de créditos, racha y retos diarios).
- **Hito 1.4**: Modal interactivo de `Warm-up Booster` (3 micro-retos de recuperación activa) previo a conectar la lección en vivo con Wetty.
- **Verificación**: Batería de pruebas unitarias para Auth Wall, cálculo de retos y flujo de calentamiento.

### FASE 2: Estructura Curricular por Créditos y Libro Oficial de Estudio
- **Hito 2.1**: Definición del catálogo modular completo (36 créditos por nivel, 12 por módulo, 2 por lección) en `lib/curriculumData.js`.
- **Hito 2.2**: Redacción y estructuración del **Polyglot Curriculum Handbook** para todas las lecciones de A1 y A2.
- **Hito 2.3**: Componente visual `Handbook Modal` con tipografía editorial, colocaciones y reproductores de audio.
- **Hito 2.4**: Sistema de persistencia de créditos en Supabase y Store local con actualización reactiva en pantalla.
- **Verificación**: Tests de no-duplicidad de créditos y avance secuencial verificado.

### FASE 3: Módulo de Pruebas de Suficiencia Auditada (Oral + Escrito)
- **Hito 3.1**: Motor evaluador `lib/proficiencyAuditor.js` con soporte para CAT Cloze, Rúbrica de Redacción CEFR y Rúbrica Oral.
- **Hito 3.2**: Vista de Examen de Suficiencia en pantalla completa con cronómetro, editor de texto y turnos orales formales con Wetty.
- **Hito 3.3**: Generador de Reporte de Auditoría e Inmutabilidad en base de datos.
- **Hito 3.4**: Plantilla visual y exportador de Certificado Digital de Competencia con código único de validación.
- **Verificación**: Tests E2E de auditoría completa con casos A1 aprobados y no aprobados.

---

## 8. Definition of Done (DoD)

1. **Código y Calidad**:
   - Todo el código implementado bajo estándares de Type Safety (sin `any`, validación estricta con esquemas JSON).
   - Zero-dependency en el backend nativo Node.js 20+ ESM.
   - Aislamiento multi-tenant 100% verificado (`user_id = auth.uid()`).
2. **Evidencia y Pruebas**:
   - 100% de la suite de pruebas unitarias (`node --test`) pasando limpiamente.
   - Latencia conversacional promedio sostenida en $\le 1600$ ms.
   - Pruebas visuales en viewport móvil (390x844) y desktop.
3. **Documentación**:
   - Actualización completa de `MEMORY.md` con las nuevas tablas relacionales y decisiones de arquitectura.
   - Archivos del Plan Maestro generados y persistidos en la carpeta (`.md` y `.pdf`).
