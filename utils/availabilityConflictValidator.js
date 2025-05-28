import Availabilityexception from "../server/db/models/availabilityExceptions.js"
import Availabilitybarber from "../server/db/models/barbersAvailability.js"

// Convertir formato "HH:MM" a minutos para facilitar comparaciones
const convertTimeToMinutes = (timeString) => {
  const [hours, minutes] = timeString.split(":").map(Number);
  return hours * 60 + minutes;
};

// Obtener el día de la semana de una fecha (0 = domingo, 6 = sábado)
const getDayOfWeek = (dateString) => {
  const date = new Date(dateString + 'T00:00:00'); //se agrega + 'T00:00:00' para no tener errores de horario...
  return date.getDay();
};

//verificar si dos intervalos de tiempo se solapan
const doTimeSlotsOverlap = (slot1, slot2) => {
    const start1 = convertTimeToMinutes(slot1.startTime);
    const end1 = convertTimeToMinutes(slot1.endTime);
    const start2 = convertTimeToMinutes(slot2.startTime);
    const end2 = convertTimeToMinutes(slot2.endTime);

    return (start1 < end2 && end1 > start2);
};

//validador principal para conflictos de disponibilidad

export const validateAvailabilityConflicts = async (validationType, data) => {
    try{
        switch (validationType){
            case 'EXCEPTION':
                return await validateExceptionConflicts(data);
                case 'WEEKLY':
                    return await validateWeeklyConflicts(data);
                    default:
                        return {
                            valid: false,
                            error: 'Tipo de validacion no valida'
                        }
                        
        }
    }catch (error){
        console.error('Error en validacion de conflictos:', error);
        return{
            valid: false,
            error: 'Error intenor al validar conflictos de disponibilidad.'
        };
    }
};

// Validar conflictos al crear/actualizar excepciones
const validateExceptionConflicts = async ({barberId, date, timeSlots, isWorkingDay}) => {
    try {

      console.log(`🔍 Validando excepción para barbero ${barberId} en fecha ${date}`); //debug logs

        // Si es un día no laborable, no hay conflictos de horarios
        if (isWorkingDay === false){
            return {valid: true}
        }

        // Si no hay timeSlots, no hay conflictos
        if (!timeSlots || timeSlots.length === 0){
            return {valid: true};
        }

        //obtener el dia de la semana de la fecha
        const dayOfWeek = getDayOfWeek(date);
        console.log(`📅 Día de la semana: ${dayOfWeek} para fecha ${date}`); //debug log

         // Buscar la configuración semanal del barbero para ese día
        const weeklyAvailability = await Availabilitybarber.findOne({
            barberId,
            dayOfWeek
        });
        console.log("📋 Disponibilidad semanal:", weeklyAvailability); //debug log

        // Si no hay configuración semanal, no hay conflicto
        if (!weeklyAvailability || !weeklyAvailability.isWorkingDay){
            return {valid: true};
        } //dudas sobre esta condiciones, revisar luego no esta funcionando correctamente.

        //Verificar conflictos con otros datos horarios del mismo dia (si existe una excepcion previa)
        /*const existingException = await Availabilityexception.findOne({
            barberId,
            date
        });
        Por el momento se comenta esta linea no se esta usando la constante.*/ 

        // Validar solapamientos internos en los nuevos timeSlots
        for (let i = 0; i < timeSlots.length; i++){
            for (let j = i + 1; j < timeSlots.length; j++){
                if (doTimeSlotsOverlap(timeSlots[i], timeSlots[j])){
                    return {
                      valid: false,
                      error: `Conflicto entre horarios de excepción: ${timeSlots[i].startTime}-${timeSlots[i].endTime} se solapa con ${timeSlots[j].startTime}-${timeSlots[j].endTime}`,
                    };
                }
            }
        }

        //mejora ahora proba sin el if()
        if (weeklyAvailability && weeklyAvailability.isWorkingDay && weeklyAvailability.timeSlots){
          console.log("🔄 Verificando conflictos con disponibilidad semanal..."); //debugg para verificar los paso que hace.
          // Verificar conflictos con la disponibilidad semanal
        const conflictingSlots = [];

        for (const exceptionSlot of timeSlots){
            for (const weeklySlot of weeklyAvailability.timeSlots){
              console.log(`Comparando excepción ${exceptionSlot.startTime}-${exceptionSlot.endTime} con semanal ${weeklySlot.startTime}-${weeklySlot.endTime}`);

                if (doTimeSlotsOverlap(exceptionSlot, weeklySlot)){
                  console.log("❌ ¡CONFLICTO DETECTADO!");
                  
                    conflictingSlots.push({
                        exceptionSlot: `${exceptionSlot.startTime}-${exceptionSlot.endTime}`,
                        weeklySlot: `${weeklySlot.startTime}-${weeklySlot.endTime}`
                    });
                }
            }
        }

        if (conflictingSlots.length > 0){
            const conflictMessages = conflictingSlots.map(conflict =>
                `Excepción ${conflict.exceptionSlot} conflicta con horario semanal ${conflict.weeklySlot}`
            );

            return {
                valid: false,
                error:`Conflictos detectados en la fecha ${date}: ${conflictMessages.join(', ')}. Las excepciones deben configurarse en horarios diferentes a la disponibilidad semanal.`,
                conflicts: conflictingSlots
            };
        }
      }
        console.log("✅ No se encontraron conflictos");
         return { valid: true };

    }catch (error){
        console.error("Error validando conflictos de excepción:", error);
        return {
          valid: false,
          error: "Error al validar conflictos con disponibilidad semanal",
        };
    }
 };

 // Validar conflictos al crear/actualizar disponibilidad semanal
 const validateWeeklyConflicts = async ({ barberId, dayOfWeek, timeSlots, isWorkingDay }) => {
    try{

      console.log(`🔍 Validando disponibilidad semanal para barbero ${barberId}, día ${dayOfWeek}`); //Prueba para ver el seguimiento 

      if (isWorkingDay === false) {
        return { valid: true };
      }

      // Si no hay timeSlots, no hay conflictos
      if (!timeSlots || timeSlots.length === 0) {
        return { valid: true };
      }

      // Validar solapamientos internos en los nuevos timeSlots
    for (let i = 0; i < timeSlots.length; i++) {
      for (let j = i + 1; j < timeSlots.length; j++) {
        if (doTimeSlotsOverlap(timeSlots[i], timeSlots[j])) {
          return {
            valid: false,
            error: `Conflicto en horarios semanales: ${timeSlots[i].startTime}-${timeSlots[i].endTime} se solapa con ${timeSlots[j].startTime}-${timeSlots[j].endTime}`
          };
        }
      }
    }

    // Buscar excepciones existentes para este barbero en el día de la semana correspondiente
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    // Buscar fechas futuras que coincidan con este día de la semana (próximos 3 meses)
    const futureExceptions = [];
    for (let month = 0; month < 6 ; month++){
        const checkDate = new Date (currentYear, currentMonth + month, 1);
        const dayInMouth = new Date (currentYear, currentMonth + month + 1, 0).getDate();

        for (let day = 1; day <= dayInMouth; day++){
            const dateToCheck = new Date (currentYear, currentMonth + month, day);

            if (dateToCheck.getDay() === dayOfWeek && dateToCheck >= today){
                const dateString = dateToCheck.toISOString().split('T')[0];

                const exception = await Availabilityexception.findOne({
                    barberId,
                    date: dateString,
                });
                
                if (exception && exception.timeSlots && exception.timeSlots.length > 0){
                    futureExceptions.push({
                        date: dateString,
                        timeSlots: exception.timeSlots
                    });
                }
            }
        }
    }

    console.log(`📋 Excepciones futuras encontradas: ${futureExceptions.length}`);

    // Verificar conflictos con excepciones existentes
    const conflictingDates = [];

    for (const exception of futureExceptions) {
        for (const weeklySlot of timeSlots) {
            for (const exceptionSlot of exception.timeSlots){
              console.log(`Comparando semanal ${weeklySlot.startTime}-${weeklySlot.endTime} con excepción ${exceptionSlot.startTime}-${exceptionSlot.endTime} del ${exception.date}`);
                if (doTimeSlotsOverlap(weeklySlot, exceptionSlot)) {
                  console.log("❌ ¡CONFLICTO DETECTADO!");
                    conflictingDates.push({
                        date: exception.date,
                        weeklySlot: `${weeklySlot.startTime}-${weeklySlot.endTime}`,
                        exceptionSlot: `${exceptionSlot.startTime}-${exceptionSlot.endTime}`,
                    });
                }
            }
        }
    }

    if (conflictingDates.length > 0) {
      const conflictMessages = conflictingDates.map(conflict => 
        `${conflict.date}: horario semanal ${conflict.weeklySlot} conflicta con excepción ${conflict.exceptionSlot}`
      );

      return {
        valid: false,
        error: `Conflictos detectados con excepciones existentes: ${conflictMessages.join(', ')}. Ajusta los horarios semanales o modifica las excepciones.`,
        conflicts: conflictingDates
      };
    }

    console.log("✅ No se encontraron conflictos semanales");
    return { valid: true };

    }catch (error){
        console.error("Error validando conflictos semanales:", error);
        return {
          valid: false,
          error: "Error al validar conflictos con excepciones existentes",
        };
    }
 };

 export const getEffectiveAvailability = async (barberId, date) => {
   try {
     const exception = await Availabilityexception.findOne({
       barberId,
       date,
     });

     if (exception) {
       return {
         source: "exception",
         isWorkingDay: exception.isWorkingDay,
         timeSlots: exception.timeSlots,
         reason: exception.reason,
       };
     }

     const dayOfWeek = getDayOfWeek(date);
     const weeklyAvailability = await Availabilitybarber.findOne({
       barberId,
       dayOfWeek,
     });

     if (weeklyAvailability) {
       return {
         source: "weekly",
         isWorkingDay: weeklyAvailability.isWorkingDay,
         timeSlots: weeklyAvailability.timeSlots,
       };
     }

     // Si no hay configuración, asumir que no trabaja
     return {
       source: "default",
       isWorkingDay: false,
       timeSlots: [],
     };
   } catch (error) {
    console.error("Error obteniendo disponibilidad efectiva:", error);
    throw error;
   }
 };

 // Función para validar disponibilidad antes de crear citas
 export const validateAppointmentAvailability = async (barberId, date, startTime, endTime) => {
    try{

        const effectiveAvailability = await getEffectiveAvailability(barberId, date);

        if (!effectiveAvailability.isWorkingDay) {
          return {
            valid: false,
            error: `El barbero no trabaja el ${date}`,
          };
        }

        const appoinmentSlot = { startTime, endTime };

        // Verificar si el horario de la cita está dentro de algún slot disponible
        const isWithinAvailableTime = effectiveAvailability.timeSlots.some(
          (slot) => {
            const slotStart = convertTimeToMinutes(slot.startTime);
            const slotEnd = convertTimeToMinutes(slot.endTime);
            const appointmentStart = convertTimeToMinutes(startTime);
            const appointmentEnd = convertTimeToMinutes(endTime)

            return appointmentStart >= slotStart && appointmentEnd <= slotEnd;
          });

          if (!isWithinAvailableTime) {
            return {
              valid: false,
              error: `El horario ${startTime}-${endTime} no está dentro de los horarios disponibles del barbero para el ${date}`,
            };
          }

          return { valid: true };

    }catch (error){
        console.error("Error validando disponibilidad para cita:", error);
        return {
          valid: false,
          error: "Error al validar disponibilidad para la cita",
        };
    }
 }