import Availabilitybarber from "../../server/db/models/barbersAvailability.js";
import { validateTimeSlots } from "../../utils/validators.js";

// Convertir formato "HH:MM" a minutos para facilitar comparaciones
const convertTimeToMinutes = (timeString) => {
  const [hours, minutes] = timeString.split(":").map(Number);
  return hours * 60 + minutes;
};

export const getBarberAvailability = async (req, res) => {
  try {
    const { barberId } = req.params;
    const getAvailability = await Availabilitybarber.find({ barberId });

    if (!getAvailability) {
      return res.status(400).json({
        success: false,
        message: "ID de barbero no válido",
      });
    } else if (getAvailability.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Por el momento no hay disponibilidad configurada semanal por este barbero.",
      });
    }

    res.status(200).json({
      success: true,
      data: getAvailability,
      message: "Disponibilidad recuperada con éxito",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al obtener la disponibilidad del barbero",
      error: error.message,
    });
  }
};

export const getBarberAvailabilityByDay = async (req, res) => {
  try {
    const { barberId, dayOfWeek } = req.params;

    const day = parseInt(dayOfWeek);
    if (isNaN(day) || day < 0 || day > 6) {
      return res.status(400).json({
        success: false,
        message: "Día de la semana no válido. Debe ser un número entre 0 (domingo) y 6 (sábado)",
      });
    }

    const availability = await Availabilitybarber.findOne({
      barberId,
      dayOfWeek: day,
    });

    if (!availability) {
      return res.status(404).json({
        success: false,
        message: "No se encontró disponibilidad para ese día",
      });
    }

    res.status(200).json({
      success: true,
      data: availability,
      message: "Información recuperada exitosamente.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al obtener la disponibilidad del barbero para el día específico",
      error: error.message,
    });
  }
};

export const createOrUpdateAvailability = async (req, res) => {
  try {
    const { barberId, dayOfWeek } = req.params;
    const { timeSlots, isWorkingDay } = req.body;

    if (!barberId) {
      return res.status(400).json({
        success: false,
        message: "ID de barbero no válido",
      });
    }

    const day = parseInt(dayOfWeek);
    if (isNaN(day) || day < 0 || day > 6) {
      return res.status(400).json({
        success: false,
        message: "Día de la semana no válido. Debe ser un número entre 0 (domingo) y 6 (sábado)",
      });
    }

    if (timeSlots && timeSlots.length > 0) {
      const validation = validateTimeSlots(timeSlots);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: validation.error,
        });
      }
    }

    let availability = await Availabilitybarber.findOne({
      barberId,
      dayOfWeek: day,
    });

    if (availability) {
      // Actualizar registro existente
      availability.timeSlots = timeSlots || [];
      availability.isWorkingDay = isWorkingDay !== undefined ? isWorkingDay : availability.isWorkingDay;

      await availability.save();

      return res.json({
        success: true,
        message: `Disponibilidad semanal (día ${day}) actualizada correctamente.`,
        data: availability,
      });
    } else {
      // Crear nuevo registro
      const newAvailability = new Availabilitybarber({
        barberId,
        dayOfWeek: day,
        timeSlots: timeSlots || [],
        isWorkingDay: isWorkingDay !== undefined ? isWorkingDay : true,
      });

      await newAvailability.save();
      
      return res.status(201).json({
        success: true,
        message: `Nueva disponibilidad creada para el barbero ${barberId} en el día ${day}`,
        data: newAvailability,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al guardar la disponibilidad semanal",
      error: error.message,
    });
  }
};

export const removeTimeSlot = async (req, res) => {
  try {
    const { barberId, dayOfWeek, slotId } = req.params;

    if (!barberId) {
      return res.status(400).json({
        success: false,
        message: "ID de barbero no válido",
      });
    }

    const day = parseInt(dayOfWeek);
    if (isNaN(day) || day < 0 || day > 6) {
      return res.status(400).json({
        success: false,
        message: "Día de la semana no válido. Debe ser un número entre 0 (domingo) y 6 (sábado)",
      });
    }

    let availability = await Availabilitybarber.findOne({
      barberId,
      dayOfWeek: day,
    });

    if (!availability) {
      return res.status(404).json({
        success: false,
        message: "No se encontró disponibilidad para ese día",
      });
    }

    // Filtrar el horario a eliminar por su ID (usando índice)
    const slotIndex = parseInt(slotId);
    if (isNaN(slotIndex) || slotIndex < 0 || slotIndex >= availability.timeSlots.length) {
      return res.status(400).json({
        success: false,
        message: "ID de horario no válido"
      });
    }

    availability.timeSlots.splice(slotIndex, 1);

    // Si no quedan slots, marcar como día no laborable
    if (availability.timeSlots.length === 0) {
      availability.isWorkingDay = false;
    }

    await availability.save();

    res.status(200).json({
      success: true,
      message: "Horario eliminado correctamente",
      data: availability,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al eliminar el horario",
      error: error.message,
    });
  }
};

export const toggleWorkingDay = async (req, res) => {
  try {
    const { barberId, dayOfWeek } = req.params;
    const { isWorkingDay } = req.body;

    if (!barberId) {
      return res.status(400).json({
        success: false,
        message: "ID de barbero no válido",
      });
    }

    const day = parseInt(dayOfWeek);
    if (isNaN(day) || day < 0 || day > 6) {
      return res.status(400).json({
        success: false,
        message: "Día de la semana no válido. Debe ser un número entre 0 (domingo) y 6 (sábado)",
      });
    }

    if (isWorkingDay === undefined) {
      return res.status(400).json({
        success: false,
        message: "El campo isWorkingDay es requerido"
      });
    }

    let availability = await Availabilitybarber.findOne({
      barberId,
      dayOfWeek: day,
    });

    if (availability) {
      // Actualizar registro existente
      availability.isWorkingDay = isWorkingDay;
      
      // Si se marca como no laborable, limpiar los slots
      if (!isWorkingDay) {
        availability.timeSlots = [];
      }
      
      await availability.save();
    } else {
      // Crear nuevo registro
      availability = await Availabilitybarber.create({
        barberId,
        dayOfWeek: day,
        timeSlots: [],
        isWorkingDay,
      });
    }

    res.status(200).json({
      success: true,
      message: `Día marcado como ${isWorkingDay ? "laborable" : "no laborable"}`,
      data: availability,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al actualizar el estado del día",
      error: error.message,
    });
  }
};

export const addTimeSlot = async (req, res) => {
  try {
    const { barberId, dayOfWeek } = req.params;
    const { startTime, endTime } = req.body;

    if (!barberId) {
      return res.status(400).json({
        success: false,
        message: "ID de barbero no válido",
      });
    }

    const day = parseInt(dayOfWeek);
    if (isNaN(day) || day < 0 || day > 6) {
      return res.status(400).json({
        success: false,
        message: "Día de la semana no válido. Debe ser un número entre 0 (domingo) y 6 (sábado)",
      });
    }

    if (!startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: "Las horas de inicio y fin son requeridas"
      });
    }

    if (!isValidTimeFormat(startTime) || !isValidTimeFormat(endTime)) {
      return res.status(400).json({
        success: false,
        message: 'Formato de hora incorrecto. Debe ser "HH:MM"'
      });
    }

    if (!isValidTimeRange(startTime, endTime)) {
      return res.status(400).json({
        success: false,
        message: "La hora de fin debe ser posterior a la hora de inicio",
      });
    }

    // Buscar o crear la disponibilidad
    let availability = await Availabilitybarber.findOne({
      barberId,
      dayOfWeek: day,
    });

    if (!availability) {
      availability = await Availabilitybarber.create({
        barberId,
        dayOfWeek: day,
        timeSlots: [],
        isWorkingDay: true,
      });
    }

    const newSlot = { startTime, endTime };
    
    // Verificar solapamiento con slots existentes
    const hasOverlap = availability.timeSlots.some(slot => {
      const slotStart = convertTimeToMinutes(slot.startTime);
      const slotEnd = convertTimeToMinutes(slot.endTime);
      const newStart = convertTimeToMinutes(newSlot.startTime);
      const newEnd = convertTimeToMinutes(newSlot.endTime);
      
      return (newStart < slotEnd && newEnd > slotStart);
    });

    if (hasOverlap) {
      return res.status(400).json({
        success: false,
        message: "El nuevo horario se solapa con horarios existentes",
      });
    }

    availability.timeSlots.push(newSlot);
    availability.isWorkingDay = true; // Marcar como día laborable al añadir slot

    // Ordenar los horarios por hora de inicio
    availability.timeSlots.sort((a, b) => {
      return convertTimeToMinutes(a.startTime) - convertTimeToMinutes(b.startTime);
    });

    await availability.save();

    res.status(200).json({
      success: true,
      message: "Horario añadido correctamente",
      data: availability,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al añadir el horario",
      error: error.message,
    });
  }
};

export const deleteAllAvailability = async (req, res) => {
  try {
    const { barberId } = req.params;

    if (!barberId) {
      return res.status(400).json({
        success: false,
        message: "ID de barbero no válido",
      });
    }

    const result = await Availabilitybarber.deleteMany({ barberId });

    res.status(200).json({
      success: true,
      message: `Configuración de disponibilidad eliminada para el barbero`,
      count: result.deletedCount,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al eliminar la configuración de disponibilidad",
      error: error.message,
    });
  }
};

// Funciones de validación
function isValidTimeFormat(timeString) {
  const regex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  return regex.test(timeString);
}

function isValidTimeRange(startTime, endTime) {
  const startMinutes = convertTimeToMinutes(startTime);
  const endMinutes = convertTimeToMinutes(endTime);
  return endMinutes > startMinutes;
}