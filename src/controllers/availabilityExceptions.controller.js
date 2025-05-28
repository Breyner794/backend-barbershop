import Availabilityexception from "../../server/db/models/availabilityExceptions.js";
import { validateTimeSlots } from "../../utils/validators.js"
import { validateAvailabilityConflicts } from "../../utils/availabilityConflictValidator.js";

export const getAvailabilityByBarberId = async (req, res) => {
  try {
    const { barberId } = req.params;
    const getAvailability = await Availabilityexception.find({ barberId });

    if (getAvailability.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "Por el momento no hay disponibilidad configurado por este barbero",
      });
    }

    res.status(200).json({
      success: true,
      data: getAvailability,
      message: "Disponibilidad recuperada con exito ✅",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message:
        "Error al traer la disponibilidad por cada barberos, error interno del servidor",
      error: err.message,
    });
  }
};

export const getAvailabilityByBarberIdAndDate = async (req, res) => {
  try {
    const { barberId, date } = req.params;

    const getAvailability = await Availabilityexception.findOne({
      barberId,
      date,
    });

    if (!getAvailability) {
      return res.status(404).json({
        success: false,
        message: `No se encontraron configuraciones de disponibilidad para el barbero ${barberId} en la fecha ${date}.`,
      });
    }

    res.status(200).json({
      success: true,
      data: getAvailability,
      message: `Disponibilidad para el barbero ${barberId} en la fecha ${date} recuperada con éxito ✅`,
    });
  } catch (err) {
    console.error("Error al traer la disponibilidad por barbero y fecha:", err);
    res.status(500).json({
      success: false,
      message:
        "Error al traer la disponibilidad por barbero y fecha (error interno del servidor).",
      error: err.message,
    });
  }
};

// export const createOrUpdateAvailability = async (req, res) => {
//   const { barberId, date, timeSlots } = req.body;
//   console.log("barberId:", barberId, "date:", date, "timeSlots:", timeSlots); // Agrega esto
//   try {
//     // Verificar si ya existe una excepción para este barbero y fecha
//     const existingException = await Availabilityexception.findOne({
//       barberId,
//       date,
//     });
//     // Validar duplicados en los timeSlots que se intentan guardar
//     const Seen = new Set();
//     if (timeSlots && Array.isArray(timeSlots)) {
//       for (const newSlot of timeSlots) {
//         const newStartTimeStr = newSlot.startTime;
//         const newEndTimeStr = newSlot.endTime;
//         const newKey = `${newStartTimeStr}-${newEndTimeStr}`;
//         console.log("newSlot:", newSlot); // Agrega esto

//         // Validación de duplicados (como ya tenías)
//         if (Seen.has(newKey)) {
//           return res.status(400).json({
//             message:
//               "Los timeSlots no pueden contener intervalos duplicados en la excepción.",
//           });
//         }

//         const [newStartHour, newStartMinute] = newStartTimeStr
//           .split(":")
//           .map(Number);
//         const newStartTimeInMinutes = newStartHour * 60 + newStartMinute;
//         // Validación de solapamiento con startTime
//         for (const seenKey of Seen) {
//           const [seenStartStr, seenEndStr] = seenKey.split("-");
//           const [seenStartHour, seenStartMinute] = seenStartStr
//             .split(":")
//             .map(Number);
//           const startTimeInMinutes = seenStartHour * 60 + seenStartMinute;
//           const [seenEndHour, seenEndMinute] = seenEndStr
//             .split(":")
//             .map(Number);
//           const endTimeInMinutes = seenEndHour * 60 + seenEndMinute;

//           // Verificar si el nuevo startTime cae dentro de un intervalo existente
//           if (
//             newStartTimeInMinutes >= startTimeInMinutes &&
//             newStartTimeInMinutes < endTimeInMinutes
//           ) {
//             return res.status(400).json({
//               message: `El startTime ${newStartTimeStr} se solapa con un intervalo existente (${seenStartStr}-${seenEndStr}).`,
//             });
//           }
//         }
//         Seen.add(newKey);
//       }
//     }

//     if (existingException) {
//       existingException.timeSlots = timeSlots || [];
//       existingException.isWorkingDay =
//         req.body.isWorkingDay !== undefined
//           ? req.body.isWorkingDay
//           : existingException.isWorkingDay;
//       existingException.reason = req.body.reason || existingException.reason;
//       await existingException.save();
//       return res.json({
//         message: "Excepción de disponibilidad actualizada correctamente.",
//       });
//     } else {
//       const newException = new Availabilityexception({
//         barberId,
//         date,
//         timeSlots: timeSlots || [],
//         isWorkingDay: req.body.isWorkingDay,
//         reason: req.body.reason,
//       });
//       await newException.save();
//       return res.status(201).json({
//         message: "Excepción de disponibilidad creada correctamente.",
//       });
//     }
//   } catch (err) {
//     if (err.name === "ValidationError") {
//       // Errores de validación de Mongoose
//       const errors = Object.values(err.errors).map((el) => el.message);
//       return res.status(400).json({
//         success: false,
//         message:
//           "Error de validación de datos. Por favor, revisa los siguientes campos: ⚠️",
//         errors: errors,
//       });
//     } else {
//       // Otros errores inesperados
//       console.error("Error al crear la disponibilidad:", err);
//       return res.status(500).json({
//         // Código 500 Internal Server Error
//         success: false,
//         message: "Ocurrió un error inesperado en el servidor. ❌",
//         error: err.message,
//       });
//     }
//   }
// };

export const createOrUpdateAvailability = async (req, res) => {

  const {barberId, date, timeSlots} = req.body;

  try{

    if (timeSlots && timeSlots.length > 0) { // se agrega el && timeSlots.length > 0
      const validation = validateTimeSlots(timeSlots);
      if(!validation.valid){
        return res.status(400).json({
          success: false,
          message: validation.error
        });
      }
      // const validatedTimeSlots = validation.validatedSlots;
    }

    if (date && !isValidDateFormat(date)) {
      return res.status(400).json({
        success: false,
        message: "El formato de fecha debe ser YYYY-MM-DD",  //FUNCIONA LA VALIDACION
      });
    }

    const conflictValidation = await validateAvailabilityConflicts('EXCEPTION',{
      barberId,
      date,
      timeSlots,
      isWorkingDay: req.body.isWorkingDay
    });

    if (!conflictValidation.valid){
      return res.status(409).json({
        success: false,
        message: conflictValidation.error,
        conflicts: conflictValidation.conflicts || []
      });
    }

    const existingException = await Availabilityexception.findOne({
      barberId,
      date,
    });

    if (existingException){
      existingException.timeSlots = timeSlots || [];
      existingException.isWorkingDay =
      req.body.isWorkingDay !== undefined
      ? req.body.isWorkingDay : existingException.isWorkingDay;
      existingException.reason = req.body.reason || existingException.reason;

      await existingException.save();
      
      return res.json({
        success: true,
        message: "Excepción de disponibilidad actualizada correctamente.",
        data: existingException
      });
    }else {
      const newException = new Availabilityexception({
        barberId, 
        date,
        timeSlots: timeSlots || [],
        isWorkingDay: req.body.isWorkingDay,
        reason: req.body.reason,
      });

      await newException.save();
      return res.status(201).json({
        success: true,
        message: "Excepción de disponibilidad creada correctamente.",
        data: newException
      }); 
    }
  }catch (err) {
    if (err.name === "ValidationError") {
      // Errores de validación de Mongoose
      const errors = Object.values(err.errors).map((el) => el.message);
      return res.status(400).json({
        success: false,
        message:
          "Error de validación de datos. Por favor, revisa los siguientes campos: ⚠️",
        errors: errors,
      });
    } else {
      // Otros errores inesperados
      console.error("Error al crear la disponibilidad:", err);
      return res.status(500).json({
        success: false,
        message: "Ocurrió un error inesperado en el servidor. ❌",
        error: err.message,
      });
    }
  }
};

// export const removeTimeSlotException = async (req, res) => {
//   const { barberId, date, startTime, endTime } = req.body;
//   try {
//     const existingException = await Availabilityexception.findOne({
//       barberId,
//       date,
//     });

//     if (!existingException) {
//       return res.status(404).json({
//         message:
//           "No se encontró la excepción de disponibilidad para la fecha especificada.",
//       });
//     }

//     const initialTimeSlotCount = existingException.timeSlots.length;

//     existingException.timeSlots = existingException.timeSlots.filter(
//       (slot) => !(slot.startTime === startTime && slot.endTime === endTime)
//     );

//     if (existingException.timeSlots.length === initialTimeSlotCount) {
//       return res.status(404).json({
//         message: "No se encontró el TimeSlot especificado para eliminar.",
//       });
//     }

//     if (existingException.timeSlots.length === 0) {
//       await Availabilityexception.deleteOne({ _id: existingException._id });
//       return res.json({
//         message:
//           "Último TimeSlot eliminado. La excepción para esta fecha ha sido removida.",
//       });
//     }

//     // existingException.timeSlots = existingException.timeSlots.filter(
//     //   (slot) => !(slot.startTime === startTime && slot.endTime === endTime)
//     // );

//     await existingException.save();

//     res.json({
//       message: "TimeSlot eliminado correctamente de la excepción.",
//     });
//   } catch (err) {
//     console.error("Error al eliminar el TimeSlot de la excepción:", err);
//     res
//       .status(500)
//       .json({ message: "Error al eliminar el TimeSlot de la excepción." });
//   }
// };

export const removeTimeSlotException = async (req, res) => {

  const {barberId, date, startTime, endTime} = req.body;

  try{

    if(!barberId || !date){
      return res.status(400).json({
        success: false,
        message: "Se requiere barberId y date"
      });
    }

    if(!startTime || !endTime){
      return res.status(400).json({
        success: false,
        message: "Se requiere startTime y endTime para eliminar el intervalo"
      });
    }

    const existingException = await Availabilityexception.findOne({
      barberId,
      date,
    });

    if (!existingException){
      return res.status(404).json({
        success: false,
        message:
          "No se encontró la excepción de disponibilidad para la fecha especificada.",
      });
    };

    const initialTimeSlotCount = existingException.timeSlots.length;

    existingException.timeSlots = existingException.timeSlots.filter(
      (slot) => !(slot.startTime === startTime && slot.endTime === endTime)
    );

    if (existingException.timeSlots.length === initialTimeSlotCount) {
      return res.status(404).json({
        success: false,
        message: "No se encontró el TimeSlot especificado para eliminar.",
      });
    }

    if(existingException.timeSlots.length === 0){
      await Availabilityexception.deleteOne({_id:existingException._id});
      return res.json({
        success: true,
        message:
          "Último TimeSlot eliminado. La excepción para esta fecha ha sido removida.",
      });
    }

     await existingException.save();

     res.json({
      success: true,
      message: "TimeSlot eliminado correctamente de la excepción.",
      data: existingException
    });

  }catch (err) {
    console.error("Error al eliminar el TimeSlot de la excepción:", err);
    res.status(500).json({ 
      success: false,
      message: "Error al eliminar el TimeSlot de la excepción.",
      error: err.message 
    });
  }
};

/* Valida que una cadena tenga el formato de fecha YYYY-MM-DD Prueba */
function isValidDateFormat(dateString) {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;
  
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}