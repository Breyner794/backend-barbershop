/**
 * Valida un array de intervalos de tiempo para asegurar que no haya duplicados ni superposiciones
 * @param {Array} timeSlots - Array de objetos con startTime y endTime en formato "HH:MM"
 * @returns {Object} - Objeto con resultado de validación y mensajes de error o slots validados
 */

export const validateTimeSlots = (timeSlots) => {
  //validacion del array
  if (!timeSlots || !Array.isArray(timeSlots) || timeSlots.length === 0) {
    return {
      valid: false,                                                             //FUNCIONA
      error: "Los TimeSlots Deben ser un array no vacío",
    };
  }

  const seen = new Set();
  const slots = [];

  //proceso y validar cada intervalo de tiempo

  for (const slot of timeSlots) {
    if (!slot || typeof slot !== "object") {
      return { valid: false, error: "Cada timeSlot debe ser un objeto" };
    }

    if (!slot.startTime || !slot.endTime) {
      return { valid: false, error: "Cada timeSlot debe tener startTime y endTime" };
    }

    if (
      !/^([01]\d|2[0-3]):([0-5]\d)$/.test(slot.startTime) ||
      !/^([01]\d|2[0-3]):([0-5]\d)$/.test(slot.endTime)
    ) {
      return {
        valid: false,
        error: `Los tiempos deben estar en formato HH:MM (24h). Valor inválido: ${slot.startTime || slot.endTime}`
      };
    }

    //convertir el tiempo a minutos para comparar y ser mas facil.
    const [startHour, startMinute] = slot.startTime.split(':').map(Number);
    const [endHour, endMinute] = slot.endTime.split(':').map(Number);

    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    //verificar que el tiempo de finalizacion sea posterior al tiempo de inicio
    if (endMinutes <= startMinutes){
        return {
        valid: false,
        error: `El tiempo de fin ${slot.endTime} debe ser posterior al tiempo de inicio ${slot.startTime}`
      };
    }

    //verificar duplicados

    const key = `${slot.startTime}-${slot.endTime}`;

    if(seen.has(key)){
        return {
        valid: false,
        error: `Intervalo duplicado: ${slot.startTime}-${slot.endTime}`
      };
    }
    seen.add(key);

    // FIX: Verificar las superposiciones con lógica simplificada
    for (const existingSlot of slots) {
      if (startMinutes < existingSlot.endMinutes && endMinutes > existingSlot.startMinutes) {
        return {
          valid: false,
          error: `Superposición detectada: ${slot.startTime}-${slot.endTime} se superpone con ${existingSlot.startTime}-${existingSlot.endTime}`
        };
      }
    }

    slots.push({
        startTime: slot.startTime,
        endTime: slot.endTime,
        startMinutes,
        endMinutes
    });
  }

  // Devolver los slots validados (sin los campos adicionales utilizados para validación)
  return { 
    valid: true, 
    validatedSlots: slots.map(({startTime, endTime}) => ({startTime, endTime})) 
  };
};
