/**
 * lib/curriculumData.js
 * 
 * Estructura Curricular Modular por Créditos (36 créditos por nivel)
 * y Repositorio Oficial del "Polyglot Curriculum Handbook" (Textbook Oficial).
 * 
 * Basado en el Marco Común Europeo de Referencia (CEFR/MCER 2020) y HSK 3.0.
 * Cada nivel se estructura en 3 módulos de 12 créditos (36 créditos totales),
 * con 6 lecciones de 2 créditos cada uno.
 */

import { award } from "./tutor.js";

export const TOTAL_LEVEL_CREDITS = 36;
export const CREDITS_PER_MODULE = 12;
export const LESSONS_PER_MODULE = 6;
export const CREDITS_PER_LESSON = 2;

/**
 * Catálogo Curricular Canónico por Módulos y Lecciones.
 * Integra 18 lecciones secuenciales de 2 créditos por nivel (18 * 2 = 36 créditos).
 */
export const CURRICULUM_TREE = {
  en: {
    A1: {
      level: "A1",
      name: "Principiante Acceso (Breakthrough)",
      targetCredits: 36,
      modules: [
        {
          id: "m1",
          order: 1,
          title: "Módulo 1: Primeros Contactos y Supervivencia",
          targetCredits: 12,
          description: "Saludos, peticiones de cortesía, transacciones esenciales e información personal básica.",
          lessons: [
            {
              id: "cafe",
              code: "EN-A1-M1-L1",
              order: 1,
              title: "Lección 1: En la Cafetería",
              credits: 2,
              scene: "Eres el barista de una cafetería acogedora. El alumno principiante entra a pedir una bebida simple.",
              objectives: ["Saludar y pedir café o té", "Decir tu nombre para el vaso", "Dar las gracias"],
            },
            {
              id: "hotel",
              code: "EN-A1-M1-L2",
              order: 2,
              title: "Lección 2: Check-in en el Hotel",
              credits: 2,
              scene: "Eres recepcionista de un hotel céntrico. El alumno llega para registrarse con una reserva previa.",
              objectives: ["Decir que tienes una reserva", "Deletrear tu apellido", "Preguntar por el desayuno"],
            },
            {
              id: "taxi",
              code: "EN-A1-M1-L3",
              order: 3,
              title: "Lección 3: En el Taxi y Direcciones",
              credits: 2,
              scene: "Eres conductor de taxi amable. El alumno sube, indica su destino y pregunta por la tarifa.",
              objectives: ["Decir a dónde vas", "Preguntar cuánto cuesta (How much?)", "Pagar y agradecer"],
            },
            {
              id: "restaurante",
              code: "EN-A1-M1-L4",
              order: 4,
              title: "Lección 4: En el Restaurante",
              credits: 2,
              scene: "Eres camarero en un bistró. El alumno pide una mesa para una persona y elige plato y bebida.",
              objectives: ["Pedir una mesa para uno", "Elegir un plato principal del menú", "Pedir la cuenta por favor"],
            },
            {
              id: "compras",
              code: "EN-A1-M1-L5",
              order: 5,
              title: "Lección 5: De Compras en la Tienda",
              credits: 2,
              scene: "Eres dependiente de una tienda. El alumno busca un artículo de ropa y pregunta tallas y precios.",
              objectives: ["Preguntar si tienen una talla específica", "Preguntar el precio del producto", "Comprar o agradecer cortésmente"],
            },
            {
              id: "hito_m1",
              code: "EN-A1-M1-L6",
              order: 6,
              title: "Lección 6: Hito Integrador Módulo 1",
              credits: 2,
              scene: "Simulación combinada de un día de viaje: taxi, hotel y café en un solo recorrido interactivo.",
              objectives: ["Gestionar llegada y traslado", "Completar registro con datos personales", "Solicitar un refrigerio con cortesía"],
            },
          ],
        },
        {
          id: "m2",
          order: 2,
          title: "Módulo 2: Interacción Social y Rutinas",
          targetCredits: 12,
          description: "Vida cotidiana, trabajo de oficina, aeropuertos y descripción de horarios y aficiones.",
          lessons: [
            {
              id: "cliente",
              code: "EN-A1-M2-L1",
              order: 7,
              title: "Lección 7: Recepción en la Oficina",
              credits: 2,
              scene: "Eres anfitrión de recepción en una empresa. El alumno se presenta y dice a quién viene a ver.",
              objectives: ["Saludar y decir tu nombre y empresa", "Mencionar con quién tienes una cita", "Aceptar un asiento o agua"],
            },
            {
              id: "aeropuerto",
              code: "EN-A1-M2-L2",
              order: 8,
              title: "Lección 8: En el Aeropuerto",
              credits: 2,
              scene: "Eres agente de check-in en el aeropuerto. El alumno entrega su pasaporte y dice su destino.",
              objectives: ["Saludar y entregar pasaporte", "Confirmar ciudad de destino", "Preguntar por la puerta de embarque"],
            },
            {
              id: "rutina",
              code: "EN-A1-M2-L3",
              order: 9,
              title: "Lección 9: Mi Rutina y Horarios",
              credits: 2,
              scene: "Conversación amigable sobre tu día a día: a qué hora te levantas, trabajas y descansas.",
              objectives: ["Decir a qué hora empieza tu día", "Describir 2 actividades habituales", "Preguntar al tutor sobre su horario"],
            },
            {
              id: "familia",
              code: "EN-A1-M2-L4",
              order: 10,
              title: "Lección 10: Familia y Entorno",
              credits: 2,
              scene: "Charla informal describiendo a las personas cercanas y tu lugar de residencia.",
              objectives: ["Mencionar con quién vives", "Describir a un familiar o amigo", "Decir dónde está ubicada tu casa"],
            },
            {
              id: "libre",
              code: "EN-A1-M2-L5",
              order: 11,
              title: "Lección 11: Charla Cotidiana y Hobbies",
              credits: 2,
              scene: "Conversación relajada para principiante sobre gustos sencillos, comidas y tiempo libre.",
              objectives: ["Responder cómo estás hoy", "Decir tu comida o bebida favorita", "Decir qué haces en tu tiempo libre"],
            },
            {
              id: "hito_m2",
              code: "EN-A1-M2-L6",
              order: 12,
              title: "Lección 12: Hito Integrador Módulo 2",
              credits: 2,
              scene: "Simulación de networking ligero: presentación personal, rutina profesional y gustos compartidos.",
              objectives: ["Presentarte en un evento social", "Explicar tu rol o profesión básica", "Intercambiar datos de contacto"],
            },
          ],
        },
        {
          id: "m3",
          order: 3,
          title: "Módulo 3: Servicios, Salud y Ciudad",
          targetCredits: 12,
          description: "Ubicación en la ciudad, citas médicas básicas, compras en supermercado y resolución de imprevistos.",
          lessons: [
            {
              id: "farmacia",
              code: "EN-A1-M3-L1",
              order: 13,
              title: "Lección 13: En la Farmacia",
              credits: 2,
              scene: "Eres farmacéutico. El alumno describe un malestar simple (dolor de cabeza o resfriado) y pide analgésicos.",
              objectives: ["Explicar qué te duele", "Preguntar cómo tomar el medicamento", "Pagar y agradecer"],
            },
            {
              id: "supermercado",
              code: "EN-A1-M3-L2",
              order: 14,
              title: "Lección 14: En el Supermercado",
              credits: 2,
              scene: "Eres dependiente del supermercado. El alumno busca ingredientes y pregunta ubicaciones de pasillos.",
              objectives: ["Preguntar dónde está un producto (Where is...?)", "Consultar si hay opciones frescas", "Pasar por caja"],
            },
            {
              id: "direcciones",
              code: "EN-A1-M3-L3",
              order: 15,
              title: "Lección 15: Pidiendo Direcciones en la Calle",
              credits: 2,
              scene: "Eres un peatón local. El alumno te detiene amablemente para pedir indicaciones para llegar a la estación.",
              objectives: ["Disculparte y pedir ayuda (Excuse me)", "Preguntar por un lugar de referencia", "Entender indicaciones de giro (left/right)"],
            },
            {
              id: "clima",
              code: "EN-A1-M3-L4",
              order: 16,
              title: "Lección 16: El Clima y Planes de Salida",
              credits: 2,
              scene: "Diálogo cotidiano comentando el clima actual y decidiendo qué ropa llevar o adónde salir.",
              objectives: ["Describir el clima de hoy (hot, cold, rainy)", "Decir qué ropa vas a vestir", "Proponer un plan acorde al tiempo"],
            },
            {
              id: "emergencias",
              code: "EN-A1-M3-L5",
              order: 17,
              title: "Lección 17: Situaciones de Asistencia",
              credits: 2,
              scene: "Eres oficial de información turística. El alumno reporta un objeto extraviado y solicita orientación.",
              objectives: ["Pedir ayuda con calma", "Describir el objeto perdido", "Dar un teléfono o lugar de contacto"],
            },
            {
              id: "hito_m3",
              code: "EN-A1-M3-L6",
              order: 18,
              title: "Lección 18: Proyecto Final de Nivel A1",
              credits: 2,
              scene: "Hito final de graduación A1: simulación continua de un día completo de autonomía en el extranjero.",
              objectives: ["Resolver transporte y comida", "Mantener una conversación básica fluida", "Demostrar preparación para Examen de Suficiencia"],
            },
          ],
        },
      ],
    },
    A2: {
      level: "A2",
      name: "Plataforma (Waystage)",
      targetCredits: 36,
      modules: [
        {
          id: "m1",
          order: 1,
          title: "Módulo 1: Servicios y Preferencias",
          targetCredits: 12,
          description: "Especificaciones detalladas, compras con comparación, reservas y peticiones especiales.",
          lessons: [
            { id: "cafe", code: "EN-A2-M1-L1", order: 1, title: "Lección 1: Café con Especificaciones", credits: 2, scene: "Eres barista. El alumno pide café con especificaciones (tamaño, tipo de leche o azúcar) y pregunta el precio.", objectives: ["Pedir tu café especificando tamaño o leche", "Preguntar cuánto cuesta", "Pagar y despedirte amablemente"] },
            { id: "hotel", code: "EN-A2-M1-L2", order: 2, title: "Lección 2: Hotel con Solicitudes Especiales", credits: 2, scene: "Recepcionista. El alumno solicita habitación con vista tranquila y pide información sobre el gimnasio o transporte.", objectives: ["Solicitar preferencias de habitación", "Preguntar horarios de servicios", "Pedir servicio de despertador"] },
            { id: "taxi", code: "EN-A2-M1-L3", order: 3, title: "Lección 3: Taxi con Rutas y Estimaciones", credits: 2, scene: "Taxista. El alumno da instrucciones de giro, pide detenerse en un punto y solicita recibo.", objectives: ["Dar instrucciones de giro", "Pedir detenerse cerca de un punto", "Solicitar recibo"] },
            { id: "restaurante", code: "EN-A2-M1-L4", order: 4, title: "Lección 4: Alergias y Recomendaciones", credits: 2, scene: "Camarero. El alumno consulta ingredientes por intolerancia alimentaria y pide recomendaciones de la casa.", objectives: ["Preguntar por ingredientes específicos", "Explicar preferencias o restricciones", "Pedir la cuenta por separado"] },
            { id: "tienda", code: "EN-A2-M1-L5", order: 5, title: "Lección 5: Cambios y Devoluciones", credits: 2, scene: "Dependiente. El alumno regresa a cambiar una prenda por otra talla mostrando el ticket de compra.", objectives: ["Explicar el motivo del cambio", "Probarte otra talla o color", "Completar la transacción con recibo"] },
            { id: "hito_m1", code: "EN-A2-M1-L6", order: 6, title: "Lección 6: Hito Integrador Módulo 1 (A2)", credits: 2, scene: "Día completo de compras y gastronomía resolviendo imprevistos y especificaciones.", objectives: ["Manejar peticiones complejas en tiendas", "Especificar detalles de consumo", "Resolver diferencias de precios"] },
          ],
        },
        {
          id: "m2",
          order: 2,
          title: "Módulo 2: Trabajo, Planes y Compromisos",
          targetCredits: 12,
          description: "Pasado simple, planes futuros (going to), confirmación de agendas y anécdotas de viajes.",
          lessons: [
            { id: "cliente", code: "EN-A2-M2-L1", order: 7, title: "Lección 7: Confirmación de Agenda", credits: 2, scene: "Coordinador de oficina. El alumno acuerda hora y sala para una reunión de trabajo.", objectives: ["Proponer un horario de reunión", "Ajustar si hay conflicto de horario", "Confirmar los participantes"] },
            { id: "aeropuerto", code: "EN-A2-M2-L2", order: 8, title: "Lección 8: Conexiones de Vuelo", credits: 2, scene: "Agente de tráfico aéreo. El alumno registra equipaje, elige asiento de pasillo o ventana y confirma conexión.", objectives: ["Registrar equipaje", "Elegir asiento específico", "Confirmar puerta de conexión"] },
            { id: "fin_semana", code: "EN-A2-M2-L3", order: 9, title: "Lección 9: ¿Qué Hiciste el Fin de Semana?", credits: 2, scene: "Charla entre colegas sobre anécdotas del fin de semana pasado usando pasado simple.", objectives: ["Contar 2 actividades pasadas con verbos regulares e irregulares", "Opinar sobre el evento", "Preguntar al colega"] },
            { id: "proyectos", code: "EN-A2-M2-L4", order: 10, title: "Lección 10: Planes y Metas Próximas", credits: 2, scene: "Conversación sobre proyectos personales y viajes previstos usando 'be going to'.", objectives: ["Explicar un plan futuro ya decidido", "Mencionar fecha estimada", "Dar el motivo del plan"] },
            { id: "libre", code: "EN-A2-M2-L5", order: 11, title: "Lección 11: Charla Cotidiana A2", credits: 2, scene: "Charla abierta sobre experiencias de aprendizaje de idiomas y anécdotas culturales.", objectives: ["Compartir por qué estudias idiomas", "Mencionar una dificultad superada", "Preguntar por consejos al tutor"] },
            { id: "hito_m2", code: "EN-A2-M2-L6", order: 12, title: "Lección 12: Hito Integrador Módulo 2 (A2)", credits: 2, scene: "Presentación de reporte de actividades laborales y balance del mes frente al tutor.", objectives: ["Resumir tareas concluidas", "Proyectar compromisos siguientes", "Responder preguntas de clarificación"] },
          ],
        },
        {
          id: "m3",
          order: 3,
          title: "Módulo 3: Vida Urbana y Solución de Problemas",
          targetCredits: 12,
          description: "Comparaciones, alquileres, salud y preparación de suficiencia para salto a B1.",
          lessons: [
            { id: "alquiler", code: "EN-A2-M3-L1", order: 13, title: "Lección 13: Buscando Apartamento", credits: 2, scene: "Agente inmobiliario. El alumno consulta por alquiler de apartamento, número de habitaciones y servicios incluidos.", objectives: ["Preguntar por precio mensual y depósito", "Consultar si incluye servicios", "Agendar visita"] },
            { id: "medico", code: "EN-A2-M3-L2", order: 14, title: "Lección 14: Consulta con el Doctor", credits: 2, scene: "Médico general. El alumno describe síntomas con duración (desde hace 3 días) y sigue indicaciones.", objectives: ["Describir síntomas con precisión", "Indicar desde cuándo te sientes mal", "Anotar instrucciones médicas"] },
            { id: "reclamacion", code: "EN-A2-M3-L3", order: 15, title: "Lección 15: Reclamo por Servicio", credits: 2, scene: "Atención al cliente. El alumno reclama de forma educada por un paquete demorado o servicio defectuoso.", objectives: ["Explicar el problema con cortesía", "Proporcionar número de seguimiento", "Acordar una solución o reembolso"] },
            { id: "cultura", code: "EN-A2-M3-L4", order: 16, title: "Lección 16: Costumbres y Tradiciones", credits: 2, scene: "Intercambio cultural sobre festividades y comidas típicas comparando dos países.", objectives: ["Describir una festividad tradicional", "Comparar con otra cultura", "Expresar opiniones con 'I think...'"] },
            { id: "invitaciones", code: "EN-A2-M3-L5", order: 17, title: "Lección 17: Invitaciones y Eventos", credits: 2, scene: "Amigo local. El alumno invita a una cena o responde a una invitación aceptando o declinando con motivo.", objectives: ["Invitar formalmente (Would you like to...?)", "Aceptar con entusiasmo", "Rechazar amablemente justificando la razón"] },
            { id: "hito_m3", code: "EN-A2-M3-L6", order: 18, title: "Lección 18: Simulación de Suficiencia A2", credits: 2, scene: "Ensayo general para el Examen de Suficiencia de salida de nivel A2 con Wetty.", objectives: ["Demostrar control de pasado y futuro", "Resolver 3 transacciones sin titubeos", "Alcanzar 36 créditos acumulados"] },
          ],
        },
      ],
    },
    B1: {
      level: "B1",
      name: "Intermedio (Threshold)",
      targetCredits: 36,
      modules: [
        {
          id: "m1",
          order: 1,
          title: "Módulo 1: Comunicación Fluida y Expresión Personal",
          targetCredits: 12,
          description: "Café de especialidad, resolución de incidencias hoteleras y negociación de tarifas.",
          lessons: [
            { id: "cafe", code: "EN-B1-M1-L1", order: 1, title: "Lección 1: Café de Especialidad", credits: 2, scene: "Barista de especialidad. Discusión de aromas y métodos.", objectives: ["Pedir recomendación según gustos", "Consultar opciones de snack", "Explicar preferencias"] },
            { id: "hotel", code: "EN-B1-M1-L2", order: 2, title: "Lección 2: Resolución de Problemas en Hotel", credits: 2, scene: "Gerente nocturno. Solución a fallos de aire o habitación.", objectives: ["Explicar desperfecto con claridad", "Solicitar cambio o reparación", "Exigir compensación cortés"] },
            { id: "taxi", code: "EN-B1-M1-L3", order: 3, title: "Lección 3: Negociación de Tarifa y Ruta", credits: 2, scene: "Chofer en hora pico. Ajuste de ruta por tráfico.", objectives: ["Explicar prisa por vuelo", "Evaluar rutas alternas", "Acordar pago digital"] },
            { id: "opinion", code: "EN-B1-M1-L4", order: 4, title: "Lección 4: Debatiendo Películas y Libros", credits: 2, scene: "Tertulia cultural sobre tramas, personajes y recomendaciones.", objectives: ["Resumir el argumento", "Dar tu opinión justificada", "Recomendar o desaconsejar"] },
            { id: "viajes", code: "EN-B1-M1-L5", order: 5, title: "Lección 5: Planificando una Expedición", credits: 2, scene: "Agente de aventuras. Planificación de ruta y presupuesto.", objectives: ["Definir itinerario de 5 días", "Cotizar seguro de viaje", "Anticipar imprevistos climáticos"] },
            { id: "hito_m1", code: "EN-B1-M1-L6", order: 6, title: "Lección 6: Hito Integrador B1 (Módulo 1)", credits: 2, scene: "Mesa redonda sobre viajes y toma de decisiones en equipo.", objectives: ["Liderar una propuesta", "Escuchar y rebatir educadamente", "Llegar a consenso"] },
          ],
        },
        {
          id: "m2",
          order: 2,
          title: "Módulo 2: Entorno Profesional y Trabajo",
          targetCredits: 12,
          description: "Revisión de avance, entrevistas de trabajo, reclamos aeroportuarios y networking.",
          lessons: [
            { id: "cliente", code: "EN-B1-M2-L1", order: 7, title: "Lección 7: Revisión de Avance con Cliente", credits: 2, scene: "Reunión con cliente para presentar avances de entregables.", objectives: ["Presentar logros del sprint", "Manejar dudas de fechas", "Confirmar siguientes pasos"] },
            { id: "entrevista", code: "EN-B1-M2-L2", order: 8, title: "Lección 8: Entrevista de Trabajo B1", credits: 2, scene: "Entrevistador de RRHH evaluando trayectoria y fortalezas.", objectives: ["Explicar trayectoria formativa", "Describir 2 fortalezas con ejemplos", "Preguntar por la cultura de la empresa"] },
            { id: "aeropuerto", code: "EN-B1-M2-L3", order: 9, title: "Lección 9: Reclamo de Equipaje Demorado", credits: 2, scene: "Oficina de objetos perdidos en aeropuerto.", objectives: ["Detallar características de maleta", "Completar reporte de reclamo", "Solicitar kit de emergencia"] },
            { id: "reuniones", code: "EN-B1-M2-L4", order: 10, title: "Lección 10: Dirigiendo una Reunión Breve", credits: 2, scene: "Stand-up diario de equipo para coordinar tareas.", objectives: ["Abrir la sesión puntualmente", "Dar la palabra a compañeros", "Resumir acuerdos clave"] },
            { id: "libre", code: "EN-B1-M2-L5", order: 11, title: "Lección 11: Conversación de Temas de Interés", credits: 2, scene: "Conversación abierta sobre metas y retos contemporáneos.", objectives: ["Estructurar ideas con conectores", "Defender un punto de vista", "Pedir feedback al tutor"] },
            { id: "hito_m2", code: "EN-B1-M2-L6", order: 12, title: "Lección 12: Hito Integrador B1 (Módulo 2)", credits: 2, scene: "Simulación de presentación comercial ante posibles inversionistas.", objectives: ["Pitch de 2 minutos", "Manejar preguntas y objeciones", "Cierre con llamada a la acción"] },
          ],
        },
        {
          id: "m3",
          order: 3,
          title: "Módulo 3: Argumentación, Cultura y Suficiencia B1",
          targetCredits: 12,
          description: "Hipotéticos (segundo condicional), medio ambiente, medios de comunicación y certificación B1.",
          lessons: [
            { id: "medioambiente", code: "EN-B1-M3-L1", order: 13, title: "Lección 13: Sostenibilidad y Ecología", credits: 2, scene: "Debate ciudadano sobre hábitos de reciclaje y transporte limpio.", objectives: ["Explicar causas y consecuencias", "Plantear soluciones individuales", "Usar conectores de causa-efecto"] },
            { id: "tecnologia", code: "EN-B1-M3-L2", order: 14, title: "Lección 14: Impacto de las Redes Sociales", credits: 2, scene: "Charla reflexiva sobre ventajas y desventajas de la conectividad digital.", objectives: ["Contrastar pros y contras", "Compartir una experiencia propia", "Concluir con balance reflexivo"] },
            { id: "salud_mental", code: "EN-B1-M3-L3", order: 15, title: "Lección 15: Equilibrio Vida-Trabajo", credits: 2, scene: "Consejería de bienestar sobre cómo desconectar tras la jornada laboral.", objectives: ["Describir fuentes de estrés", "Proponer rutinas de desconexión", "Evaluar efectividad de hábitos"] },
            { id: "dilemas", code: "EN-B1-M3-L4", order: 16, title: "Lección 16: Dilemas Hipotéticos (What if...?)", credits: 2, scene: "Juego de decisiones éticas e hipotéticas usando segundo condicional.", objectives: ["Formular frases con 'If I were...'", "Justificar decisiones difíciles", "Imaginar escenarios futuros"] },
            { id: "noticias", code: "EN-B1-M3-L5", order: 17, title: "Lección 17: Comentando Titulares de Prensa", credits: 2, scene: "Análisis de una noticia destacada de ciencia o descubrimientos.", objectives: ["Parafrasear el hecho noticioso", "Distinguir hecho de opinión", "Especular sobre el impacto"] },
            { id: "hito_m3", code: "EN-B1-M3-L6", order: 18, title: "Lección 18: Simulación de Suficiencia B1", credits: 2, scene: "Examen integral de competencias B1 para desbloqueo de nivel B2.", objectives: ["Fluidez sostenida de 6 turnos", "Precisión con tiempos compuestos", "Cumplimiento de 36 créditos de B1"] },
          ],
        },
      ],
    },
  },
  zh: {
    HSK1: {
      level: "HSK1",
      name: "HSK 1 (Principiante Mandarín)",
      targetCredits: 36,
      modules: [
        {
          id: "m1",
          order: 1,
          title: "Módulo 1: Fonética y Supervivencia Básica",
          targetCredits: 12,
          description: "Dominio de los 4 tonos, pinyin, saludos y pedidos esenciales.",
          lessons: [
            { id: "cafe", code: "ZH-H1-M1-L1", order: 1, title: "第1课: 点咖啡或茶 (Pedir café o té)", credits: 2, scene: "服务员。学生点咖啡或茶。", objectives: ["Saludar en chino (你好)", "Pedir café o té (我要咖啡)", "Dar las gracias (谢谢)"] },
            { id: "cliente", code: "ZH-H1-M1-L2", order: 2, title: "第2课: 欢迎客人 (Dar bienvenida)", credits: 2, scene: "公司前台。欢迎客人并倒水。", objectives: ["Preguntar nombre (你叫什么名字？)", "Dar bienvenida (请进)", "Ofrecer agua (请喝水)"] },
            { id: "libre", code: "ZH-H1-M1-L3", order: 3, title: "第3课: 日常问候 (Saludos y comida)", credits: 2, scene: "轻松日常对话。", objectives: ["Responder cómo estás (我很好)", "Comida favorita (我喜欢吃...)", "Preguntar al tutor (你呢？)"] },
            { id: "numeros", code: "ZH-H1-M1-L4", order: 4, title: "第4课: 数字与价格 (Números y precios)", credits: 2, scene: "水果摊买苹果。", objectives: ["Contar del 1 al 10", "Preguntar precio (多少钱？)", "Decir muy caro (太贵了)"] },
            { id: "nacionalidad", code: "ZH-H1-M1-L5", order: 5, title: "第5课: 国籍与语言 (Países e idiomas)", credits: 2, scene: "介绍自己的国家。", objectives: ["Decir de dónde eres (我是...人)", "Decir que estudias chino (我学中文)", "Preguntar al otro"] },
            { id: "hito_m1", code: "ZH-H1-M1-L6", order: 6, title: "第6课: 第一单元考核 (Hito Módulo 1)", credits: 2, scene: "综合对话考核。", objectives: ["Saludos y tonos correctos", "Presentación completa", "Compra simple"] },
          ],
        },
        {
          id: "m2",
          order: 2,
          title: "Módulo 2: Vida Diaria y Familia",
          targetCredits: 12,
          description: "Familia, fechas, horas y gustos cotidianos.",
          lessons: [
            { id: "familia", code: "ZH-H1-M2-L1", order: 7, title: "第7课: 我的家 (Mi familia)", credits: 2, scene: "介绍家里的照片。", objectives: ["Mencionar cuántos son (我家有几口人)", "Papá y mamá", "Tener o no tener (有/没有)"] },
            { id: "hora", code: "ZH-H1-M2-L2", order: 8, title: "第8课: 现在几点 (¿Qué hora es?)", credits: 2, scene: "看表约时间。", objectives: ["Decir la hora exacta (点/分)", "Decir fecha (月/号)", "Acordar encuentro"] },
            { id: "semana", code: "ZH-H1-M2-L3", order: 9, title: "第9课: 星期几 (Días de la semana)", credits: 2, scene: "安排一周的活动。", objectives: ["Días de la semana (星期一到星期日)", "Hacer planes", "Preguntar al tutor"] },
            { id: "tienda", code: "ZH-H1-M2-L4", order: 10, title: "第10课: 去商店 (En la tienda)", credits: 2, scene: "买水和面包。", objectives: ["Pedir objetos con clasificador (个)", "Pagar con yuanes (块/元)", "Despedirse (再见)"] },
            { id: "transporte", code: "ZH-H1-M2-L5", order: 11, title: "第11课: 坐出租车 (En el taxi)", credits: 2, scene: "告诉师傅去哪里。", objectives: ["Indicar destino (去哪里)", "Preguntar tiempo", "Agradecer al chofer"] },
            { id: "hito_m2", code: "ZH-H1-M2-L6", order: 12, title: "第12课: 第二单元考核 (Hito Módulo 2)", credits: 2, scene: "日常会话综合模拟。", objectives: ["Manejo de fechas y horas", "Expresar posesión", "Superar 24 créditos"] },
          ],
        },
        {
          id: "m3",
          order: 3,
          title: "Módulo 3: Ubicaciones, Salud y Suficiencia HSK1",
          targetCredits: 12,
          description: "Direcciones, estados de salud y examen de suficiencia para HSK 2.",
          lessons: [
            { id: "donde", code: "ZH-H1-M3-L1", order: 13, title: "第13课: 在哪里 (¿Dónde está?)", credits: 2, scene: "在路上问路。", objectives: ["Preguntar ubicación (在...吗？)", "Delante y detrás (前/后)", "Arriba y abajo (上/下)"] },
            { id: "salud", code: "ZH-H1-M3-L2", order: 14, title: "第14课: 身体怎么样 (¿Cómo estás de salud?)", credits: 2, scene: "问候生病的朋友。", objectives: ["Preguntar salud", "Decir no sentirte bien", "Aconsejar descansar"] },
            { id: "clima", code: "ZH-H1-M3-L3", order: 15, title: "第15课: 今天冷不冷 (¿Hace frío hoy?)", credits: 2, scene: "谈论今天的天气。", objectives: ["Frío y calor (冷/热)", "Lluvia (下雨)", "Ropa adecuada"] },
            { id: "hobbies", code: "ZH-H1-M3-L4", order: 16, title: "第16课: 你的爱好 (Tus pasatiempos)", credits: 2, scene: "交流课外兴趣。", objectives: ["Ver películas (看电影)", "Leer libros (看书)", "Escuchar música (听音乐)"] },
            { id: "amigos", code: "ZH-H1-M3-L5", order: 17, title: "第17课: 和朋友在一起 (Con amigos)", credits: 2, scene: "聚会点餐聊天。", objectives: ["Invitar a comer", "Expresar agrado", "Despedida cordial"] },
            { id: "hito_m3", code: "ZH-H1-M3-L6", order: 18, title: "第18课: HSK1 毕业考核 (Suficiencia HSK1)", credits: 2, scene: "HSK1 综合口语与听力考核。", objectives: ["150 palabras clave dominadas", "Pronunciación tonal precisa", "Completar 36 créditos de HSK1"] },
          ],
        },
      ],
    },
  },
};

/**
 * Capítulos Oficiales del "Polyglot Curriculum Handbook" (Textbook Oficial).
 * Cada lección cuenta con su ficha editorial estructurada en 5 dimensiones canónicas.
 */
export const CURRICULUM_HANDBOOK = {
  "EN-A1-M1-L1": {
    code: "EN-A1-M1-L1",
    lessonId: "cafe",
    title: "En la Cafetería: Pedidos y Cortesía Básica",
    level: "A1",
    moduleTitle: "Módulo 1: Primeros Contactos y Supervivencia",
    credits: 2,
    durationMinutes: 20,
    canDoDescriptors: [
      "El alumno es capaz de saludar cortésmente y pedir una bebida habitual (café, té, agua).",
      "El alumno es capaz de deletrear o pronunciar su nombre para el vaso o la orden.",
      "El alumno formula peticiones educadas básicas utilizando 'Could I have...' o 'Can I have...' en lugar de imperativos.",
    ],
    grammarCorpus: {
      summary: "Peticiones de cortesía mediante modales auxiliares y fórmulas transaccionales.",
      formula: "Can I have + [artículo/modificador] + [sustantivo], please?",
      contrast: [
        {
          mistake: "I want a coffee (suena tajante y poco cortés en inglés nativo)",
          correct: "Can I have a coffee, please?",
          why: "En la cultura angloparlante, 'I want' directo suena demandante. Se prefiere la pregunta modal 'Can I have' o el condicional 'I'd like'.",
        },
        {
          mistake: "Give me one coffee",
          correct: "I'd like a coffee, please",
          why: "El imperativo directo se percibe como rudo hacia el personal de servicio.",
        },
        {
          mistake: "I have hunger / I have thirst",
          correct: "I am hungry / I am thirsty",
          why: "Las sensaciones físicas se construyen con el verbo 'to be' + adjetivo, nunca con 'have'.",
        },
      ],
    },
    collocations: [
      { phrase: "A cup of coffee", ipa: "/ə kʌp əv ˈkɒfi/", role: "Sustantivo cuantificador", example: "Can I have a cup of coffee?", speak: "A cup of coffee, please." },
      { phrase: "Skim milk / Oat milk", ipa: "/skɪm mɪlk / əʊt mɪlk/", role: "Modificador léxico", example: "With oat milk, please.", speak: "With oat milk, please." },
      { phrase: "To go / Takeaway", ipa: "/tə ɡəʊ / ˈteɪkəweɪ/", role: "Frase adverbial", example: "For here or to go?", speak: "To go, please." },
      { phrase: "Have a nice day", ipa: "/hæv ə naɪs deɪ/", role: "Fórmula de cortesía", example: "Thank you, have a nice day!", speak: "Thank you, have a nice day!" },
      { phrase: "Keep the change", ipa: "/kiːp ðə tʃeɪndʒ/", role: "Frase idiomática", example: "Here is five dollars, keep the change.", speak: "Keep the change." },
      { phrase: "Medium size", ipa: "/ˈmiːdiəm saɪz/", role: "Dimensión", example: "A medium size latte, please.", speak: "A medium size latte, please." },
      { phrase: "Still water", ipa: "/stɪl ˈwɔːtər/", role: "Bebida", example: "A bottle of still water, please.", speak: "A bottle of still water, please." },
      { phrase: "How much is it?", ipa: "/haʊ mʌtʃ ɪz ɪt/", role: "Pregunta transaccional", example: "How much is it altogether?", speak: "How much is it?" },
    ],
    dialogueModel: {
      context: "Cafetería en el centro de Londres durante la mañana.",
      speakers: ["Barista (Wetty)", "Estudiante (Alex)"],
      turns: [
        { speaker: "Barista", text: "Good morning! Welcome to Central Roast. What can I get for you today?", note: "Apertura estándar con entonación ascendente de bienvenida." },
        { speaker: "Alex", text: "Good morning! Can I have a latte with oat milk, please?", note: "Uso ejemplar de cortesía con 'Can I have' y especificación de leche." },
        { speaker: "Barista", text: "Sure thing! Small, medium, or large? And for here or to go?", note: "Preguntas de desambiguación binaria típicas en servicios anglosajones." },
        { speaker: "Alex", text: "A medium, to go, please. And what is your name?", note: "Respuesta concisa seguida de una interacción social amistosa." },
        { speaker: "Barista", text: "I'm Wetty! And what name should I put on the cup?", note: "Intercambio de nombres para la entrega del pedido." },
        { speaker: "Alex", text: "My name is Alex. Thank you!", note: "Respuesta directa y clara con gratitud final." },
        { speaker: "Barista", text: "That will be four dollars. Thanks, Alex! Your drink will be ready in two minutes.", note: "Cierre transaccional formal con indicación de tiempo de espera." },
      ],
    },
    tasks: {
      warmup: "Completar la pre-sesión Warm-up (3 preguntas de active recall para despertar vocabulario de cafetería).",
      central: "Realizar la sesión de voz con Wetty cumpliendo al menos 2 de los 3 objetivos con nota ≥ 70.",
      homework: "Guardar 2 nuevas colocaciones en el mazo SRS y repasarlas mañana para fijar la memoria a largo plazo.",
    },
  },

  "EN-A1-M1-L2": {
    code: "EN-A1-M1-L2",
    lessonId: "hotel",
    title: "Check-in en el Hotel: Registro y Servicios",
    level: "A1",
    moduleTitle: "Módulo 1: Primeros Contactos y Supervivencia",
    credits: 2,
    durationMinutes: 20,
    canDoDescriptors: [
      "El alumno es capaz de anunciar su llegada indicando que tiene una reserva previa.",
      "El alumno es capaz de deletrear su apellido y proporcionar su pasaporte al recepcionista.",
      "El alumno pregunta sobre servicios del hotel como el desayuno o la contraseña de Wi-Fi.",
    ],
    grammarCorpus: {
      summary: "Presente simple con verbo 'to have' y preguntas de existencia con 'Is there...?'",
      formula: "I have a reservation under the name of + [Apellido]. / Is breakfast included?",
      contrast: [
        {
          mistake: "I have a booking for the name Alex",
          correct: "I have a reservation under the name Alex",
          why: "En hotelería formal, se utiliza la preposición 'under the name of' para localizar reservas en el sistema.",
        },
        {
          mistake: "How much is the clock of breakfast?",
          correct: "What time is breakfast served?",
          why: "Para consultar horarios se utiliza 'What time is...' en lugar de traducir literalmente 'hora'.",
        },
      ],
    },
    collocations: [
      { phrase: "Under the name of", ipa: "/ˈʌndər ðə neɪm əv/", role: "Frase preposicional", example: "The room is under the name of Garcia.", speak: "Under the name of Garcia." },
      { phrase: "Key card", ipa: "/kiː kɑːd/", role: "Sustantivo compuesto", example: "Here is your key card for room 304.", speak: "Here is your key card." },
      { phrase: "Breakfast included", ipa: "/ˈbrekfəst ɪnˈkluːdɪd/", role: "Adjetivo / Estado", example: "Is breakfast included in my stay?", speak: "Is breakfast included?" },
      { phrase: "Wi-Fi password", ipa: "/ˈwaɪfaɪ ˈpɑːswɜːd/", role: "Sustantivo compuesto", example: "What is the Wi-Fi password?", speak: "What is the Wi-Fi password?" },
      { phrase: "Elevator / Lift", ipa: "/ˈelɪveɪtər / lɪft/", role: "Sustantivo", example: "The elevator is on the right.", speak: "The elevator is on your right." },
      { phrase: "Check-out time", ipa: "/tʃekaʊt taɪm/", role: "Horario", example: "Check-out time is at 11:00 AM.", speak: "Check-out time is at 11 AM." },
    ],
    dialogueModel: {
      context: "Recepción de hotel internacional a las 3:00 PM.",
      speakers: ["Recepcionista (Wetty)", "Huésped (Alex)"],
      turns: [
        { speaker: "Recepcionista", text: "Good afternoon! Welcome to Grand Palace Hotel. How may I assist you?", note: "Fórmula de bienvenida estándar en hospitalidad de 4 y 5 estrellas." },
        { speaker: "Alex", text: "Hello! I have a reservation under the name of Alex Garcia.", note: "Enunciación perfecta del nombre de reserva sin titubeos." },
        { speaker: "Recepcionista", text: "Excellent, Mr. Garcia. May I see your passport and a credit card for the deposit?", note: "Petición formal de documentos identificatorios." },
        { speaker: "Alex", text: "Here is my passport. Is breakfast included in the room?", note: "Entrega de documento y consulta de beneficio clave." },
        { speaker: "Recepcionista", text: "Yes, breakfast is served on the first floor from 7 to 10 AM. Here is your key card.", note: "Respuesta informativa y entrega de tarjeta llave." },
        { speaker: "Alex", text: "Thank you very much. What is the Wi-Fi password?", note: "Consulta de conectividad habitual." },
        { speaker: "Recepcionista", text: "It is printed on the key sleeve. Enjoy your stay with us!", note: "Cierre de cortesía deseando estancia agradable." },
      ],
    },
    tasks: {
      warmup: "Completar Warm-up de 3 reactivos sobre ortografía y deletreo en inglés.",
      central: "Realizar el check-in con Wetty en el hotel alcanzando al menos 2 objetivos.",
      homework: "Repasar las tarjetas de vocabulario del hotel en el mazo SRS.",
    },
  },

  "EN-A1-M1-L3": {
    code: "EN-A1-M1-L3",
    lessonId: "taxi",
    title: "En el Taxi y Direcciones: Movilidad Urbana",
    level: "A1",
    moduleTitle: "Módulo 1: Primeros Contactos y Supervivencia",
    credits: 2,
    durationMinutes: 20,
    canDoDescriptors: [
      "El alumno es capaz de indicar su destino al subir a un taxi o vehículo de aplicación.",
      "El alumno formula preguntas sobre la tarifa estimada y solicita detenerse en un punto de referencia.",
      "El alumno comprende y utiliza indicaciones cardinales simples (left, right, straight ahead).",
    ],
    grammarCorpus: {
      summary: "Imperativos suaves de dirección y preposiciones de lugar (to, near, at, across).",
      formula: "Could you take me to + [Destino], please? / Stop here, please.",
      contrast: [
        {
          mistake: "Carry me to the airport",
          correct: "Take me to the airport / Drive me to the airport",
          why: "El verbo 'carry' implica cargar físicamente con los brazos. El transporte en vehículo usa 'take' o 'drive'.",
        },
        {
          mistake: "How much money cost?",
          correct: "How much will it be? / How much is the fare?",
          why: "La pregunta estándar de tarifa en transporte es 'How much is the fare?' o simplemente 'How much?'.",
        },
      ],
    },
    collocations: [
      { phrase: "Take me to...", ipa: "/teɪk miː tə/", role: "Fórmula de dirección", example: "Please take me to Central Station.", speak: "Please take me to Central Station." },
      { phrase: "Turn left / Turn right", ipa: "/tɜːn left / tɜːn raɪt/", role: "Instrucción de giro", example: "Turn left at the traffic light.", speak: "Turn left at the light." },
      { phrase: "Straight ahead", ipa: "/streɪt əˈhed/", role: "Adverbio direccional", example: "Go straight ahead for two blocks.", speak: "Go straight ahead." },
      { phrase: "Drop me off here", ipa: "/drɒp miː ɒf hɪər/", role: "Frase idiomática", example: "You can drop me off right here.", speak: "Drop me off right here, please." },
      { phrase: "Keep the receipt", ipa: "/kiːp ðə rɪˈsiːt/", role: "Transaccional", example: "Can I have a receipt, please?", speak: "Can I have a receipt, please?" },
    ],
    dialogueModel: {
      context: "Tomando un taxi en la salida de una estación metropolitana.",
      speakers: ["Conductor (Wetty)", "Pasajero (Alex)"],
      turns: [
        { speaker: "Conductor", text: "Good morning! Hop in. Where are you heading today?", note: "Saludo coloquial natural de conductor anglosajón." },
        { speaker: "Alex", text: "Good morning! Please take me to Central Station. How much will it be?", note: "Destino claro y consulta de tarifa desde el inicio." },
        { speaker: "Conductor", text: "Traffic is light, so it should be about fifteen dollars on the meter.", note: "Estimación tarifaria basada en el taxímetro." },
        { speaker: "Alex", text: "Sounds good. Please drop me off near the main entrance.", note: "Especificación de punto de parada exacto." },
        { speaker: "Conductor", text: "Here we are! That will be fourteen fifty.", note: "Llegada al destino y anuncio del coste final." },
        { speaker: "Alex", text: "Here is twenty. Keep the change and thank you!", note: "Fórmula cortés de propina con 'Keep the change'." },
      ],
    },
    tasks: {
      warmup: "Completar la pre-sesión Warm-up sobre giros y números de dinero.",
      central: "Dar instrucciones de viaje a Wetty y cerrar el viaje con recibo.",
      homework: "Añadir 'drop me off' y 'receipt' al mazo de repetición espaciada.",
    },
  },
};

/**
 * Generador fallback de Handbook para lecciones que no tienen ficha editorial manual.
 * Garantiza que el 100% de las 18 lecciones por nivel cuenten con una guía oficial completa.
 */
export function getHandbookChapter(lang = "en", level = "A1", lessonId = "cafe") {
  // 1. Buscar coincidencia exacta por código o ID
  for (const chapter of Object.values(CURRICULUM_HANDBOOK)) {
    if (chapter.lessonId === lessonId && chapter.level === level) {
      return chapter;
    }
  }

  // 2. Buscar en la estructura curricular el título y escena
  const langCurriculum = CURRICULUM_TREE[lang]?.[level] || CURRICULUM_TREE.en.A1;
  let targetLesson = null;
  let targetModule = null;

  for (const mod of langCurriculum.modules) {
    const l = mod.lessons.find((x) => x.id === lessonId);
    if (l) {
      targetLesson = l;
      targetModule = mod;
      break;
    }
  }

  const title = targetLesson?.title || `Lección: ${lessonId}`;
  const code = targetLesson?.code || `${lang.toUpperCase()}-${level}-L-${lessonId}`;
  const scene = targetLesson?.scene || "Escenario comunicativo estructurado para práctica pedagógica.";
  const objectives = targetLesson?.objectives || [
    "Saludar y establecer el contexto comunicativo.",
    "Formular preguntas y respuestas claras adecuadas al nivel.",
    "Cerrar la interacción con cortesía y precisión.",
  ];

  return {
    code,
    lessonId,
    title,
    level,
    moduleTitle: targetModule?.title || "Módulo Curricular Oficial",
    credits: 2,
    durationMinutes: 20,
    canDoDescriptors: objectives.map((obj) => `El alumno es capaz de: ${obj.toLowerCase()}`),
    grammarCorpus: {
      summary: `Estructuras funcionales y fórmulas comunicativas de nivel ${level}.`,
      formula: "Sujeto + Verbo Auxiliar + Complemento situacional.",
      contrast: [
        {
          mistake: "Expresión literal traducida del español palabra por palabra.",
          correct: "Frase idiomática natural en el idioma meta con entonación adecuada.",
          why: `En ${level}, la naturalidad comunicativa prima sobre la traducción palabra por palabra.`,
        },
      ],
    },
    collocations: [
      { phrase: "Could I please have...", ipa: "/kʊd aɪ pliːz hæv/", role: "Fórmula de cortesía", example: "Could I please have your confirmation?", speak: "Could I please have your confirmation?" },
      { phrase: "I would like to...", ipa: "/aɪ wʊd laɪk tə/", role: "Expresión de deseo", example: "I would like to ask a question.", speak: "I would like to ask a question." },
      { phrase: "Thank you for your help", ipa: "/θæŋk juː fər jɔː help/", role: "Gratitud", example: "Thank you for your help today.", speak: "Thank you for your help today." },
      { phrase: "See you next time", ipa: "/siː juː nekst taɪm/", role: "Despedida", example: "See you next time, have a good day!", speak: "See you next time!" },
    ],
    dialogueModel: {
      context: scene,
      speakers: ["Tutor (Wetty)", "Estudiante"],
      turns: [
        { speaker: "Tutor", text: "Hello! Welcome to today's session. How can I help you?", note: "Apertura comunicativa de la lección." },
        { speaker: "Estudiante", text: "Hello! I am ready to practice our lesson objectives today.", note: "Respuesta del alumno mostrando iniciativa." },
        { speaker: "Tutor", text: "Fantastic! Let's work together to master these concepts.", note: "Refuerzo positivo del docente." },
      ],
    },
    tasks: {
      warmup: "Completar la pre-sesión Warm-up de 3 micro-retos (90 segundos).",
      central: `Realizar la conversación con Wetty cumpliendo los objetivos de ${title}.`,
      homework: "Guardar 2 expresiones nuevas en el mazo SRS de repetición espaciada.",
    },
  };
}

/**
 * Obtiene el árbol curricular enriquecido con el progreso del estudiante.
 * Marca lecciones completadas, en proceso y pendientes, junto al acumulado de créditos.
 */
export function getCurriculumTreeStatus({ state, lang = "en", level = null }) {
  const p = state?.data?.profile || {};
  const currentLevel = level || p.level || (lang === "zh" ? "HSK1" : "A1");
  const completedLessons = p.completedLessons || {};
  const accumulatedCredits = p.credits || 0;

  const levelTree = CURRICULUM_TREE[lang]?.[currentLevel] || CURRICULUM_TREE.en.A1;

  let totalAvailableCredits = 0;
  let earnedLevelCredits = 0;

  const modules = levelTree.modules.map((mod) => {
    let modEarnedCredits = 0;
    const lessons = mod.lessons.map((lesson) => {
      totalAvailableCredits += lesson.credits;
      const completionData = completedLessons[lesson.id];
      const isCompleted = Boolean(completionData);
      const score = completionData?.score || 0;

      if (isCompleted) {
        modEarnedCredits += lesson.credits;
        earnedLevelCredits += lesson.credits;
      }

      return {
        ...lesson,
        isCompleted,
        score,
        completedAt: completionData?.completedAt || null,
        creditsAwarded: isCompleted ? lesson.credits : 0,
      };
    });

    return {
      id: mod.id,
      order: mod.order,
      title: mod.title,
      description: mod.description,
      targetCredits: mod.targetCredits,
      earnedCredits: modEarnedCredits,
      progressPercent: Math.min(100, Math.round((modEarnedCredits / mod.targetCredits) * 100)),
      lessons,
    };
  });

  const effectiveCredits = Math.max(accumulatedCredits, earnedLevelCredits);
  const proficiencyUnlocked = effectiveCredits >= TOTAL_LEVEL_CREDITS || Boolean(p.proficiencyUnlocked);

  return {
    lang,
    level: currentLevel,
    levelName: levelTree.name,
    targetCredits: TOTAL_LEVEL_CREDITS,
    accumulatedCredits: Math.min(TOTAL_LEVEL_CREDITS, effectiveCredits),
    levelProgressPercent: Math.min(100, Math.round((effectiveCredits / TOTAL_LEVEL_CREDITS) * 100)),
    proficiencyUnlocked,
    modules,
  };

}

/**
 * Asigna los 2 créditos académicos correspondientes tras completar una lección.
 * Implementa idempotencia: no duplica créditos si la lección ya fue acreditada,
 * pero actualiza la mejor puntuación histórica y el conteo de misiones diarias.
 */
export function awardLessonCredits({
  state,
  lang = "en",
  level = "A1",
  moduleId = "m1",
  lessonId = "cafe",
  score = 85,
  completedObjectives = 2,
  now = Date.now(),
}) {
  state.rollDay(now);
  const p = state.data.profile;
  p.completedLessons = p.completedLessons || {};

  const existing = p.completedLessons[lessonId];
  const isNewCompletion = !existing;

  if (isNewCompletion) {
    p.completedLessons[lessonId] = {
      completedAt: now,
      score: Math.round(score),
      credits: CREDITS_PER_LESSON,
      moduleId,
      level,
      completedObjectives,
    };
    p.credits = (p.credits || 0) + CREDITS_PER_LESSON;
  } else {
    // Si ya estaba completada, actualizar si la puntuación es superior
    if (score > (existing.score || 0)) {
      existing.score = Math.round(score);
    }
    existing.lastPracticedAt = now;
  }

  // Bonificación de XP por logro curricular (+35 XP)
  award(state, 35);

  // Registro en metas diarias
  state.data.daily.missions = (state.data.daily.missions || 0) + 1;

  // Validación de desbloqueo de examen de suficiencia (36 créditos)
  const totalLevelCredits = Math.min(TOTAL_LEVEL_CREDITS, p.credits || 0);
  const proficiencyUnlocked = totalLevelCredits >= TOTAL_LEVEL_CREDITS;
  if (proficiencyUnlocked) {
    p.proficiencyUnlocked = true;
  }

  state.save();

  return {
    ok: true,
    lessonId,
    level,
    creditsAwarded: isNewCompletion ? CREDITS_PER_LESSON : 0,
    totalLevelCredits,
    targetCredits: TOTAL_LEVEL_CREDITS,
    levelProgressPercent: Math.min(100, Math.round((totalLevelCredits / TOTAL_LEVEL_CREDITS) * 100)),
    proficiencyUnlocked,
    isNewCompletion,
    message: isNewCompletion
      ? `¡Felicitaciones! Has obtenido +${CREDITS_PER_LESSON} créditos académicos. Total en ${level}: ${totalLevelCredits}/${TOTAL_LEVEL_CREDITS}.`
      : `Lección repasada con éxito. Puntuación guardada. Créditos actuales: ${totalLevelCredits}/${TOTAL_LEVEL_CREDITS}.`,
  };
}
