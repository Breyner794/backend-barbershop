import Appointment from "../../server/db/models/appoiment.js";
//import Availabilitybarber from "../../server/db/models/barbersAvailability.js";
//import Availabilityexception from "../../server/db/models/availabilityExceptions.js";
import Service from "../../server/db/models/Service.js";
import { nanoid } from "nanoid";
import mongoose from "mongoose";
import { getEffectiveAvailability } from "../../utils/availabilityConflictValidator.js";

const timeToMinutes = (time) => {
  if (!time || !time.includes(":")) return 0;
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

const getDayOfWeek = (dateString) => {
  const date = new Date(dateString + "T00:00:00"); //se agrega + 'T00:00:00' para no tener errores de horario...
  return date.getDay();
};

// export const getAvailableSlotsForBooking = async (req, res) => {
//   const { barberId, date} = req.query;

//   try {
//     //Validacion de entradas
//     if (!barberId || !date /*|| !serviceId*/) {
//       return res.status(400).json({
//         success: false,
//         message: "Los parametros BarberId, y Date , son requeridos.",
//       });
//     }

//     //Determinar la disponibilidad base de barbero
//     let workingTimeSlots = [];
//     let barberIsWorking = false;
//     let usingException = false;

//     // 1. Verificar si hay excepción de disponibilidad  
//     const exceptionAvailability = await Availabilityexception.findOne({
//       barberId,
//       date,
//     });

//     // 2. Solo usar la excepción si está configurada para trabajar
//     if (
//       exceptionAvailability &&
//       exceptionAvailability.isWorkingDay &&
//       exceptionAvailability.timeSlots.length > 0
//     ) {
//       console.log(
//         "🔄 Usando excepción de disponibilidad:",
//         exceptionAvailability
//       );
//       workingTimeSlots = exceptionAvailability.timeSlots;
//       barberIsWorking = true;
//       usingException = true;
//     }

//     // 3. Si no hay excepción válida para trabajar, usar disponibilidad semanal
//     if (!usingException) {
//       const dayOfWeek = getDayOfWeek(date);
//       console.log(`📅 Día de la semana: ${dayOfWeek} para fecha ${date}`);

//       const weeklyAvailability = await Availabilitybarber.findOne({
//         barberId,
//         dayOfWeek,
//       });

//       if (
//         weeklyAvailability &&
//         weeklyAvailability.isWorkingDay &&
//         weeklyAvailability.timeSlots.length > 0
//       ) {
//         console.log("📋 Usando disponibilidad semanal:", weeklyAvailability);
//         workingTimeSlots = weeklyAvailability.timeSlots;
//         barberIsWorking = true;
//       } else {
//         barberIsWorking = false;
//       }
//     }

//     /*Consultar Citas Existentes Para la consulta de citas, es importante que el campo 'date' en la BD
//          y el 'date' de la query se manejen consistentemente (ej. ambos como Date a medianoche UTC o similar)*/

//     const appointmentsOnDate = await Appointment.find({
//       barberId,
//       date: new Date(date + "T00:00:00"),
//       status: { $nin: ["cancelada", "no-asistió"] }, // Excluir citas que no bloquean tiempo
//     });

//     //filtrar slots ocupados
//     const availabilitySlots = workingTimeSlots.filter((slot) => {
//       const slotStartMinutes = timeToMinutes(slot.startTime);
//       const slotEndMinutes = timeToMinutes(slot.endTime);

//       const isOccupied = appointmentsOnDate.some((appointment) => {
//         const appointmentStartMinutes = timeToMinutes(appointment.startTime);
//         const appointmentEndMinutes = timeToMinutes(appointment.endTime);
//         // Lógica de solapamiento: Un slot está ocupado si (InicioCita < FinSlot) Y (FinCita > InicioSlot)
//         return (
//           appointmentStartMinutes < slotEndMinutes &&
//           appointmentEndMinutes > slotStartMinutes
//         );
//       });

//       return !isOccupied; // Mantener el slot solo si NO está ocupado
//     });

//     if (availabilitySlots.length === 0) {
//       return res.status(200).json({
//         success: true,
//         data: [],
//         message:
//           "No hay horarios disponibles para esta fecha, todos estan ocupados o no hay configuracion",
//       });
//     }

//     return res.status(200).json({
//       success: true,
//       message: "Horarios disponibles recuperados con exito ✅",
//       data: availabilitySlots, // Podria devolver solo .map(slot => slot.startTime) prueba opcional...
//     });
//   } catch (error) {
//     console.error("Error en getAvailableSlotsForBooking:", error);
//     res.status(500).json({
//       success: false,
//       message:
//         "Error interno del servidor al obtener los horarios disponibles.",
//       error: error.message,
//     });
//   }
// };

export const getAvailableSlotsForBooking = async (req, res) => {
  const { barberId, date } = req.query;

  try {
    if (!barberId || !date) {
      return res.status(400).json({
        success: false,
        message: "Los parametros BarberId, Date y servicesId, son requeridos.",
      });
    }
    
    const effectiveAvailability = await getEffectiveAvailability(
      barberId,
      date
    );

    // 3. Verificamos si, según la fuente de verdad, el barbero trabaja.
    if (
      !effectiveAvailability.isWorkingDay ||
      effectiveAvailability.timeSlots === 0
    ) {
      return res.status(200).json({
        success: true,
        data: [],
        message: "El barbero no tiene horarios disponibles para esta fecha.",
        source: effectiveAvailability.source, // Dato útil para debug
      });
    }

    // 4. Si trabaja, usamos SUS horarios para el resto del proceso.
    const workingTimeSlots = effectiveAvailability.timeSlots;

    // 5. El resto de tu código para consultar citas y filtrar es casi idéntico.
    const appointmentsOnDate = await Appointment.find({
      barberId,
      date: new Date(date + "T00:00:00"),
      status: { $nin: ["cancelada", "no-asistió"] },
    });

    const availabilitySlots = workingTimeSlots.filter((slot) => {
      const slotStartMinutes = timeToMinutes(slot.startTime);
      const slotEndMinutes = timeToMinutes(slot.endTime);

      const isOccupied = appointmentsOnDate.some((appointment) => {
        const appointmentStartMinutes = timeToMinutes(appointment.startTime);
        const appointmentEndMinutes = timeToMinutes(appointment.endTime);
        return (
          appointmentStartMinutes < slotEndMinutes &&
          appointmentEndMinutes > slotStartMinutes
        );
      });
      return !isOccupied;
    });

    if (availabilitySlots.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        message:
          "No hay horarios disponibles para esta fecha, todos están ocupados.",
      });
    }

     return res.status(200).json({
            success: true,
            message: "Horarios disponibles recuperados con éxito ✅",
            data: availabilitySlots,
        });
  } catch (err) {
    console.error("Error en getAvailableSlotsForBooking:", err);
    res.status(500).json({
            success: false,
            message: "Error interno del servidor al obtener los horarios disponibles.",
            error: err.message,
        });
  }
};

export const createAppointment = async (req, res) => {
  const {
    barberId,
    serviceId,
    siteId,
    date: dateString,
    startTime,
    endTime,
    clientName,
    clientPhone,
    clientEmail,
    notes,
  } = req.body;

  try {
    if (
      !barberId ||
      !serviceId ||
      !siteId ||
      !dateString ||
      !startTime ||
      !endTime ||
      !clientName ||
      !clientPhone
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Faltan campos obligatorios (incluyendo endTime) para crear la reserva.",
      });
    }

    // (formato para dateString, startTime, email y phone validar si es necesario las validaciones de los campos.)
    if (timeToMinutes(startTime) >= timeToMinutes(endTime)) {
      return res.status(400).json({
        success: false,
        message: "La hora de fin debe ser posterior a la hora de inicio.",
      });
    }

    const service = await Service.findById(serviceId);
    if (!service) {
      return res
        .status(404)
        .json({ success: false, message: "Servicio no encontrado." });
    }

    /*PROBABILIDAD DE CREAR UN FUNCION QUE VERIFIQUE LAS FECHAS DISPONIBLES...
        LA IDE ES QUE EN EL FRONTEND LAS MUESTRE PERO QUEDA PRENDIENTE...*/

    /*Validar esta funcuino de appointmentDateObject*/
    const appointmentDateObject = new Date(dateString + "T00:00:00");

    const conflictingAppointment = await Appointment.findOne({
      barberId,
      date: appointmentDateObject,
      status: { $nin: ["cancelada", "no-asistio"] },
      $or: [
        // Lógica de solapamiento: NuevaCita.start < Existente.end && NuevaCita.end > Existente.start
        { startTime: { $lt: endTime }, endTime: { $gt: startTime } }, //solapamiento parcial o total
        { startTime: { $lt: endTime, $gte: startTime } }, // Cita existente comienza dentro o al mismo tiempo
        { endTime: { $gt: startTime, $lte: endTime } }, // Cita existente termina dentro o al mismo tiempo
      ],
    });
    // La lógica de solapamiento original `(A.start < B.end) && (A.end > B.start)` es generalmente buena.
    // El `startTime: { $lt: endTime }` se refiere al `startTime` de una cita existente comparado con el `endTime` de la nueva.
    // El `endTime: { $gt: startTime }` se refiere al `endTime` de una cita existente comparado con el `startTime` de la nueva.

    if (conflictingAppointment) {
      return res.status(409).json({
        // 409 Conflict
        success: false,
        message:
          "Lo sentimos, este horario acaba de ser reservado. Por favor, elige otro.",
      });
    }

    const newAppointment = new Appointment({
      barberId,
      serviceId,
      siteId,
      date: appointmentDateObject,
      startTime,
      endTime,
      clientName,
      clientPhone,
      clientEmail,
      notes,
      status: "pendiente",
    });

    newAppointment.confirmationCode = nanoid(8); //hacer pruebas de pasar este codigo a mayus con .upperCase

    await newAppointment.save();

    return res.status(201).json({
      success: true,
      message: "Reserva creada con éxito. ✅",
      data: newAppointment,
    });
  } catch (error) {
    console.error("Error en createAppointment:", error);
    if (error.name === "ValidationError") {
      // Errores de validación de Mongoose (definidos en tu Schema)
      const messages = Object.values(error.errors).map((err) => err.message);
      return res
        .status(400)
        .json({
          success: false,
          message: "Error de validación.",
          errors: messages,
        });
    }
    res.status(500).json({
      success: false,
      message: "Error interno del servidor al crear la reserva.",
      error: error.message,
    });
  }
};

export const getAppointmentById = async (req, res) => {
  //marca error en nombre "Could not find name 'getAppointmentById'. Did you mean 'getAppointmentsByClient'?"
  const { appointmentId } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
      return res.status(400).json({
        success: false,
        message: "El ID de la reserva proporcionado no es válido.",
      });
    }

    const appointment = await Appointment.findById(appointmentId);
    /*Opcional pero toca validar si las necesiot, para traer por nombre de barbero o servicio y etc*/

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Reserva no encontrada.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Reserva recuperada con éxito. ✅",
      data: appointment,
    });
  } catch (error) {
    console.error("Error en getAppointmentById:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor al obtener la reserva.",
      error: error.message,
    });
  }
};

export const getAppointmentsByBarber = async (req, res) => {
  const { barberId } = req.params;
  const { date, startDate, endDate, status, sort } = req.query;

  try {
    if (!mongoose.Types.ObjectId.isValid(barberId)) {
      return res.status(400).json({
        success: false,
        message: "El ID del barbero proporcionado no es válido.",
      });
    }

    const query = { barberId };
    // (Recordatorio: manejo de zona horaria pendiente para mayor precisión zona horaria por default brasil saó paulo)
    if (date) {
      const targetDate = new Date(date + "T00:00:00");
      const nextDay = new Date(targetDate);
      nextDay.setDate(targetDate.getDate() + 1);
      query.date = {
        // Para que coincida con la fecha exacta guardada (medianoche)
        $gte: targetDate,
        $lt: nextDay,
      };
      // Si guardas 'date' como el inicio del día exacto (ej. medianoche UTC del día en Colombia)
      // podrías simplificar a: query.date = new Date(date + "T00:00:00Z") (o con librería de TZ)
      // La forma actual (query.date = targetDate) funciona si el campo 'date' en Appointment
      // es la medianoche de la zona horaria del servidor.
    } else {
      if (startDate) {
        query.date = { ...query.date, $gte: new Date(startDate + "T00:00:00") };
      }
      if (endDate) {
        const endOfDay = new Date(endDate + "T00:00:00");
        endOfDay.setDate(endOfDay.getDate() + 1);
        query.date = { ...query.date, $lt: endOfDay };
      }
    }
    if (status) {
      query.status = status;
    }

    let sortOption = { date: 1, startTime: 1 }; // Por defecto: más antiguas primero, luego por hora de inicio
    if (sort === "dateDesc") {
      sortOption = { date: -1, startTime: -1 };
    }

    // 4. Buscar las reservas en la base de datos
    const appointments = await Appointment.findOne(query)
      .populate("serviceId", "duration")
      .populate("siteId", "name_site")
      .sort(sortOption);

    if (appointments.length === 0 && date) {
      // Si se buscó por fecha y no hay nada
      return res.status(200).json({
        // Aún es un éxito, solo que no hay datos
        success: true,
        message: `No se encontraron reservas para el barbero en la fecha ${date}.`,
        data: [],
      });
    }

    res.status(200).json({
      success: true,
      message: "Reservas del barbero recuperadas con éxito. ✅",
      count: appointments.length,
      data: appointments,
    });
  } catch (error) {
    console.error("Error en getAppointmentsByBarber:", error);
    res.status(500).json({
      success: false,
      message:
        "Error interno del servidor al obtener las reservas del barbero.",
      error: error.message,
    });
  }
};

export const getAppointmentByConfirmationDetails = async (req, res) => {
  const { confirmationCode, clientIdentifier, identifierType } = req.body;

  try {
    if (!confirmationCode || !clientIdentifier || !identifierType) {
      return res.status(400).json({
        success: false,
        message:
          "Código de confirmación, identificador y tipo de identificador son requeridos.",
      });
    }

    if (identifierType !== "email" && identifierType !== "phone") {
      return res.status(400).json({
        success: false,
        message: "Tipo de identificador debe ser 'email' o 'phone'.",
      });
    }

    const query = { confirmationCode: confirmationCode };

    if (identifierType === "phone") {
      query.clientPhone = clientIdentifier.toLowerCase();
    } else {
      query.clientEmail = clientIdentifier;
    }

    const appointment = await Appointment.findOne(query)
      .populate("barberId", {name: 1, last_name: 1})
      .populate("serviceId", "duration")
      .populate("siteId", "address_site");

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message:
          "No se encontró ninguna cita con los detalles proporcionados. Verifica el código y tu email/teléfono.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Reserva recuperada con éxito. ✅",
      data: appointment,
    });
  } catch (error) {
    console.error("Error en getAppointmentByConfirmationDetails:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor al buscar la reserva.",
      error: error.message,
    });
  }
};

export const updateAppointmentStatus = async (req, res) => {
  const { appointmentId } = req.params;
  const { status, notes } = req.body; // 'notes' podría ser para una razón de cancelación o comentario al completar

  try {
    // 1. Validar que el appointmentId sea un ObjectId válido
    if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
      return res.status(400).json({
        success: false,
        message: "El ID de la reserva proporcionado no es válido.",
      });
    }

    // 2. Validar el nuevo estado
    const allowedStatuses = [
      "pendiente",
      "confirmada",
      "completada",
      "cancelada",
      "no-asistió",
    ];
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Estado no válido. Los estados permitidos son: ${allowedStatuses.join(
          ", "
        )}.`,
      });
    }

    // 3. Buscar la reserva
    const appointment = await Appointment.findById(appointmentId);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Reserva no encontrada.",
      });
    }

    // 4. (Opcional) Lógica de Transición de Estados verificar hasta donde puedo manejarlo...
    // Por ejemplo, no permitir cambiar el estado de una cita ya 'cancelada' o 'completada' a 'pendiente'.
    if (
      (appointment.status === "completada" ||
        appointment.status === "cancelada") &&
      status === "pendiente"
    ) {
      return res.status(400).json({
        success: false,
        message: `No se puede cambiar una cita ${appointment.status} a pendiente.`,
      });
    }

    // 5. Actualizar los campos
    appointment.status = status;
    if (notes !== undefined) {
      // Solo actualizar notas si se proporcionan
      appointment.notes = notes;
    }
    // Podrías querer actualizar un campo como `updatedAt: new Date()` si lo tienes en tu schema.

    await appointment.save();

    // 6. Devolver la reserva actualizada
    res.status(200).json({
      success: true,
      message: `Estado de la reserva actualizado a '${status}'. ✅`,
      data: appointment,
    });
  } catch (error) {
    console.error("Error en updateAppointmentStatus:", error);
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res
        .status(400)
        .json({
          success: false,
          message: "Error de validación.",
          errors: messages,
        });
    }
    res.status(500).json({
      success: false,
      message:
        "Error interno del servidor al actualizar el estado de la reserva.",
      error: error.message,
    });
  }
};

export const updateAppointmentDetails = async (req, res) => {
  // Renombrado para ser más específico
  const { appointmentId } = req.params;
  const updates = req.body;

  // Funciones de validación
  const isValidEmailFormat = (email) => {
    if (!email) return true; // Email vacío o undefined es válido (campo opcional)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const isValidPhoneFormat = (phone) => {
    if (!phone) return true; // Teléfono vacío o undefined es válido (campo opcional)
    const phoneRegex = /^\+?[0-9]{8,15}$/;
    return phoneRegex.test(phone);
  };

  const validateUpdates = (updates) => {
    const errors = [];

    // Validar email si se proporciona
    if (
      updates.clientEmail !== undefined &&
      !isValidEmailFormat(updates.clientEmail)
    ) {
      errors.push("El formato del correo electrónico no es válido");
    }

    // Validar teléfono si se proporciona
    if (
      updates.clientPhone !== undefined &&
      !isValidPhoneFormat(updates.clientPhone)
    ) {
      errors.push(
        "El formato del número de teléfono no es válido (debe tener entre 8-15 dígitos)"
      );
    }

    // Validar nombre si se proporciona (opcional: verificar longitud mínima)
    if (
      updates.clientName !== undefined &&
      updates.clientName.trim().length < 4
    ) {
      errors.push("El nombre del cliente debe tener al menos 4 caracteres");
    }

    // Validar notas si se proporciona (opcional: verificar longitud máxima)
    if (updates.notes !== undefined && updates.notes.length > 500) {
      errors.push("Las notas no pueden exceder 500 caracteres");
    }

    return errors;
  };

  try {
    // 1. Validar que el appointmentId sea un ObjectId válido
    if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
      return res.status(400).json({
        success: false,
        message: "El ID de la reserva proporcionado no es válido.",
      });
    }

    // 2. Buscar la reserva
    const appointment = await Appointment.findById(appointmentId);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Reserva no encontrada.",
      });
    }

    const validationErrors = validateUpdates(updates);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Errores de validación encontrados",
        errors: validationErrors,
      });
    }

    // 3. Definir los campos no críticos que se pueden actualizar
    const allowedFields = ["clientName", "clientPhone", "clientEmail", "notes"];
    let hasUpdates = false;

    // Aplicar las actualizaciones solo para los campos permitidos
    allowedFields.forEach((field) => {
      if (updates[field] !== undefined) {
        // Limpiar strings si es necesario
        if (typeof updates[field] === "string") {
          appointment[field] = updates[field].trim();
        } else {
          appointment[field] = updates[field];
        }
        hasUpdates = true;
      }
    });

    if (!hasUpdates) {
      return res.status(400).json({
        success: false,
        message: "No se proporcionaron campos válidos para actualizar.",
      });
    }

    // (Opcional: Actualizar campo updatedAt si lo tienes en tu schema)
    // appointment.updatedAt = new Date();

    // 4. Guardar los cambios
    await appointment.save();

    // 5. Devolver la reserva actualizada
    res.status(200).json({
      success: true,
      message: "Detalles de la reserva actualizados con éxito. ✅",
      data: appointment,
    });
  } catch (error) {
    console.error("Error en updateAppointmentDetails:", error);
    if (error.name === "ValidationError") {
      // Errores de validación de Mongoose
      const messages = Object.values(error.errors).map((err) => err.message);
      return res
        .status(400)
        .json({
          success: false,
          message: "Error de validación.",
          errors: messages,
        });
    }
    // Si lanzaste errores personalizados para formatos de email/teléfono, los capturarías aquí también
    res.status(500).json({
      success: false,
      message:
        "Error interno del servidor al actualizar los detalles de la reserva.",
      error: error.message,
    });
  }
};
