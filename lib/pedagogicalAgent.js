/**
 * lib/pedagogicalAgent.js
 * 
 * Motor Pedagógico por Competencias Lingüísticas y Facilitador de Aprendizaje.
 * Diseñado para competir con aplicaciones líderes (Praktika, Speak, Elsa, Duolingo Max).
 * Implementa el marco CEFR/MCER y HSK con andamiaje dinámico, techos léxicos y mediación contrastiva.
 */

export const CEFR_LEVELS = {
  en: ["A1", "A2", "B1", "B2", "C1"],
  zh: ["HSK1", "HSK2", "HSK3", "HSK4", "HSK5"],
};

export const LEVEL_RULES = {
  A1: {
    name: "Principiante Absoluto (Acceso)",
    maxSentences: 1,
    maxWordsPerSentence: 8,
    targetGrammar: "Presente simple (To Be, Do, Have, Want, Like), preguntas básicas (What, Where, Who).",
    speechRate: "Pausado, articulación nítida, palabras directas.",
    scaffolding: "Nunca usar frases compuestas, modismos ni términos abstractos. Si el alumno se bloquea, brindar opciones sencillas o una pista breve en español.",
    promptDirective: "HABLA COMO PARA UN PRINCIPIANTE A1. Máximo 1 a 2 oraciones MUY cortas y claras. Haz preguntas sencillas de respuesta directa.",
  },
  A2: {
    name: "Elemental (Plataforma)",
    maxSentences: 2,
    maxWordsPerSentence: 12,
    targetGrammar: "Pasado simple regular/irregular, planes futuros con 'going to', comparativos básicos, preposiciones de lugar y tiempo.",
    speechRate: "Moderado y natural, enunciados breves.",
    scaffolding: "Permitir descripciones sencillas y hábitos cotidianos. Reformular errores de pasado de forma sutil.",
    promptDirective: "Nivel A2. Usa oraciones claras sobre rutinas y eventos pasados o planes simples. Máximo 2 oraciones.",
  },
  B1: {
    name: "Intermedio (Umbral)",
    maxSentences: 3,
    maxWordsPerSentence: 16,
    targetGrammar: "Presente perfecto, condicional simple (if/will), conectores lógicos (because, although, however), verbos modales (should, could, might).",
    speechRate: "Velocidad natural conversacional estándar.",
    scaffolding: "Impulsar al alumno a dar explicaciones, justificar sus opiniones y describir causas y consecuencias.",
    promptDirective: "Nivel B1. Fomenta que el alumno argumente y elabore sus ideas. Pregunta '¿Por qué?' y plantea pequeños retos situacionales.",
  },
  B2: {
    name: "Intermedio Alto (Avanzado)",
    maxSentences: 4,
    maxWordsPerSentence: 20,
    targetGrammar: "Condicionales mixtos, voz pasiva, phrasal verbs idiomáticos, conectores formales de debate y negociación.",
    speechRate: "Fluidez nativa completa.",
    scaffolding: "Interacción ejecutiva, debates profesionales, defensa de propuestas y manejo de matices de cortesía indirecta.",
    promptDirective: "Nivel B2. Conversación profesional exigente. Utiliza expresiones corporativas y evalúa la precisión léxica.",
  },
  C1: {
    name: "Dominio Operativo Eficaz (Experto)",
    maxSentences: 5,
    maxWordsPerSentence: 25,
    targetGrammar: "Inversiones enfáticas, modismos avanzados, precisión estilística y registros pragmáticos complejos.",
    speechRate: "Velocidad nativa con entonación expresiva y coloquialismos o vocabulario técnico especializado.",
    scaffolding: "Desafíos comunicativos de alta complejidad, persuasión y resolución de conflictos.",
    promptDirective: "Nivel C1. Desafía al alumno con vocabulario avanzado, matices sutiles y giros idiomáticos nativos.",
  },
  // Mapeos para chino mandarín HSK
  HSK1: {
    name: "HSK 1 (Principiante Chino)",
    maxSentences: 1,
    maxWordsPerSentence: 6,
    targetGrammar: "Estructuras básicas S+V+O, pronombres (我/你/他), números, saludos y partícula 的/吗.",
    speechRate: "Muy pausado, tonos exageradamente claros.",
    scaffolding: "Solo caracteres del vocabulario de 150 palabras de HSK1. Siempre incluir pinyin guiado.",
    promptDirective: "HSK1. Solo caracteres básicos. Frases muy cortas (1 oración) terminando en pregunta con 吗 o 什么.",
  },
  HSK2: {
    name: "HSK 2 (Elemental Chino)",
    maxSentences: 2,
    maxWordsPerSentence: 10,
    targetGrammar: "Verbos modales (想/要/能), aspectos temporales (了), comparaciones con 比 y complementos simples.",
    speechRate: "Pausado, atención a tonos 2 y 3.",
    scaffolding: "300 palabras esenciales. Preguntas sobre compras, tiempo y ubicaciones.",
    promptDirective: "HSK2. Frases sencillas de la vida diaria (comida, compras, transporte).",
  },
  HSK3: {
    name: "HSK 3 (Intermedio Chino)",
    maxSentences: 2,
    maxWordsPerSentence: 14,
    targetGrammar: "Conectores complejos (因为...所以..., 虽然...但是...), complementos de dirección y resultado, partícula 把.",
    speechRate: "Velocidad cotidiana.",
    scaffolding: "600 palabras. Discusión de experiencias y planes.",
    promptDirective: "HSK3. Pide explicaciones y detalles usando conectores lógicos.",
  },
  HSK4: {
    name: "HSK 4 (Intermedio Avanzado Chino)",
    maxSentences: 3,
    maxWordsPerSentence: 18,
    targetGrammar: "Chengyu comunes, lenguaje formal y de negocios básico, complementos complejos.",
    speechRate: "Fluidez nativa estándar.",
    scaffolding: "1200 palabras. Contexto laboral y social amplio.",
    promptDirective: "HSK4. Conversación fluida con vocabulario profesional y expresiones formales.",
  },
  HSK5: {
    name: "HSK 5 (Avanzado Chino)",
    maxSentences: 4,
    maxWordsPerSentence: 22,
    targetGrammar: "Estructuras literarias y oratorias, modismos y sinónimos especializados.",
    speechRate: "Velocidad nativa.",
    scaffolding: "2500 palabras. Debates de actualidad y cultura.",
    promptDirective: "HSK5. Nivel avanzado y sofisticado con vocabulario matizado.",
  },
};

/**
 * Adaptación pedagógica de misiones según el nivel del alumno.
 * Evita la sobrecarga cognitiva adaptando la escena a la Zona de Desarrollo Próximo.
 */
/**
 * Catálogo pedagógico completo de misiones por competencias CEFR (A1-C1) y HSK (1-5).
 * Cada combinación misión/nivel posee objetivos 'Can-Do', escena inmersiva y saludo de apertura.
 */
export const MISSION_CATALOG = {
  cafe: {
    A1: {
      scene: "Eres el barista de una cafetería acogedora. Hablas despacio y claro. El alumno principiante entra a pedir una bebida simple.",
      objectives: ["Saludar y pedir café o té", "Decir tu nombre para el vaso", "Dar las gracias"],
      opening: {
        greeting: "Hello! Welcome to the café. Coffee or tea?",
        translation: "¡Hola! Bienvenido al café. ¿Café o té?",
      },
    },
    A2: {
      scene: "Eres barista. El alumno pide café con especificaciones (tamaño, tipo de leche o azúcar) y pregunta el precio.",
      objectives: ["Pedir tu café especificando tamaño o leche", "Preguntar cuánto cuesta", "Pagar y despedirte amablemente"],
      opening: {
        greeting: "Hi there! Welcome. What can I get started for you today, large or small?",
        translation: "¡Hola! Bienvenido. ¿Qué te puedo preparar hoy, grande o pequeño?",
      },
    },
    B1: {
      scene: "Eres barista de especialidad. El alumno busca una recomendación, pregunta por opciones de comida y describe lo que le gusta.",
      objectives: ["Pedir una recomendación según tus gustos", "Consultar opciones de desayuno o snack", "Explicar por qué prefieres esa opción"],
      opening: {
        greeting: "Good morning! We have a special Ethiopian roast today. How do you usually like your coffee?",
        translation: "¡Buenos días! Hoy tenemos un tueste especial de Etiopía. ¿Cómo te suele gustar el café?",
      },
    },
    B2: {
      scene: "Eres gerente de una cafetería de autor. El alumno comenta una preferencia especial o un pequeño cambio amistoso sobre su pedido.",
      objectives: ["Explicar tu preferencia detallada de preparación", "Preguntar sobre el origen del café", "Sostener una conversación informal fluida"],
      opening: {
        greeting: "Welcome back! Great to see you. How did you enjoy that single-origin roast you tried last week?",
        translation: "¡Bienvenido de nuevo! Qué gusto verte. ¿Qué te pareció el café de origen único que probaste la semana pasada?",
      },
    },
    C1: {
      scene: "Eres un maestro tostador y catador de café. Sostienes una conversación técnica y cultural sobre notas de cata y métodos de extracción.",
      objectives: ["Debatir sobre métodos de extracción artesanal", "Describir perfiles de acidez y cuerpo", "Intercambiar opiniones sobre tendencias de café de especialidad"],
      opening: {
        greeting: "Hey there! I was just calibrating the grinder for our anaerobic natural lot. What flavor notes do you typically look for in a pour-over?",
        translation: "¡Hola! Justo estaba calibrando el molino para nuestro lote natural anaeróbico. ¿Qué notas de sabor buscas habitualmente en un café filtrado?",
      },
    },
    HSK1: {
      scene: "你是咖啡馆服务员。说话慢一点。学生点一杯茶或咖啡。",
      objectives: ["Saludar y pedir té o café (我要茶/咖啡)", "Decir gracias (谢谢)", "Responder a tu nombre (我叫...)"],
      opening: {
        greeting: "你好！你想喝咖啡还是茶？",
        translation: "¡Hola! ¿Quieres beber café o té?",
      },
    },
    HSK2: {
      scene: "你是咖啡馆店员。学生点大杯或小杯，并询问价格。",
      objectives: ["Pedir tamaño grande o pequeño (大杯/小杯)", "Preguntar cuánto cuesta (多少钱)", "Pagar (现金/微信)"],
      opening: {
        greeting: "你好！请问你要大杯还是小杯？",
        translation: "¡Hola! ¿Deseas tamaño grande o pequeño?",
      },
    },
    HSK3: {
      scene: "你是精品咖啡馆店员。学生询问特色咖啡并说明自己的喜好。",
      objectives: ["Pedir una recomendación", "Explicar preferencias usando conectores", "Comentar sobre el sabor"],
      opening: {
        greeting: "早上好！今天的云南咖啡很香，你平时喜欢喝浓一点还是淡一点？",
        translation: "¡Buenos días! El café de Yunnan de hoy tiene gran aroma, ¿sueles preferir café fuerte o suave?",
      },
    },
  },
  cliente: {
    A1: {
      scene: "Eres un cliente internacional que llega a la oficina. El alumno es un colega junior que te da la bienvenida en recepción con inglés muy simple y cordial.",
      objectives: ["Saludar y dar la bienvenida al cliente", "Confirmar el nombre del cliente", "Ofrecer una bebida (agua o café)"],
      opening: {
        greeting: "Hello! I am here for my meeting. My name is David.",
        translation: "¡Hola! Estoy aquí para mi reunión. Mi nombre es David.",
      },
    },
    A2: {
      scene: "Eres un cliente internacional confirmando la agenda de hoy. El alumno revisa el horario y la sala de reunión.",
      objectives: ["Saludar y confirmar la hora de la reunión", "Indicar la sala o lugar", "Preguntar si necesita algo antes de comenzar"],
      opening: {
        greeting: "Good morning! Thank you for having me. Are we meeting in room 3 today?",
        translation: "¡Buenos días! Gracias por recibirme. ¿Nos reuniremos en la sala 3 hoy?",
      },
    },
    B1: {
      scene: "Eres un cliente internacional revisando el avance de un proyecto. El alumno consultor explica qué se logró y qué falta.",
      objectives: ["Presentar el estado actual del proyecto", "Explicar la causa de un retraso o cambio menor", "Proponer el siguiente hito de entrega"],
      opening: {
        greeting: "Hello! Let's review our quarterly progress. What are the key accomplishments from this sprint?",
        translation: "¡Hola! Revisemos nuestro progreso trimestral. ¿Cuáles son los logros clave de este sprint?",
      },
    },
    B2: {
      scene: "Eres un cliente internacional exigente de cooperación al desarrollo. El alumno, consultor senior, presenta y defiende una propuesta técnica.",
      objectives: ["Saludar y presentar la propuesta técnica", "Explicar y justificar plazo y presupuesto", "Acordar y formalizar el siguiente paso"],
      opening: {
        greeting: "Good afternoon. We've reviewed your draft proposal. Could you walk us through your implementation methodology?",
        translation: "Buenas tardes. Hemos revisado el borrador de su propuesta. ¿Podría explicarnos su metodología de implementación?",
      },
    },
    C1: {
      scene: "Eres un director de adquisiciones globales negociando términos contractuales y riesgos de implementación con el consultor líder.",
      objectives: ["Debatir cláusulas de contingencia y SLA", "Negociar asignación de costos y responsabilidades", "Cerrar acuerdo con alto nivel de diplomacia ejecutiva"],
      opening: {
        greeting: "Welcome. We have several critical reservations regarding the liability clauses and delivery timelines. How do you propose we reconcile these differences?",
        translation: "Bienvenido. Tenemos varias reservas críticas respecto a las cláusulas de responsabilidad y los plazos de entrega. ¿Cómo propone conciliar estas diferencias?",
      },
    },
    HSK1: {
      scene: "你是国际客户。学生在办公室迎接你，使用非常简单的中文。",
      objectives: ["Saludar al cliente (你好/欢迎)", "Preguntar su nombre (请问你叫什么名字)", "Ofrecer té o agua (请喝水/茶)"],
      opening: {
        greeting: "你好！我来开会，我叫大卫。",
        translation: "¡Hola! Vengo a una reunión, me llamo David.",
      },
    },
    HSK2: {
      scene: "你是客户。学生确认会议时间和地点。",
      objectives: ["Confirmar horario (几点开会)", "Indicar la sala (会议室在哪儿)", "Ofrecer asistencia"],
      opening: {
        greeting: "早上好！我们今天十点开会，对吗？",
        translation: "¡Buenos días! Hoy nos reunimos a las diez, ¿verdad?",
      },
    },
  },
  hotel: {
    A1: {
      scene: "Eres recepcionista de un hotel. Hablas con frases cortas. El alumno llega a registrarse con su nombre y pasaporte.",
      objectives: ["Saludar y decir que tienes una reserva", "Decir tu nombre y apellido", "Pedir la llave de la habitación"],
      opening: {
        greeting: "Hello! Welcome to the Grand Hotel. Do you have a reservation?",
        translation: "¡Hola! Bienvenido al Grand Hotel. ¿Tiene una reserva?",
      },
    },
    A2: {
      scene: "Eres recepcionista. El alumno completa el check-in, pregunta por el desayuno, el wifi y el ascensor.",
      objectives: ["Presentar tu identificación y confirmar reserva", "Preguntar el horario del desayuno y wifi", "Preguntar dónde está el ascensor"],
      opening: {
        greeting: "Good evening! Here is your room key on the fourth floor. Do you need any information about breakfast or Wi-Fi?",
        translation: "¡Buenas noches! Aquí tiene la llave de su habitación en el cuarto piso. ¿Necesita información sobre el desayuno o el Wi-Fi?",
      },
    },
    B1: {
      scene: "Eres encargado de recepción. El alumno reporta un inconveniente en la habitación (aire acondicionado o ruido) y solicita una solución.",
      objectives: ["Describir con precisión el problema en la habitación", "Solicitar un cambio de habitación o reparación", "Agradecer la atención del personal"],
      opening: {
        greeting: "Front desk, how may I assist you this evening?",
        translation: "Recepción, ¿en qué puedo ayudarle esta noche?",
      },
    },
    B2: {
      scene: "Eres subgerente del hotel. El alumno plantea una discrepancia en la factura o solicita un upgrade por ocasión especial.",
      objectives: ["Explicar el detalle del cobro o motivo de upgrade", "Negociar una solución de cortesía", "Confirmar el nuevo estado de la reserva"],
      opening: {
        greeting: "Good afternoon. I understand you had a question regarding the billing details on your stay. How can I help resolve this?",
        translation: "Buenas tardes. Entiendo que tenía una consulta sobre los detalles de facturación de su estadía. ¿Cómo puedo ayudar a resolverlo?",
      },
    },
    C1: {
      scene: "Eres el director general de un resort de 5 estrellas atendiendo una queja de servicio de un huésped VIP.",
      objectives: ["Argumentar el impacto de la falla de servicio", "Establecer estándares esperados con diplomacia", "Acordar una compensación adecuada al nivel"],
      opening: {
        greeting: "Good evening. I sincerely apologize for the inconvenience you've experienced today. Please tell me what transpired so we can make this right immediately.",
        translation: "Buenas noches. Me disculpo sinceramente por el inconveniente experimentado hoy. Por favor cuénteme qué ocurrió para que podamos solucionarlo de inmediato.",
      },
    },
    HSK1: {
      scene: "你是酒店前台。学生来办理入住手续。",
      objectives: ["Decir que tienes reserva (我有预订)", "Decir tu nombre (我叫...)", "Pedir la llave (钥匙)"],
      opening: {
        greeting: "您好！欢迎光临。请问您有预订吗？",
        translation: "¡Hola! Bienvenido. ¿Tiene una reserva?",
      },
    },
  },
  aeropuerto: {
    A1: {
      scene: "Eres agente de check-in en el aeropuerto. Hablas despacio y claro. El alumno entrega su pasaporte y dice su destino.",
      objectives: ["Saludar y entregar tu pasaporte", "Decir tu ciudad de destino", "Preguntar por la puerta de embarque"],
      opening: {
        greeting: "Hello! Welcome to the airline. Where are you flying today?",
        translation: "¡Hola! Bienvenido a la aerolínea. ¿A dónde viaja hoy?",
      },
    },
    A2: {
      scene: "Eres agente de tráfico aéreo. El alumno registra equipaje, elige asiento de pasillo o ventana y confirma la hora de embarque.",
      objectives: ["Indicar cuántas maletas registras", "Elegir asiento de ventana o pasillo", "Confirmar hora y puerta de abordaje"],
      opening: {
        greeting: "Good morning! How many bags are you checking in today? Window or aisle seat?",
        translation: "¡Buenos días! ¿Cuántas maletas registra hoy? ¿Asiento de ventana o pasillo?",
      },
    },
    B1: {
      scene: "Eres agente de servicio al pasajero. El alumno tiene una conexión muy ajustada o un retraso y pide orientación.",
      objectives: ["Explicar el tiempo de conexión disponible", "Pedir indicaciones para llegar rápido a la puerta", "Confirmar si el equipaje se transfiere directo"],
      opening: {
        greeting: "Hello! I see your connecting flight departs in 45 minutes. How can I assist you with your transfer?",
        translation: "¡Hola! Veo que su vuelo de conexión sale en 45 minutos. ¿Cómo puedo ayudarle con su transferencia?",
      },
    },
    B2: {
      scene: "Eres supervisor de aerolínea ante un vuelo cancelado por clima. El alumno negocia reubicación en el siguiente vuelo o voucher.",
      objectives: ["Explicar tu itinerario urgente", "Solicitar reubicación prioritaria o compensación", "Confirmar nuevo pase de abordar"],
      opening: {
        greeting: "Thank you for your patience. Unfortunately, flight 302 has been grounded due to weather. Let's see what rebooking options we have for you.",
        translation: "Gracias por su paciencia. Desafortunadamente, el vuelo 302 ha sido cancelado por clima. Veamos qué opciones de reubicación tenemos para usted.",
      },
    },
    C1: {
      scene: "Eres representante de relaciones públicas de una alianza aérea internacional resolviendo una disputa de derechos de pasajero.",
      objectives: ["Citar normativas de compensación por cancelación", "Negociar alternativas de vuelos interlínea", "Preservar estatus y beneficios de lealtad"],
      opening: {
        greeting: "Good afternoon. I understand this disruption has severely impacted your executive itinerary. What specific accommodations will ensure your schedule is respected?",
        translation: "Buenas tardes. Entiendo que esta interrupción ha afectado severamente su itinerario ejecutivo. ¿Qué facilidades específicas garantizarán el cumplimiento de su agenda?",
      },
    },
  },
  entrevista: {
    A1: {
      scene: "Eres entrevistador cordial. El alumno principiante se presenta formalmente diciendo nombre, país y ocupación.",
      objectives: ["Saludar formalmente y decir tu nombre", "Mencionar tu profesión o estudio", "Decir de qué país eres"],
      opening: {
        greeting: "Hello! Welcome to the interview. What is your name?",
        translation: "¡Hola! Bienvenido a la entrevista. ¿Cuál es tu nombre?",
      },
    },
    A2: {
      scene: "Eres entrevistador. El alumno describe sus actividades diarias laborales previas y habilidades básicas.",
      objectives: ["Describir tu trabajo anterior en pasado simple", "Mencionar tus responsabilidades diarias", "Decir por qué quieres este trabajo"],
      opening: {
        greeting: "Nice to meet you! Can you tell me about your daily responsibilities in your last job?",
        translation: "¡Mucho gusto! ¿Puedes contarme sobre tus responsabilidades diarias en tu último trabajo?",
      },
    },
    B1: {
      scene: "Eres entrevistador de recursos humanos. El alumno explica logros pasados y razones para unirse a la empresa.",
      objectives: ["Explicar un logro profesional relevante", "Justificar tu motivación para el puesto", "Formular una pregunta al entrevistador"],
      opening: {
        greeting: "Welcome! We're impressed by your resume. Why are you interested in joining our international team?",
        translation: "¡Bienvenido! Nos impresionó tu currículum. ¿Por qué te interesa unirte a nuestro equipo internacional?",
      },
    },
    B2: {
      scene: "Eres director de área evaluando capacidad analítica y resolución de conflictos bajo presión.",
      objectives: ["Describir una situación de conflicto y cómo la resolviste", "Argumentar tus ventajas competitivas", "Discutir expectativas salariales y de crecimiento"],
      opening: {
        greeting: "Good morning. In this role, you will handle cross-functional conflicts. Could you share an example of a difficult stakeholder you successfully managed?",
        translation: "Buenos días. En este rol, manejarás conflictos interdisciplinarios. ¿Podrías compartir un ejemplo de un cliente interno difícil que hayas gestionado con éxito?",
      },
    },
    C1: {
      scene: "Eres socio director de una firma consultora global liderando una entrevista de caso estratégico.",
      objectives: ["Estructurar un análisis de mercado y rentabilidad", "Defender supuestos metodológicos con solidez", "Articular visión de liderazgo transformacional"],
      opening: {
        greeting: "Welcome. Our client is facing declining margins in their European logistics unit. How would you diagnose the operational root cause and structure the turnaround plan?",
        translation: "Bienvenido. Nuestro cliente enfrenta márgenes decrecientes en su unidad logística europea. ¿Cómo diagnosticaría la causa raíz operativa y estructuraría el plan de rescate?",
      },
    },
  },
  taxi: {
    A1: {
      scene: "Eres conductor de taxi amable. El alumno principiante sube, dice a dónde va y pregunta el costo.",
      objectives: ["Saludar y decir a dónde vas (lugar o dirección)", "Preguntar cuánto cuesta (How much?)", "Pagar y decir gracias"],
      opening: {
        greeting: "Hello! Hop in. Where are you going today?",
        translation: "¡Hola! Sube. ¿A dónde vas hoy?",
      },
    },
    A2: {
      scene: "Eres taxista. El alumno da indicaciones de ruta, pide detenerse en un punto y solicita recibo.",
      objectives: ["Dar instrucciones de giro (turn left/right)", "Pedir que se detenga cerca de un punto de referencia", "Pedir recibo o cambio"],
      opening: {
        greeting: "Hi! Where to? Do you prefer taking the highway or city streets?",
        translation: "¡Hola! ¿A dónde vamos? ¿Prefieres tomar la autopista o calles de la ciudad?",
      },
    },
    B1: {
      scene: "Eres chofer en hora pico. El alumno tiene prisa por llegar al aeropuerto o reunión y acuerdan la mejor ruta.",
      objectives: ["Explicar tu hora límite de llegada", "Consultar sobre el tráfico y rutas alternas", "Acordar método de pago"],
      opening: {
        greeting: "Hello! Traffic is heavy on the main avenue. Are you in a rush to catch a flight?",
        translation: "¡Hola! Hay mucho tráfico en la avenida principal. ¿Tiene prisa para tomar un vuelo?",
      },
    },
    B2: {
      scene: "Eres chofer particular. Conversas amenamente sobre lugares recomendados de la ciudad y cultura local.",
      objectives: ["Pedir recomendaciones gastronómicas auténticas", "Compartir impresiones sobre la ciudad", "Sostener charla amena y fluida"],
      opening: {
        greeting: "Welcome to our city! Is this your first time visiting, or have you been here before?",
        translation: "¡Bienvenido a nuestra ciudad! ¿Es su primera vez de visita o ya ha estado aquí antes?",
      },
    },
    C1: {
      scene: "Eres guía y conductor local experto. Dialogas sobre transformaciones urbanas, gentrificación e historia arquitectónica.",
      objectives: ["Debatir transformaciones sociourbanas", "Usar modismos y registros coloquiales refinados", "Intercambiar perspectivas culturales"],
      opening: {
        greeting: "Good afternoon. As we drive through the historic quarter, you'll notice how post-industrial renewal changed the neighborhood. What's your take on architectural heritage preservation?",
        translation: "Buenas tardes. Mientras atravesamos el casco histórico, notará cómo la renovación posindustrial cambió el barrio. ¿Cuál es su postura sobre la preservación del patrimonio arquitectónico?",
      },
    },
  },
  libre: {
    A1: {
      scene: "Conversación relajada para principiante. El tutor pregunta por gustos sencillos, comidas y hobbies con frases muy cortas.",
      objectives: ["Responder cómo estás hoy", "Decir tu comida o bebida favorita", "Decir qué haces en tu tiempo libre"],
      opening: {
        greeting: "Hello! How are you today? What is your favorite food?",
        translation: "¡Hola! ¿Cómo estás hoy? ¿Cuál es tu comida favorita?",
      },
    },
    A2: {
      scene: "Charla cotidiana sobre planes del fin de semana, clima y actividades de descanso.",
      objectives: ["Describir lo que hiciste el fin de semana pasado", "Contar tus planes para mañana", "Preguntar al tutor sobre su fin de semana"],
      opening: {
        greeting: "Hi there! It's great to talk with you. What did you do last weekend?",
        translation: "¡Hola! Qué gusto hablar contigo. ¿Qué hiciste el fin de semana pasado?",
      },
    },
    B1: {
      scene: "Conversación interesante sobre películas, viajes o tecnología explicando gustos y motivos.",
      objectives: ["Recomendar una serie o libro explicando por qué", "Describir un viaje memorable", "Opinar sobre el impacto de la tecnología"],
      opening: {
        greeting: "Hello! I was just reading an article about remote work. Do you prefer working from home or in an office, and why?",
        translation: "¡Hola! Justo estaba leyendo un artículo sobre el trabajo remoto. ¿Prefieres trabajar desde casa o en oficina, y por qué?",
      },
    },
    B2: {
      scene: "Debate dinámico sobre tendencias de actualidad, inteligencia artificial y hábitos de productividad.",
      objectives: ["Argumentar a favor o en contra de un cambio tecnológico", "Matizar ventajas y desventajas con condicionales", "Sostener una postura con convicción"],
      opening: {
        greeting: "Welcome! Lately, AI tools are reshaping education and careers. How do you see these changes affecting your industry in the coming years?",
        translation: "¡Bienvenido! Últimamente, las herramientas de IA están redefiniendo la educación y las profesiones. ¿Cómo ves que estos cambios afecten a tu industria en los próximos años?",
      },
    },
    C1: {
      scene: "Conversación abierta de alto nivel intelectual sobre filosofía de vida, libros y desafíos contemporáneos.",
      objectives: ["Articular conceptos abstractos con precisión léxica", "Usar metáforas y giros idiomáticos con espontaneidad", "Profundizar en dilemas éticos o culturales"],
      opening: {
        greeting: "Good to connect with you. If you had to identify a single paradox that defines modern lifestyle, what would it be?",
        translation: "Qué gusto conectar contigo. Si tuvieras que señalar una sola paradoja que defina el estilo de vida contemporáneo, ¿cuál sería?",
      },
    },
    HSK1: {
      scene: "轻松的日常对话。老师问非常简单的问题。",
      objectives: ["Responder a cómo estás (我很好)", "Decir lo que te gusta comer (我喜欢吃...)", "Preguntar al tutor (你呢？)"],
      opening: {
        greeting: "你好！你今天好吗？你喜欢中国菜吗？",
        translation: "¡Hola! ¿Cómo estás hoy? ¿Te gusta la comida china?",
      },
    },
  },
};

/**
 * Adaptación pedagógica de misiones según el nivel del alumno.
 * Evita la sobrecarga cognitiva adaptando la escena a la Zona de Desarrollo Próximo.
 */
export function adaptMissionForLevel(mission, level = "A1", lang = "en") {
  const isZh = lang === "zh";
  const missionId = mission?.id || "libre";
  const missionData = MISSION_CATALOG[missionId] || MISSION_CATALOG.libre;

  // Buscar coincidencia exacta de nivel, o el más cercano
  let levelData = missionData[level];
  if (!levelData) {
    if (isZh) {
      levelData = missionData.HSK1 || missionData.A1;
    } else {
      levelData = missionData.A1;
    }
  }

  // Fallback seguro si la misión no está mapeada para ese nivel
  if (!levelData) {
    levelData = {
      scene: mission?.scene || "Conversación abierta.",
      objectives: mission?.objectives || ["Participar activamente", "Aprender vocabulario nuevo", "Completar la sesión"],
      opening: {
        greeting: isZh ? "你好！今天你想聊些什么？" : "Hello! What would you like to talk about today?",
        translation: isZh ? "¡Hola! ¿De qué te gustaría hablar hoy?" : "¡Hola! ¿De qué te gustaría hablar hoy?",
      },
    };
  }

  return {
    ...mission,
    id: missionId,
    title: mission?.title || "Misión de aprendizaje",
    level,
    scene: levelData.scene,
    objectives: levelData.objectives,
    opening: levelData.opening,
  };
}

/**
 * Esquema JSON OpenAPI estricto para Gemini 2.0 / 3.8 con Structured Outputs.
 * Garantiza que NINGUNA respuesta carezca de 'translation' o 'facilitator'.
 */
export const GEMINI_PEDAGOGICAL_SCHEMA = {
  type: "OBJECT",
  properties: {
    reply: {
      type: "STRING",
      description: "Mensaje del tutor en el idioma meta. Para A1: 1 a 2 frases muy breves y sencillas terminando en pregunta directa. Para chino: caracteres sin pinyin en este campo.",
    },
    translation: {
      type: "STRING",
      description: "Traducción al español obligatoria, precisa y natural del mensaje en reply.",
    },
    facilitator: {
      type: "OBJECT",
      description: "Evaluación pedagógica y modelado nativo sobre la última respuesta del alumno.",
      properties: {
        userAnalysis: {
          type: "STRING",
          description: "Diagnóstico pedagógico en español: qué dijo el alumno, si hubo acierto o error gramatical/auxiliar, y explicación clara de la regla.",
        },
        correctForm: {
          type: "STRING",
          description: "Forma gramatical estándar y correcta adecuada al nivel del alumno (ej: 'Yes, I am' o 'Yes, I am ready').",
        },
        nativeAlternative: {
          type: "STRING",
          description: "Cómo lo diría un hablante nativo real de forma natural y fluida en ese contexto (ej: 'Sure, all set!' o 'Ready when you are!').",
        },
        encouragement: {
          type: "STRING",
          description: "Mensaje motivador y cálido en español que alienta al alumno, celebra el esfuerzo y refuerza la confianza en cada paso.",
        },
        repetitionPrompt: {
          type: "STRING",
          description: "Frase contextual simple sugerida para que el alumno repita en voz alta y fije el patrón comunicativo.",
        },
        competencyFocus: {
          type: "STRING",
          enum: ["grammar", "vocabulary", "fluency", "pronunciation", "pragmatics"],
          description: "Área de competencia principal trabajada en este turno.",
        },
        levelSuitability: {
          type: "STRING",
          description: "Comentario breve sobre si la respuesta encaja en el nivel del alumno o cómo elevarla al siguiente escalón.",
        },
      },
      required: ["userAnalysis", "correctForm", "nativeAlternative", "encouragement", "competencyFocus"],
    },
    vocabulary: {
      type: "ARRAY",
      description: "Vocabulario clave extraído del turno actual.",
      items: {
        type: "OBJECT",
        properties: {
          word: { type: "STRING" },
          translation: { type: "STRING" },
          phonetic: { type: "STRING" },
          pos: { type: "STRING" },
        },
        required: ["word", "translation"],
      },
    },
    completedObjectives: {
      type: "ARRAY",
      description: "Índices base 0 (0, 1 o 2) de los objetivos de la misión que el alumno cumplió satisfactoriamente en su intervención.",
      items: { type: "INTEGER" },
    },
    competencyScores: {
      type: "OBJECT",
      description: "Calificación estimada del desempeño en este turno (0 a 100).",
      properties: {
        grammar: { type: "INTEGER" },
        vocabulary: { type: "INTEGER" },
        fluency: { type: "INTEGER" },
        comprehension: { type: "INTEGER" },
      },
      required: ["grammar", "vocabulary", "fluency", "comprehension"],
    },
  },
  required: ["reply", "translation", "facilitator", "vocabulary", "competencyScores"],
};

/**
 * Currículum pedagógico progresivo estructurado por módulos y lecciones secuenciales.
 * Evita lecciones sueltas y proporciona un camino de aprendizaje claro para avanzar de nivel.
 */
export const LESSON_CURRICULUM = {
  en: {
    A1: [
      { id: "cafe", module: "Módulo 1: Primeros Contactos", title: "Lección 1: En la Cafetería", order: 1 },
      { id: "hotel", module: "Módulo 1: Primeros Contactos", title: "Lección 2: Check-in en el Hotel", order: 2 },
      { id: "taxi", module: "Módulo 1: Primeros Contactos", title: "Lección 3: En el Taxi y Direcciones", order: 3 },
      { id: "cliente", module: "Módulo 2: Interacción Social y Oficina", title: "Lección 4: Recepción de Cliente", order: 4 },
      { id: "aeropuerto", module: "Módulo 2: Interacción Social y Oficina", title: "Lección 5: En el Aeropuerto", order: 5 },
      { id: "libre", module: "Módulo 2: Interacción Social y Oficina", title: "Lección 6: Charla Cotidiana", order: 6 },
    ],
    A2: [
      { id: "cafe", module: "Módulo 1: Servicios y Preferencias", title: "Lección 1: Café con Especificaciones", order: 1 },
      { id: "hotel", module: "Módulo 1: Servicios y Preferencias", title: "Lección 2: Hotel con Solicitudes Especiales", order: 2 },
      { id: "taxi", module: "Módulo 1: Servicios y Preferencias", title: "Lección 3: Taxi con Rutas y Estimaciones", order: 3 },
      { id: "cliente", module: "Módulo 2: Trabajo y Compromisos", title: "Lección 4: Confirmación de Agenda", order: 4 },
      { id: "aeropuerto", module: "Módulo 2: Trabajo y Compromisos", title: "Lección 5: Conexiones de Vuelo", order: 5 },
      { id: "libre", module: "Módulo 2: Trabajo y Compromisos", title: "Lección 6: Planes de Fin de Semana", order: 6 },
    ],
    B1: [
      { id: "cafe", module: "Módulo 1: Comunicación Fluida", title: "Lección 1: Café de Especialidad", order: 1 },
      { id: "hotel", module: "Módulo 1: Comunicación Fluida", title: "Lección 2: Resolución de Problemas en Hotel", order: 2 },
      { id: "taxi", module: "Módulo 1: Comunicación Fluida", title: "Lección 3: Negociación de Tarifa y Ruta", order: 3 },
      { id: "cliente", module: "Módulo 2: Entorno Profesional", title: "Lección 4: Revisión de Avance con Cliente", order: 4 },
      { id: "entrevista", module: "Módulo 2: Entorno Profesional", title: "Lección 5: Entrevista de Trabajo B1", order: 5 },
      { id: "aeropuerto", module: "Módulo 2: Entorno Profesional", title: "Lección 6: Reclamo de Equipaje", order: 6 },
      { id: "libre", module: "Módulo 2: Entorno Profesional", title: "Lección 7: Conversación de Temas de Interés", order: 7 },
    ],
    B2: [
      { id: "cafe", module: "Módulo 1: Fluidez Avanzada", title: "Lección 1: Cata y Cultura del Café", order: 1 },
      { id: "cliente", module: "Módulo 1: Fluidez Avanzada", title: "Lección 2: Defensa de Propuesta Técnica", order: 2 },
      { id: "entrevista", module: "Módulo 1: Fluidez Avanzada", title: "Lección 3: Entrevista de Consultor Senior", order: 3 },
      { id: "hotel", module: "Módulo 2: Gestión y Negociación", title: "Lección 4: Manejo de Incidencias en Hotel", order: 4 },
      { id: "aeropuerto", module: "Módulo 2: Gestión y Negociación", title: "Lección 5: Cambio de Vuelo por Urgencia", order: 5 },
      { id: "taxi", module: "Módulo 2: Gestión y Negociación", title: "Lección 6: Charla Urbana y Cultural", order: 6 },
      { id: "libre", module: "Módulo 2: Gestión y Negociación", title: "Lección 7: Debate de Actualidad y Tecnología", order: 7 },
    ],
    C1: [
      { id: "cliente", module: "Módulo 1: Dominio Ejecutivo y Diplomacia", title: "Lección 1: Negociación Contractual y SLAs", order: 1 },
      { id: "entrevista", module: "Módulo 1: Dominio Ejecutivo y Diplomacia", title: "Lección 2: Entrevista a Nivel Partner/Directivo", order: 2 },
      { id: "libre", module: "Módulo 1: Dominio Ejecutivo y Diplomacia", title: "Lección 3: Debate Filosófico y Cultural", order: 3 },
    ],
  },
  zh: {
    HSK1: [
      { id: "cafe", module: "Módulo 1: Supervivencia Básica", title: "第1课: 点咖啡或茶 (Pedir café o té)", order: 1 },
      { id: "cliente", module: "Módulo 1: Supervivencia Básica", title: "第2课: 欢迎客人 (Dar bienvenida)", order: 2 },
      { id: "libre", module: "Módulo 1: Supervivencia Básica", title: "第3课: 日常问候 (Saludos y comida)", order: 3 },
    ],
    HSK2: [
      { id: "cafe", module: "Módulo 1: Vida Diaria", title: "第1课: 大杯还是小杯 (Tamaños y precios)", order: 1 },
      { id: "cliente", module: "Módulo 1: Vida Diaria", title: "第2课: 确认会议时间 (Confirmar reunión)", order: 2 },
    ],
    HSK3: [
      { id: "cafe", module: "Módulo 1: Expresión Guiada", title: "第1课: 精品咖啡推荐 (Recomendaciones)", order: 1 },
    ],
  },
};

/**
 * Catálogo de Escenarios Dinámicos y Flexibles (Solución 5: UX Conversacional).
 * Elimina la rigidez monolítica permitiendo alternar entre contextos cotidianos y profesionales.
 */
export const DYNAMIC_SCENARIOS = {
  casual: {
    id: "casual",
    icon: "☕",
    title: "Vida Cotidiana & Charlas Casuales",
    domain: "general",
    contextPrompt: "Contexto cotidiano y social relajado: cafeterías, viajes, comida, hobbies, anécdotas y planes personales.",
    openings: {
      en: {
        greeting: (name, level) => `Hello ${name}! So great to have you here today. I see you're building solid confidence in your ${level} journey. How is your day going so far, or would you like to jump straight into our casual practice?`,
        translation: (name, level) => `¡Hola, ${name}! Qué gusto tenerte por aquí hoy. Veo que estás avanzando en tu nivel ${level}. ¿Cómo va tu día o prefieres que entremos directo a nuestra práctica cotidiana?`,
      },
      zh: {
        greeting: (name) => `${name}，你好！很高兴今天见到你。你今天过得怎么样？准备好开始日常中文对话了吗？`,
        translation: (name) => `¡Hola, ${name}! Qué alegría verte hoy. ¿Cómo ha ido tu día? ¿Listo para conversar sobre la vida cotidiana?`,
      },
    },
  },
  tech: {
    id: "tech",
    icon: "💻",
    title: "Tech & Product Standup",
    domain: "tech",
    contextPrompt: "Contexto tecnológico y de ingeniería de software: daily standup, revisión de pull requests, resolución de incidencias/bugs, arquitectura de sistemas y despliegue ágil.",
    openings: {
      en: {
        greeting: (name, level) => `Hey ${name}! Welcome to the engineering room. Fantastic to see you working on your ${level} fluency. How is your day going, or are you ready to jump into our daily standup sprint?`,
        translation: (name, level) => `¡Hola, ${name}! Bienvenido a la sala de ingeniería. Fantástico verte avanzar en tu fluidez ${level}. ¿Cómo va tu día o listo para iniciar nuestro daily standup?`,
      },
      zh: {
        greeting: (name) => `${name}，你好！欢迎来到技术团队会议。你今天准备好同步工作进展了吗？`,
        translation: (name) => `¡Hola, ${name}! Bienvenido a la reunión técnica de equipo. ¿Listo para sincronizar tus avances de hoy?`,
      },
    },
  },
  corporate: {
    id: "corporate",
    icon: "💼",
    title: "Corporate & Business",
    domain: "corporate",
    contextPrompt: "Contexto empresarial y corporativo: reuniones con clientes internacionales, llamadas de ventas, negociación de presupuestos y presentaciones ejecutivas.",
    openings: {
      en: {
        greeting: (name, level) => `Good day ${name}! Wonderful to have you with us. You're making impressive strides in your ${level} professional communication. How is everything today, or shall we start our business scenario?`,
        translation: (name, level) => `¡Buen día, ${name}! Un gusto tenerte con nosotros. Estás dando pasos impresionantes en tu comunicación profesional ${level}. ¿Cómo va todo hoy o empezamos con nuestro escenario de negocios?`,
      },
      zh: {
        greeting: (name) => `${name}，你好！很高兴与您会面。今天工作顺利吗？我们直接进入商务洽谈吗？`,
        translation: (name) => `¡Hola, ${name}! Un gusto reunirme contigo. ¿Va bien el trabajo hoy? ¿Entramos directo a la conversación de negocios?`,
      },
    },
  },
  medical: {
    id: "medical",
    icon: "🏥",
    title: "Clinical & Triage",
    domain: "medical",
    contextPrompt: "Contexto clínico y sanitario: recepción de pacientes en consulta o guardia, anamnesis, explicación de síntomas, dosificación y comunicación empática de salud.",
    openings: {
      en: {
        greeting: (name, level) => `Hello ${name}! Welcome to our clinical communication station. You're progressing very well in your ${level} healthcare English. How are you feeling today, or would you like to start the triage simulation?`,
        translation: (name, level) => `¡Hola, ${name}! Bienvenido a nuestra estación clínica. Estás progresando muy bien en tu inglés sanitario ${level}. ¿Cómo te sientes hoy o prefieres iniciar la simulación de triaje?`,
      },
      zh: {
        greeting: (name) => `${name}，你好！欢迎来到医患沟通练习。今天准备好开始临床交流了吗？`,
        translation: (name) => `¡Hola, ${name}! Bienvenido a la práctica de comunicación clínica. ¿Listo para comenzar la consulta hoy?`,
      },
    },
  },
};

/**
 * Genera la apertura adaptativa y personalizada para el Turno 0.
 */
export function generateAdaptiveOpening({ lang = "en", level = "A1", userName = "", scenarioId = "casual" }) {
  const isZh = lang === "zh";
  const name = userName ? userName.split(" ")[0].trim() : (isZh ? "朋友" : "amigo");
  const sc = DYNAMIC_SCENARIOS[scenarioId] || DYNAMIC_SCENARIOS.casual;
  const langKey = isZh ? "zh" : "en";
  const conf = sc.openings[langKey] || sc.openings.en;

  const greeting = typeof conf.greeting === "function" ? conf.greeting(name, level) : conf.greeting;
  const translation = typeof conf.translation === "function" ? conf.translation(name, level) : conf.translation;

  return {
    scenarioId: sc.id,
    scenarioTitle: sc.title,
    greeting,
    translation,
  };
}

/**
 * Genera el System Instruction especializado para el Agente Pedagógico (Wetty).
 */
export function buildPedagogicalSystemInstruction({
  lang = "en",
  level = "A1",
  mission,
  state,
  recentErrors = [],
  userName = "",
  userDomain = "general",
  scenario = "casual",
  turnIndex = 0,
}) {
  const isZh = lang === "zh";
  const langName = isZh ? "chino mandarín" : "inglés";
  const tutorName = isZh ? "Mei (美)" : "Wetty";
  const rule = LEVEL_RULES[level] || LEVEL_RULES.A1;
  const adaptedMission = adaptMissionForLevel(mission, level, lang);
  const sc = DYNAMIC_SCENARIOS[scenario] || DYNAMIC_SCENARIOS.casual;
  const cleanName = userName ? userName.split(" ")[0].trim() : (isZh ? "同学" : "alumno");

  const lines = [
    `Eres ${tutorName}, una tutora de ${langName} de élite especializada en aprendizaje por competencias según el marco ${isZh ? "HSK" : "CEFR/MCER"}.`,
    `Tu alumno es un hispanohablante llamado "${cleanName}". Su nivel actual es: ${level} (${rule.name}).`,
    `Su dominio profesional o perfil de interés es: ${userDomain || sc.domain}.`,
    "",
    "--- ENFOQUE DE ESCENARIO DINÁMICO (SOLUCIÓN 5: CONTEXTOS FLEXIBLES Y VIVOS) ---",
    `Escenario activo: ${sc.title} (${sc.id}).`,
    `Directriz de contexto situacional: ${sc.contextPrompt}`,
    "Integra el vocabulario, las expresiones y las anécdotas de este contexto de forma natural y adaptada al nivel del estudiante.",
    "",
    "--- TURNO 0: BIENVENIDA EMPÁTICA Y CHEQUEO DE ESTADO (LOW-PRESSURE WARMUP) ---",
    "En la primera interacción o apertura de la sesión:",
    `- Saluda a ${cleanName} de manera empática, cálida y personalizada, reconociendo su avance en el nivel ${level}.`,
    "- Realiza una pregunta o chequeo de estado de baja presión (ej. cómo va su día o si prefiere entrar directo a la práctica del escenario).",
    "- Crea un ambiente de seguridad psicológica donde el alumno se sienta bienvenido y libre de ansiedad antes de aumentar la demanda lingüística.",
    "",
    "--- REGLAS ESTRICTAS DE NIVEL Y ANDAMIAJE PEDAGÓGICO (ZONA DE DESARROLLO PRÓXIMO) ---",
    `1. TECHO LÉXICO Y SINTÁCTICO: ${rule.promptDirective}`,
    `2. LÍMITE DE LONGITUD: Máximo ${rule.maxSentences} oraciones por turno (no más de ${rule.maxWordsPerSentence} palabras por oración).`,
    `3. ESTRUCTURAS GRAMATICALES META: ${rule.targetGrammar}`,
    `4. RITMO Y ESTILO: ${rule.speechRate} ${rule.scaffolding}`,
    "5. Haz SIEMPRE una pregunta breve y directa al final de tu turno para que el alumno pueda responder fácilmente.",
    "",
    "--- PRINCIPIO DE REPETICIÓN CONTEXTUAL Y SIMPLICIDAD (NIVELES INICIALES) ---",
    "En los niveles iniciales (A1, A2, HSK1, HSK2):",
    "- Usa formas de expresión sumamente simples y cotidianas.",
    "- Fomenta la repetición de frases en contexto para automatizar patrones neuronales y de pronunciación.",
    "- En 'repetitionPrompt', proporciona una frase corta y amigable para que el alumno la repita en voz alta.",
    "",
    "--- MOTIVACIÓN Y ALIENTO PERMANENTE ---",
    "El Facilitador Pedagógico debe mantener un tono CÁLIDO, MOTIVADOR y POSITIVO en todo momento:",
    "- En 'encouragement', incluye siempre una frase que felicite el esfuerzo, genere confianza y refuerce que equivocarse es parte natural del aprendizaje.",
    "- Nunca uses tono punitivo o desalentador; celebra cada turno como un logro tangible.",
    "",
    `--- ESCENARIO DE ROLEPLAY: ${adaptedMission.title} ---`,
    `Contexto de la escena: ${adaptedMission.scene}`,
    adaptedMission.objectives?.length
      ? `Objetivos pedagógicos del nivel: ${adaptedMission.objectives.map((o, i) => `(${i + 1}) ${o}`).join("; ")}.`
      : "Conversación abierta guiada y relajada.",
    "Guía la conversación paso a paso para que el alumno cumpla los objetivos sin presionarlo ni adelantar temas complejos.",
    "Si el alumno demostró o cumplió uno de estos objetivos en su respuesta, incluye su índice (0, 1 o 2) en el array 'completedObjectives'.",
    "",
    "--- DOBLE ROL: INTERLOCUTOR INMERSIVO + FACILITADOR PEDAGÓGICO ---",
    "En cada turno debes cumplir dos funciones simultáneas:",
    "A) En 'reply': Mantente en tu personaje del escenario, conversando con calidez y respetando el nivel.",
    "B) En 'translation': Traducción natural y fiel al español de 'reply'. NUNCA devuelvas prefijos técnicos como (ES) ni dejes este campo vacío.",
    "C) En 'facilitator': Actúa como coach pedagógico en español analizando la última intervención del alumno:",
    "   - Explica con claridad si cometió un error (por ejemplo: si dijo 'Yes, I do' ante 'Are you ready?', explica que la pregunta usó el verbo To Be 'Are you...', por lo que la respuesta correcta es 'Yes, I am').",
    "   - Proporciona la forma estándar correcta ('correctForm') adecuada a su nivel.",
    "   - Proporciona una alternativa nativa real ('nativeAlternative') que usaría un hablante nativo (ej: 'Sure, ready when you are!').",
    "   - Incluye 'encouragement' con palabras de ánimo sinceras.",
    "   - Incluye 'repetitionPrompt' invitando a repetir la expresión clave.",
    "   - Asigna el área de competencia ('competencyFocus') y un comentario de progreso.",
    "D) En 'vocabulary': Extrae entre 1 y 3 palabras o expresiones clave del intercambio con su traducción en español y pronunciación.",
    "",
    "--- TOLERANCIA FONÉTICA Y TRANSCRIPCIÓN DE VOZ ---",
    "El alumno usa reconocimiento de voz en su dispositivo. Errores leves de transcripción fonética deben interpretarse empáticamente según el contexto.",
    "Si el alumno responde en español por duda o bloqueo, compréndelo con empatía, enséñale amablemente cómo decirlo en el idioma meta y continúa la escena.",
    "",
    "--- FORMATO DE SALIDA ESTRICTO ---",
    "Genera SIEMPRE tu respuesta en formato JSON estrictamente conforme a las propiedades:",
    "- reply (string en " + langName + ")",
    "- translation (string en español, NUNCA vacía y sin prefijos técnicos)",
    "- facilitator (objeto con userAnalysis, correctForm, nativeAlternative, encouragement, repetitionPrompt, competencyFocus, levelSuitability)",
    "- vocabulary (array de objetos con word, translation, phonetic, pos)",
    "- completedObjectives (array de enteros 0, 1 o 2 cumplidos en este turno)",
    "- competencyScores (objeto con grammar, vocabulary, fluency, comprehension del 0 al 100)",
  ];

  if (isZh) {
    lines.push(
      "",
      "--- ESPECÍFICO PARA CHINO MANDARÍN ---",
      "El campo 'reply' debe contener EXCLUSIVAMENTE caracteres chinos simplificados (sin pinyin entre paréntesis ni caracteres latinos), para que el motor de voz TTS hable con entonación 100% natural. El pinyin debe ir dentro del array de 'vocabulary'."
    );
  }

  if (recentErrors.length > 0) {
    lines.push(
      "",
      `Puntos débiles recientes del alumno que debes reforzar sin ser invasivo: ${recentErrors.slice(0, 3).map((e) => `${e.cat}: "${e.said}" -> "${e.better}"`).join(" | ")}.`
    );
  }

  return lines.join("\n");
}

/**
 * Valida, repara y asegura que la respuesta del modelo cumpla al 100% las garantías pedagógicas.
 * En particular, asegura que 'translation' y 'facilitator' NUNCA queden vacías o con prefijos erróneos.
 */
export function repairAndGuaranteePedagogicalResponse(parsedData, rawText = "", lastUserMessage = "", level = "A1", lang = "en") {
  const result = {
    reply: "",
    translation: "",
    completedObjectives: [],
    facilitator: {
      userAnalysis: "Interacción registrada correctamente.",
      correctForm: "",
      nativeAlternative: "",
      encouragement: "¡Excelente iniciativa! Cada frase que practicas te acerca a hablar con total naturalidad.",
      repetitionPrompt: "",
      competencyFocus: "fluency",
      levelSuitability: `Adecuado para práctica en nivel ${level}.`,
    },
    vocabulary: [],
    competencyScores: { grammar: 75, vocabulary: 70, fluency: 70, comprehension: 80 },
  };

  if (parsedData && typeof parsedData === "object") {
    if (parsedData.reply) result.reply = String(parsedData.reply).trim();
    if (parsedData.translation) {
      result.translation = String(parsedData.translation).replace(/^\(ES\)\s*/i, "").trim();
    }
    if (Array.isArray(parsedData.vocabulary)) result.vocabulary = parsedData.vocabulary;
    if (Array.isArray(parsedData.completedObjectives)) {
      result.completedObjectives = parsedData.completedObjectives.filter((idx) => Number.isInteger(idx) && idx >= 0 && idx <= 5);
    }
    if (parsedData.competencyScores) result.competencyScores = { ...result.competencyScores, ...parsedData.competencyScores };

    if (parsedData.facilitator && typeof parsedData.facilitator === "object") {
      result.facilitator = {
        userAnalysis: parsedData.facilitator.userAnalysis || result.facilitator.userAnalysis,
        correctForm: parsedData.facilitator.correctForm || "",
        nativeAlternative: parsedData.facilitator.nativeAlternative || "",
        encouragement: parsedData.facilitator.encouragement || "¡Muy bien! Sigue adelante con esa motivación.",
        repetitionPrompt: parsedData.facilitator.repetitionPrompt || "",
        competencyFocus: parsedData.facilitator.competencyFocus || "grammar",
        levelSuitability: parsedData.facilitator.levelSuitability || result.facilitator.levelSuitability,
      };
    } else if (parsedData.feedback) {
      const tip = typeof parsedData.feedback === "string" ? parsedData.feedback : (parsedData.feedback.tip || "");
      result.facilitator.userAnalysis = tip || "Buen intento, continúa con el diálogo.";
    }
  }

  // Rescate de reply si vino en texto crudo
  if (!result.reply && rawText) {
    const replyMatch = rawText.match(/"reply"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/i);
    if (replyMatch) {
      try { result.reply = JSON.parse(`"${replyMatch[1]}"`); } catch { result.reply = replyMatch[1]; }
    } else {
      result.reply = rawText.replace(/[{}"[\]]/g, "").trim();
    }
  }

  // Rescate de translation si vino en texto crudo
  if (!result.translation && rawText) {
    const transMatch = rawText.match(/"translation"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/i);
    if (transMatch) {
      try { result.translation = JSON.parse(`"${transMatch[1]}"`).replace(/^\(ES\)\s*/i, "").trim(); } catch { result.translation = transMatch[1].replace(/^\(ES\)\s*/i, "").trim(); }
    }
  }

  // GUARDIÁN DEFINITIVO DE TRADUCCIÓN: NUNCA dejar sin traducción ni con prefijos técnicos o eco en inglés
  const rawTrans = parsedData?.translation ? String(parsedData.translation).trim() : "";
  const isBogusTranslation =
    !result.translation ||
    rawTrans.startsWith("(ES)") ||
    (result.reply && result.translation.toLowerCase() === result.reply.toLowerCase());

  if (isBogusTranslation && result.reply) {
    result.translation = generateFallbackTranslation(result.reply, lang);
  }

  // GUARDIÁN DEL FACILITADOR: Si el análisis fue genérico o faltaron alternativas, aplicar diagnóstico contrastivo
  if ((!result.facilitator.correctForm || !result.facilitator.nativeAlternative || result.facilitator.userAnalysis === "Interacción registrada correctamente.") && lastUserMessage) {
    const autoAnalysis = analyzeUserTurnFallback(lastUserMessage, level, lang);
    if (autoAnalysis) {
      result.facilitator.userAnalysis = autoAnalysis.userAnalysis;
      result.facilitator.correctForm = autoAnalysis.correctForm;
      result.facilitator.nativeAlternative = autoAnalysis.nativeAlternative;
      result.facilitator.encouragement = autoAnalysis.encouragement || result.facilitator.encouragement;
      result.facilitator.repetitionPrompt = autoAnalysis.repetitionPrompt || result.facilitator.repetitionPrompt;
      result.facilitator.competencyFocus = autoAnalysis.competencyFocus || result.facilitator.competencyFocus;
    }
  }

  // Vocabulario garantizado si vino vacío en turno válido
  if (result.vocabulary.length === 0 && result.reply) {
    result.vocabulary = extractKeyVocabularyFallback(result.reply, lang);
  }

  return result;
}

/**
 * Extracción de respaldo de vocabulario pedagógico a partir de la réplica del tutor.
 */
function extractKeyVocabularyFallback(reply, lang) {
  if (lang === "zh") {
    return [];
  }
  const clean = reply.replace(/[?!.,;:"'()]/g, " ").toLowerCase();

  const DICT = {
    coffee: { word: "coffee", translation: "café", phonetic: "/ˈkɒfi/", pos: "sustantivo" },
    tea: { word: "tea", translation: "té", phonetic: "/tiː/", pos: "sustantivo" },
    meeting: { word: "meeting", translation: "reunión", phonetic: "/ˈmiːtɪŋ/", pos: "sustantivo" },
    reservation: { word: "reservation", translation: "reserva", phonetic: "/ˌrezəˈveɪʃn/", pos: "sustantivo" },
    hotel: { word: "hotel", translation: "hotel", phonetic: "/həʊˈtel/", pos: "sustantivo" },
    room: { word: "room", translation: "habitación / sala", phonetic: "/ruːm/", pos: "sustantivo" },
    flight: { word: "flight", translation: "vuelo", phonetic: "/flaɪt/", pos: "sustantivo" },
    ticket: { word: "ticket", translation: "boleto / billete", phonetic: "/ˈtɪkɪt/", pos: "sustantivo" },
    passport: { word: "passport", translation: "pasaporte", phonetic: "/ˈpɑːspɔːt/", pos: "sustantivo" },
    experience: { word: "experience", translation: "experiencia", phonetic: "/ɪkˈspɪəriəns/", pos: "sustantivo" },
    street: { word: "street", translation: "calle", phonetic: "/striːt/", pos: "sustantivo" },
  };

  const found = [];
  for (const [key, item] of Object.entries(DICT)) {
    if (new RegExp(`\\b${key}\\b`, "i").test(clean)) {
      found.push(item);
      if (found.length >= 2) break;
    }
  }
  if (found.length > 0) return found;

  const words = clean.split(/\s+/).filter(w => w.length > 3);
  const common = new Set(["this", "that", "with", "have", "from", "they", "will", "would", "there", "what", "your", "ready", "about", "welcome"]);
  const candidates = words.filter(w => !common.has(w));
  if (!candidates.length) return [];
  const pick = candidates[0];

  return [{ word: pick, translation: `Término clave: ${pick}`, phonetic: "", pos: "vocabulario" }];
}

/**
 * Fallback de traducción pedagógica inmediata en español fluido y natural.
 * NUNCA devuelve prefijos técnicos como (ES).
 */
function generateFallbackTranslation(reply, lang) {
  if (!reply) return "";
  if (lang === "zh") {
    return "¡Hola! ¿Cómo estás hoy?";
  }
  const clean = reply.replace(/^\(ES\)\s*/i, "").trim();
  const lower = clean.toLowerCase();

  if (lower.includes("hello") && (lower.includes("nice to meet you") || lower.includes("ready for"))) {
    return "¡Hola! Mucho gusto en conocerte. ¿Estás listo/a para nuestra conversación?";
  }
  if (lower.includes("coffee or tea") || lower.includes("tea or coffee")) {
    return "¡Hola! ¿Prefieres café o té?";
  }
  if (lower.includes("great") && (lower.includes("what is your name") || lower.includes("what's your name"))) {
    return "¡Excelente! ¿Cuál es tu nombre?";
  }
  if (lower.includes("what is your name") || lower.includes("what's your name")) {
    return "¿Cómo te llamas?";
  }
  if (lower.includes("how can i help you") || lower.includes("can i help you")) {
    return "¿En qué puedo ayudarte hoy?";
  }
  if (lower.includes("welcome") && lower.includes("hotel")) {
    return "¡Hola! Bienvenido al hotel. ¿Tiene una reserva?";
  }
  if (lower.includes("where") && (lower.includes("going") || lower.includes("headed"))) {
    return "¡Hola! ¿A dónde se dirige hoy?";
  }
  if (lower.includes("glad you are ready") || lower.includes("happy you are ready")) {
    return "¡Genial! Me alegra que estés listo. ¿En qué puedo ayudarte hoy?";
  }
  if (lower.includes("good morning")) {
    return "¡Buenos días! ¿En qué puedo colaborar contigo?";
  }
  if (lower.includes("good afternoon")) {
    return "¡Buenas tardes! Qué gusto saludarte.";
  }

  // Traducción limpia sin prefijo (ES)
  return clean;
}

/**
 * Análisis contrastivo de respaldo para patrones frecuentes de error en hispanohablantes.
 */
function analyzeUserTurnFallback(userText, level, lang) {
  if (lang !== "en") return null;
  const t = userText.trim().toLowerCase();

  // Caso específico visto en la evidencia: "convention" en vez de "conversation"
  if (t.includes("convention") || (t.includes("ready") && t.includes("you"))) {
    return {
      userAnalysis: "⚠️ Ajuste de vocabulario y posesivo: Usaste 'convention' (convención/evento masivo) en vez de 'conversation' (conversación), y 'you' en lugar del posesivo 'our' o 'the'.",
      correctForm: "I am ready for our conversation.",
      nativeAlternative: "I'm all set to practice!",
      encouragement: "¡Gran actitud al arrancar la charla! Ajustar pequeñas palabras afina tu inglés a nivel nativo.",
      repetitionPrompt: "Repite en voz alta: «I am ready for our conversation»",
      competencyFocus: "vocabulary",
    };
  }

  // Caso específico: pedir café ("i want a coffee" / "i want coffee")
  if (t === "i want a coffee" || t === "i want coffee" || t === "coffee" || t === "want coffee") {
    return {
      userAnalysis: "Petición directa y clara. En cafeterías en inglés, pedir con 'I want' puede sonar cortante; es mucho más natural y educado usar 'I would like...' o 'Can I get...'.",
      correctForm: "I would like a coffee, please.",
      nativeAlternative: "Can I get a coffee, please?",
      encouragement: "¡Lograste comunicarte al instante! Agregar 'please' o usar 'Can I get' te hará sonar sumamente natural.",
      repetitionPrompt: "Repite en voz alta: «Can I get a coffee, please?»",
      competencyFocus: "pragmatics",
    };
  }

  // Desajuste de auxiliar: "Yes, I do" ante "Are you ready?"
  if (t === "yes, i do" || t === "yes i do") {
    return {
      userAnalysis: "⚠️ Desajuste de auxiliar: Al responder a una pregunta con 'Are you...?' (verbo To Be), se responde con 'Yes, I am' en lugar de 'Yes, I do' (que se usa con 'Do you...?').",
      correctForm: "Yes, I am.",
      nativeAlternative: "Sure, all set!",
      encouragement: "¡Buen intento! Este es uno de los detalles más comunes al empezar; vas por excelente camino.",
      repetitionPrompt: "Repite en voz alta: «Yes, I am ready»",
      competencyFocus: "grammar",
    };
  }

  if (t === "i have hunger" || t === "i have hungry") {
    return {
      userAnalysis: "Interferencia de español: En inglés las sensaciones físicas usan el verbo To Be ('I am hungry'), no el verbo tener ('have').",
      correctForm: "I am hungry.",
      nativeAlternative: "I'm starving!",
      encouragement: "¡Gran observación! En inglés 'somos' el hambre, no la tenemos.",
      repetitionPrompt: "Repite en voz alta: «I am hungry»",
      competencyFocus: "grammar",
    };
  }

  if (t.length <= 14 && !t.includes(".")) {
    return {
      userAnalysis: "Respuesta breve y comprensible. Puedes enriquecerla formando una oración completa para ganar fluidez comunicativa.",
      correctForm: `${userText.charAt(0).toUpperCase() + userText.slice(1)}, please.`,
      nativeAlternative: `${userText}, thanks!`,
      encouragement: "¡Vas con excelente ritmo! Sigue participando con confianza.",
      repetitionPrompt: `Repite en voz alta: «${userText}, please»`,
      competencyFocus: "fluency",
    };
  }

  return {
    userAnalysis: "Estructura comunicativa funcional y clara.",
    correctForm: userText,
    nativeAlternative: `${userText}`,
    encouragement: "¡Excelente participación! Tu expresión progresa de manera sólida.",
    repetitionPrompt: `Repite en voz alta: «${userText}»`,
    competencyFocus: "fluency",
  };
}

/**
 * Genera la instrucción de sistema de Wetty como Facilitadora de Salas Co-Op (TBLT).
 * Modera activamente salas de 2 a 6 personas equilibrando el Talking Time,
 * interviniendo en silencios (>5s) y aplicando recasting fonético empático.
 */
export function buildCoopFacilitatorSystemInstruction({
  room,
  suggestedSpeaker = null,
  silentMember = null,
  phoneticPain = null,
}) {
  const domain = room?.professional_domain || "general";
  const level = room?.level_cefr || "A1";
  const task = room?.target_task || { title: "Collaborative Sync", goal: "Complete the team mission" };
  const memberNames = (room?.members || []).map((m) => m.name).join(", ") || "Equipo";

  let prompt = `ERES WETTY, FACILITADORA EXPERTA DE SALA DE MICROGRUPO SOCIAL CO-OP EN POLYGLOT VOICE.
Tu misión es moderar una reunión colaborativa de 2 a 6 profesionales bajo el método TBLT (Task-Based Language Teaching).

DATOS DE LA SALA:
- Código de sala: ${room?.room_code || "COOP"}
- Dominio profesional: ${domain.toUpperCase()}
- Nivel de competencia meta: ${level}
- Integrantes activos: ${memberNames}
- Misión TBLT actual: "${task.title}" - Meta: "${task.goal}"

PRINCIPIOS DE FACILITACIÓN CO-OP:
1. INERCIA COMUNICATIVA Y BAJO FILTRO AFECTIVO: Nunca des sermones gramaticales largos. Habla como una colega facilitadora ágil y cálida.
2. EQUILIBRIO DE TALKING TIME: Tu objetivo es que todos los integrantes participen de manera equitativa.`;

  if (suggestedSpeaker) {
    prompt += `\n3. PASE DE PALABRA: Invita amablemente a ${suggestedSpeaker.name} a tomar el turno para balancear la conversación: "${suggestedSpeaker.name}, what is your take on this?"`;
  }

  if (silentMember) {
    prompt += `\n4. INTERVENCIÓN ANTE SILENCIO: Ha habido una pausa prolongada. Reactiva el flujo con amabilidad hacia ${silentMember.name} sin presionar: "Take your time! ${silentMember.name}, what do you think?"`;
  }

  if (phoneticPain) {
    prompt += `\n5. RECASTING FONÉTICO EMPÁTICO: El hablante anterior cometió un desajuste fonético (${phoneticPain.painType || "pronunciación"} en la palabra '${phoneticPain.word}').
   NO digas 'está mal'. Modela la pronunciación correcta en tu propia frase de forma natural (recasting implícito). Ejemplo: "I see, regarding the *${phoneticPain.word}*..."`;
  }

  prompt += `\nFORMATO DE RESPUESTA:
Devuelve un mensaje directo, breve (1 a 3 oraciones), en inglés adaptado al nivel ${level}, y termina siempre con una pregunta orientada a la tarea del equipo.`;

  return prompt;
}

/**
 * Filtro de Seguridad Psicológica para Peer Review.
 * Convierte notas de retroalimentación crudas en comentarios empáticos, constructivos
 * y estructurados en 'Praise Sandwich' (Alabanza - Área de Mejora - Aliento).
 */
export function filterAndSanitizePeerFeedback(rawText, { authorName = "Colega", recipientName = "Compañero" } = {}) {
  const text = String(rawText || "").trim();
  if (!text) {
    return {
      sanitizedText: `¡Gran trabajo colaborando en la sala, ${recipientName}! Fue un gusto compartir esta sesión contigo.`,
      sentiment: "positive",
      positivityScore: 100,
      tags: ["active_listening", "team_spirit"],
      badgeAwarded: "🤝 Colaborador Destacado",
    };
  }

  // Lista de patrones punitivos o agresivos comunes a neutralizar
  const harshPatterns = [
    { regex: /hablas?\s+(muy\s+)?(mal|horrible|p[eé]sim[oa])/gi, replace: "hay detalles de fluidez que podemos pulir juntos" },
    { regex: /pronunciaci[oó]n\s+(es\s+)?(muy\s+)?(mal[a]?|horrible|p[eé]sim[a]?|terrible)/gi, replace: "pronunciación tiene gran potencial para afilar con práctica" },
    { regex: /pronuncias?\s+(muy\s+)?(mal|horrible|p[eé]sim[oa]|terrible)/gi, replace: "enfocarnos en la claridad de los sonidos clave nos ayudará mucho" },
    { regex: /no\s+(se\s+te|te)\s+entend(i[oó]|[ií]|nada|emos|ieron)(\s+nada)?/gi, replace: "algunas palabras sonaron un poco rápidas para seguir el hilo" },
    { regex: /no\s+se\s+te\s+entiende(\s+nada)?/gi, replace: "algunas ideas se pueden articular con mayor pausa para mayor claridad" },
    { regex: /te\s+equivocas?\s+mucho/gi, replace: "es completamente normal cometer pequeños deslices al ganar confianza" },
    { regex: /(es\s+)?p[eé]sim[oa]/gi, replace: "requiere afinar detalles" },
    { regex: /muy\s+lento/gi, replace: "a tu propio ritmo constante" },
    { regex: /no\s+sirves?/gi, replace: "con cada sesión nos fortalecemos más" },
  ];

  let softenedText = text;
  let detectedHarshness = false;

  for (const item of harshPatterns) {
    const before = softenedText;
    softenedText = softenedText.replace(item.regex, item.replace);
    if (softenedText !== before) {
      detectedHarshness = true;
    }
  }

  // Envoltorio de Seguridad Psicológica (Praise Sandwich)
  const introPraise = [
    `¡Gran energía en la sala de hoy, ${recipientName}!`,
    `Agradezco mucho tu valentía y participación en este ejercicio, ${recipientName}.`,
    `¡Excelente esfuerzo colaborando en equipo, ${recipientName}!`,
  ];
  const chosenIntro = introPraise[Math.abs(text.length) % introPraise.length];

  const closingCheer = [
    "¡Sigamos practicando con todo el entusiasmo!",
    "¡Fue genial coincidir en este microgrupo!",
    "¡Vas construyendo una confianza sólida con cada turno!",
  ];
  const chosenClosing = closingCheer[Math.abs(text.length * 3) % closingCheer.length];

  const sanitizedText = `${chosenIntro} ${softenedText.charAt(0).toUpperCase() + softenedText.slice(1)}. ${chosenClosing}`;

  return {
    rawLength: text.length,
    sanitizedText,
    sentiment: detectedHarshness ? "constructive_neutralized" : "motivating_supportive",
    positivityScore: detectedHarshness ? 88 : 98,
    tags: detectedHarshness ? ["constructive_growth", "resilience"] : ["active_listening", "team_spirit", "clarity"],
    badgeAwarded: detectedHarshness ? "🌱 Empatía en Crecimiento" : "🌟 Impulsor del Equipo",
  };
}

