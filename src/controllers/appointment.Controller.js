import Appointment from "../../server/db/models/appoiment.js";
//import Availabilitybarber from "../../server/db/models/barbersAvailability.js";
//import Availabilityexception from "../../server/db/models/availabilityExceptions.js";
import Service from "../../server/db/models/Service.js";
import Site from "../../server/db/models/site.js";
import User from "../../server/db/models/user.js";
import { nanoid } from "nanoid";
import mongoose from "mongoose";
import { getEffectiveAvailability } from "../../utils/availabilityConflictValidator.js";
import { format } from "date-fns";

export const timeToMinutes = (time) => {
  if (!time || !time.includes(":")) return 0;
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

// const getDayOfWeek = (dateString) => {
//   const date = new Date(dateString + "T00:00:00"); //se agrega + 'T00:00:00' para no tener errores de horario...
//   return date.getDay();
// };

export const createColombianDate = (dateString) => {
  // Crear fecha en Colombia (UTC-5)
  const colombiaOffset = -5 * 60; // Colombia es UTC-5 (en minutos)
  const date = new Date(dateString + "T00:00:00");
  
  // Ajustar por la diferencia de zona horaria
  const utcDate = new Date(date.getTime() - (colombiaOffset * 60 * 1000));
  return utcDate;
};

export const getDateRangeInColombia = (dateString) => {
  // Inicio del día en Colombia
  const startOfDay = createColombianDate(dateString);
  
  // Final del día en Colombia (23:59:59.999)
  const endOfDay = new Date(startOfDay);
  endOfDay.setUTCHours(23, 59, 59, 999);
  
  return { startOfDay, endOfDay };
};

export const getAllAppointments = async (req, res) => {
    try {
        // Usamos .populate() para traer la información completa de los campos referenciados
        const appointments = await Appointment.find()
            .populate('barberId', 'name last_name') // Trae el 'name' del barbero
            .populate('serviceId', 'name price') // Trae 'name' y 'price' del servicio
            .populate('siteId', 'name_site'); // Trae el 'name' de la sede

        // El chequeo de si no hay citas sigue siendo válido
        if (appointments.length === 0) {
            return res.status(200).json({
                success: true,
                count: 0,
                data: [], // Envía un array vacío, el frontend lo manejará
                message: "No hay reservas creadas en este momento."
            });
        }

        res.status(200).json({
            success: true,
            count: appointments.length,
            data: appointments,
            message: "Reservas recuperadas exitosamente ✅"
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error al obtener las reservas",
            error: error.message,
        });
    }
}

export const getAvailableSlotsForBooking = async (req, res) => {
  const { barberId, date } = req.query;

  try {
    if (!barberId || !date) {
      return res.status(400).json({
        success: false,
        message: "Los parametros BarberId, Date y servicesId, son requeridos.",
      });
    }
    
    // Crear rango de fechas en zona horaria de Colombia
    const { startOfDay, endOfDay } = getDateRangeInColombia(date);
    
    console.log(`🕐 Consultando citas para ${date}:`);
    console.log(`📅 Inicio del día (UTC): ${startOfDay.toISOString()}`);
    console.log(`📅 Final del día (UTC): ${endOfDay.toISOString()}`);
    
    const effectiveAvailability = await getEffectiveAvailability(
      barberId,
      date
    );

    // Verificamos si el barbero trabaja
    if (
      !effectiveAvailability.isWorkingDay ||
      effectiveAvailability.timeSlots === 0
    ) {
      return res.status(200).json({
        success: true,
        data: [],
        message: "El barbero no tiene horarios disponibles para esta fecha.",
        source: effectiveAvailability.source,
      });
    }

    const workingTimeSlots = effectiveAvailability.timeSlots;

    // Consultar citas usando rango de fechas corregido por zona horaria
    const appointmentsOnDate = await Appointment.find({
      barberId,
      date: {
        $gte: startOfDay,
        $lt: endOfDay
      },
      status: { $nin: ["cancelada", "no-asistio"] },
    });

    console.log(`📋 Citas encontradas: ${appointmentsOnDate.length}`);
    if (appointmentsOnDate.length > 0) {
      appointmentsOnDate.forEach(apt => {
        console.log(`   - ${apt.startTime}-${apt.endTime} (${apt.date.toISOString()})`);
      });
    }

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
        message: "No hay horarios disponibles para esta fecha, todos están ocupados.",
      });
    }

    console.log(`✅ Slots disponibles: ${availabilitySlots.length}`);

    return res.status(200).json({
      success: true,
      message: "Horarios disponibles recuperados con éxito ✅",
      data: availabilitySlots,
    });
  } catch (err) {
    console.error("❌ Error en getAvailableSlotsForBooking:", err);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor al obtener los horarios disponibles.",
      error: err.message,
    });
  }
};

// export const getAvailableSlotsForBooking = async (req, res) => {
//   const { barberId, date } = req.query;

//   try {
//     if (!barberId || !date) {
//       return res.status(400).json({
//         success: false,
//         message: "Los parametros BarberId, Date y servicesId, son requeridos.",
//       });
//     }
    
//     const effectiveAvailability = await getEffectiveAvailability(
//       barberId,
//       date
//     );

//     // 3. Verificamos si, según la fuente de verdad, el barbero trabaja.
//     if (
//       !effectiveAvailability.isWorkingDay ||
//       effectiveAvailability.timeSlots === 0
//     ) {
//       return res.status(200).json({
//         success: true,
//         data: [],
//         message: "El barbero no tiene horarios disponibles para esta fecha.",
//         source: effectiveAvailability.source, // Dato útil para debug
//       });
//     }

//     // 4. Si trabaja, usamos SUS horarios para el resto del proceso.
//     const workingTimeSlots = effectiveAvailability.timeSlots;

//     // 5. El resto de tu código para consultar citas y filtrar es casi idéntico.
//     const appointmentsOnDate = await Appointment.find({
//       barberId,
//       date: new Date(date + "T00:00:00"),
//       status: { $nin: ["cancelada", "no-asistio"] },
//     });

//     const availabilitySlots = workingTimeSlots.filter((slot) => {
//       const slotStartMinutes = timeToMinutes(slot.startTime);
//       const slotEndMinutes = timeToMinutes(slot.endTime);

//       const isOccupied = appointmentsOnDate.some((appointment) => {
//         const appointmentStartMinutes = timeToMinutes(appointment.startTime);
//         const appointmentEndMinutes = timeToMinutes(appointment.endTime);
//         return (
//           appointmentStartMinutes < slotEndMinutes &&
//           appointmentEndMinutes > slotStartMinutes
//         );
//       });
//       return !isOccupied;
//     });

//     if (availabilitySlots.length === 0) {
//       return res.status(200).json({
//         success: true,
//         data: [],
//         message:
//           "No hay horarios disponibles para esta fecha, todos están ocupados.",
//       });
//     }

//      return res.status(200).json({
//             success: true,
//             message: "Horarios disponibles recuperados con éxito ✅",
//             data: availabilitySlots,
//         });
//   } catch (err) {
//     console.error("Error en getAvailableSlotsForBooking:", err);
//     res.status(500).json({
//             success: false,
//             message: "Error interno del servidor al obtener los horarios disponibles.",
//             error: err.message,
//         });
//   }
// };

export const creacteCompletedService = async (req, res) => {
  const {
    barberId,
    serviceId,
    siteId,
    clientName,
    clientPhone,
    startTime,
    notes
  } = req.body;

  try{
    if (!barberId || !serviceId || !siteId || !clientName || !startTime){
      return res.status(400).json({ success: false, message: "Faltan campos obligatorios para registrar el servicio." });
    }

    const phoneToSave = clientPhone && clientPhone.trim() !== '' ? clientPhone : '0000000000';

    const TIMEZONE = 'America/Bogota';
    const todayString = format(new Date(), 'yyyy-MM-dd', { timeZone: TIMEZONE });

    const appointmentDateObject = createColombianDate(todayString);

    const service = await Service.findById(serviceId);
    if (!service || !service.duration) {
      return res.status(404).json({ success: false, message: "Servicio no encontrado o no tiene una duración definida." });
    }

    const barber = await User.findById(barberId); 
    if (!barber) {
      return res
        .status(404)
        .json({ success: false, message: "Barbero no encontrado." });
    }

    const site = await Site.findById(siteId);
    if (!site) {
      return res
        .status(404)
        .json({ success: false, message: "Sede no encontrada." });
    }

    const startTimeInMinutes = timeToMinutes(startTime);
    const endTimeInMinutes = startTimeInMinutes + service.duration;
    const endHours = Math.floor(endTimeInMinutes / 60);
    const endMinutes = endTimeInMinutes % 60;
    const endTime = `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;

    const newServiceRecord = new Appointment({
      barberId,
      serviceId,
      siteId,
      date: appointmentDateObject,
      startTime,
      endTime, 
      clientName,
      clientPhone: phoneToSave,
      notes,
      status: "completada",
      isWalkIn: true,
      completedAt: new Date(),
      confirmationCode: `WALKIN_${nanoid(8)}`,
      serviceNameSnapshot: service.name,
      servicePriceSnapshot: service.price,
      serviceDurationSnapshot: service.duration,
      barberNameSnapshot: barber.name,
      siteNameSnapshot: site.name_site,

    });

    await newServiceRecord.save();

    return res.status(201).json({
      success: true,
      message: `Servicio para "${clientName}" registrado con éxito para hoy, ${todayString}.`,
      data: newServiceRecord
    });

  }catch (error){
    console.error("Error en createCompletedService:", error);
    if (error.name === "ValidationError") {
        return res.status(400).json({ success: false, message: "Error de validación.", error: error.message });
    }
    res.status(500).json({ success: false, message: "Error interno del servidor.", error: error.message });
  }
}

// export const createAppointment = async (req, res) => {
//   const {
//     barberId,
//     serviceId,
//     siteId,
//     date: dateString,
//     startTime,
//     endTime,
//     clientName,
//     clientPhone,
//     clientEmail,
//     notes,
//   } = req.body;

//   try {
//     if (
//       !barberId ||
//       !serviceId ||
//       !siteId ||
//       !dateString ||
//       !startTime ||
//       !endTime ||
//       !clientName ||
//       !clientPhone
//     ) {
//       return res.status(400).json({
//         success: false,
//         message:
//           "Faltan campos obligatorios (incluyendo endTime) para crear la reserva.",
//       });
//     }

//     // (formato para dateString, startTime, email y phone validar si es necesario las validaciones de los campos.)
//     if (timeToMinutes(startTime) >= timeToMinutes(endTime)) {
//       return res.status(400).json({
//         success: false,
//         message: "La hora de fin debe ser posterior a la hora de inicio.",
//       });
//     }

//     const service = await Service.findById(serviceId);
//     if (!service) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Servicio no encontrado." });
//     }

//     /*PROBABILIDAD DE CREAR UN FUNCION QUE VERIFIQUE LAS FECHAS DISPONIBLES...
//         LA IDE ES QUE EN EL FRONTEND LAS MUESTRE PERO QUEDA PRENDIENTE...*/

//     /*Validar esta funcuino de appointmentDateObject*/
//     const appointmentDateObject = new Date(dateString + "T00:00:00");

//     const conflictingAppointment = await Appointment.findOne({
//       barberId,
//       date: appointmentDateObject,
//       status: { $nin: ["cancelada", "no-asistio"] },
//       $or: [
//         // Lógica de solapamiento: NuevaCita.start < Existente.end && NuevaCita.end > Existente.start
//         { startTime: { $lt: endTime }, endTime: { $gt: startTime } }, //solapamiento parcial o total
//         { startTime: { $lt: endTime, $gte: startTime } }, // Cita existente comienza dentro o al mismo tiempo
//         { endTime: { $gt: startTime, $lte: endTime } }, // Cita existente termina dentro o al mismo tiempo
//       ],
//     });
//     // La lógica de solapamiento original `(A.start < B.end) && (A.end > B.start)` es generalmente buena.
//     // El `startTime: { $lt: endTime }` se refiere al `startTime` de una cita existente comparado con el `endTime` de la nueva.
//     // El `endTime: { $gt: startTime }` se refiere al `endTime` de una cita existente comparado con el `startTime` de la nueva.

//     if (conflictingAppointment) {
//       return res.status(409).json({
//         // 409 Conflict
//         success: false,
//         message:
//           "Lo sentimos, este horario acaba de ser reservado. Por favor, elige otro.",
//       });
//     }

//     const newAppointment = new Appointment({
//       barberId,
//       serviceId,
//       siteId,
//       date: appointmentDateObject,
//       startTime,
//       endTime,
//       clientName,
//       clientPhone,
//       clientEmail,
//       notes,
//       status: "pendiente",
//     });

//     newAppointment.confirmationCode = nanoid(8); //hacer pruebas de pasar este codigo a mayus con .upperCase

//     await newAppointment.save();

//     return res.status(201).json({
//       success: true,
//       message: "Reserva creada con éxito. ✅",
//       data: newAppointment,
//     });
//   } catch (error) {
//     console.error("Error en createAppointment:", error);
//     if (error.name === "ValidationError") {
//       // Errores de validación de Mongoose (definidos en tu Schema)
//       const messages = Object.values(error.errors).map((err) => err.message);
//       return res
//         .status(400)
//         .json({
//           success: false,
//           message: "Error de validación.",
//           errors: messages,
//         });
//     }
//     res.status(500).json({
//       success: false,
//       message: "Error interno del servidor al crear la reserva.",
//       error: error.message,
//     });
//   }
// };

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

    // Validación de horarios
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

    const barber = await User.findById(barberId); 
    if (!barber) {
      return res
        .status(404)
        .json({ success: false, message: "Barbero no encontrado." });
    }

    // Obtener datos de la Sede
    const site = await Site.findById(siteId);
    if (!site) {
      return res
        .status(404)
        .json({ success: false, message: "Sede no encontrada." });
    }

    const { startOfDay, endOfDay } = getDateRangeInColombia(dateString);
    
    console.log(`📅 Creando nueva cita para ${dateString}:`);
    console.log(`   🕐 Horario solicitado: ${startTime} - ${endTime}`);
    console.log(`   📅 Rango búsqueda UTC: ${startOfDay.toISOString()} - ${endOfDay.toISOString()}`);

    // Verificar conflictos con el manejo correcto de zona horaria
    const conflictingAppointment = await Appointment.findOne({
      barberId,
      date: {
        $gte: startOfDay,
        $lt: endOfDay
      },
      status: { $nin: ["cancelada", "no-asistio"] },
      // Lógica de solapamiento simplificada y más clara
      startTime: { $lt: endTime },
      endTime: { $gt: startTime }
    });

    if (conflictingAppointment) {
      console.log(`❌ Conflicto detectado con cita existente:`);
      console.log(`   🕐 Cita conflictiva: ${conflictingAppointment.startTime} - ${conflictingAppointment.endTime}`);
      console.log(`   📅 Fecha cita conflictiva: ${conflictingAppointment.date.toISOString()}`);
      
      return res.status(409).json({
        success: false,
        message: "Lo sentimos, este horario acaba de ser reservado. Por favor, elige otro.",
      });
    }

    console.log(`✅ No hay conflictos, procediendo a crear la cita`);

    // Usar startOfDay para almacenar la fecha (inicio del día en UTC para Colombia)
    const newAppointment = new Appointment({
      barberId,
      serviceId,
      siteId,
      date: startOfDay, // Usar la fecha corregida por zona horaria
      startTime,
      endTime,
      clientName,
      clientPhone,
      clientEmail,
      notes,
      status: "pendiente",
      serviceNameSnapshot: service.name,
      servicePriceSnapshot: service.price,
      serviceDurationSnapshot: service.duration,
      barberNameSnapshot: barber.name,
      siteNameSnapshot: site.name_site,
    });

    // Generar código de confirmación en mayúsculas
    newAppointment.confirmationCode = nanoid(8).toUpperCase();

    await newAppointment.save();

    console.log(`🎉 Cita creada exitosamente:`);
    console.log(`   🆔 ID: ${newAppointment._id}`);
    console.log(`   🔑 Código: ${newAppointment.confirmationCode}`);
    console.log(`   📅 Fecha almacenada: ${newAppointment.date.toISOString()}`);

    return res.status(201).json({
      success: true,
      message: "Reserva creada con éxito. ✅",
      data: newAppointment,
    });
  } catch (error) {
    console.error("❌ Error en createAppointment:", error);
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
    const appointments = await Appointment.find(query)
      .populate("barberId", "name last_name")
      .populate("serviceId", "name duration")
      .populate("siteId", "name_site")
      .sort(sortOption)
      .lean();

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
  const { status, notes } = req.body; // 'notes' podría ser para una razón de cancelación o comentario al completar

  try {

    const appointment = req.appointment;
    
    const allowedStatuses = [
      "pendiente",
      "confirmada",
      "completada",
      "cancelada",
      "no-asistio",
    ];
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Estado no válido. Los estados permitidos son: ${allowedStatuses.join(
          ", "
        )}.`,
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

    appointment.status = status;
    if (status === 'cancelada' && req.user.role === 'barbero' && !notes) {
      // Si un barbero cancela y no hay una nota específica, añade una por defecto.
      appointment.notes = 'Cancelada por decisión del barbero.';
    } else if (notes !== undefined) {
      appointment.notes = notes;
    }

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

// export const updateAppointment = async (req, res) => {
//   const { appointmentId } = req.params;
//   const updates = req.body;
//   const { userId, role } = req.user;

//   try {
//     if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
//       return res
//         .status(400)
//         .json({ success: false, message: "ID de reserva no válido." });
//     }

//     const appointment = await Appointment.findById(appointmentId);
//     if (!appointment) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Reserva no encontrada." });
//     }

//     if (role === "barbero" && appointment.barberId.toString() !== userId) {
//       return res
//         .status(403)
//         .json({
//           success: false,
//           message: "No tienes permiso para editar esta reserva.",
//         });
//     }

//     // --- VALIDACIÓN DE CONFLICTO (si se está cambiando el horario) ---
//     const isReschedule = updates.date || updates.startTime || updates.barberId;

//     if (isReschedule) {
//       const newBarberId = updates.barberId || appointment.barberId;
//       const newDate =
//         updates.date || appointment.date.toISOString().split("T")[0];
//       const newStartTime = updates.startTime || appointment.startTime;
//       const newEndTime = updates.endTime || appointment.endTime;

//       const newDateObject = new Date(newDate + "T00:00:00.000Z");

//       const conflictingAppointment = await Appointment.findOne({
//         barberId: newBarberId,
//         date: newDateObject,
//         _id: { $ne: appointmentId }, // Excluimos la cita actual
//         status: { $nin: ["cancelada", "no-asistio"] },
//         // La misma lógica de solapamiento que ya usas y funciona
//         startTime: { $lt: newEndTime },
//         endTime: { $gt: newStartTime },
//       });

//       if (conflictingAppointment) {
//         return res
//           .status(409)
//           .json({
//             success: false,
//             message: `El horario de ${newStartTime} a ${newEndTime} ya no está disponible.`,
//           });
//       }
//     }

//     // --- APLICAR ACTUALIZACIONES ---
//     Object.keys(updates).forEach((key) => {
//       if (role === "barbero" && (key === "barberId" || key === "siteId")) {
//         return;
//       }
//       appointment[key] = updates[key];
//     });

//     const updatedAppointment = await appointment.save();

//     res.status(200).json({
//       success: true,
//       message: "Reserva actualizada con éxito.",
//       data: updatedAppointment,
//     });
//   } catch (error) {
//     console.error("Error en updateAppointment:", error);
//     res
//       .status(500)
//       .json({ success: false, message: "Error interno del servidor." });
//   }
// };
 
export const updateAppointment = async (req, res) => {
  const { appointmentId } = req.params;
  const updates = req.body; // El cuerpo ahora contendrá SOLO los campos a actualizar
  const { role } = req.user;
  const userId = req.user._id;

  try {
    if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
      return res
        .status(400)
        .json({ success: false, message: "ID de reserva no válido." });
    }

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res
        .status(404)
        .json({ success: false, message: "Reserva no encontrada." });
    }

    let hasPermission = false;
    if (role === 'admin' || role === 'superadmin') {
      hasPermission = true;
    } else if (role === 'barbero') {
      if (appointment.barberId && userId) {
        if (appointment.barberId.equals(userId)) {
          hasPermission = true;
        }
      }
    }

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: "No tienes los permisos necesarios para editar esta reserva.",
      });
    }

    // Determinar si se está intentando reagendar la cita (cambio de barbero, fecha o hora)
    const wantsToReschedule = 
        updates.barberId !== undefined || // Se envió barberId (podría ser el mismo o diferente)
        updates.date !== undefined ||     // Se envió date
        updates.startTime !== undefined;  // Se envió startTime

    // Preparamos los valores para la validación de conflicto si es un reagendamiento
    let newBarberId = appointment.barberId;
    let newDate = appointment.date.toISOString().split("T")[0]; // Fecha original como string 'YYYY-MM-DD'
    let newStartTime = appointment.startTime;
    let newEndTime = appointment.endTime;

    if (wantsToReschedule) {
      // Usar los valores nuevos si se proporcionan, si no, mantener los originales
      newBarberId = updates.barberId !== undefined ? updates.barberId : appointment.barberId;
      newDate = updates.date !== undefined ? updates.date : appointment.date.toISOString().split("T")[0];
      newStartTime = updates.startTime !== undefined ? updates.startTime : appointment.startTime;
      newEndTime = updates.endTime !== undefined ? updates.endTime : appointment.endTime; // ✨ CLAVE: Usar updates.endTime si viene!

      // Si el `barberId`, `date` o `startTime` han cambiado respecto a la cita original,
      // O si el `barberId`, `date` y `startTime` son los mismos, pero `endTime` ha cambiado (esto no debería pasar desde el frontend si un slot es fijo)
      // ENTONCES, validamos el conflicto.
      const hasActuallyChangedTimeSlot = 
          newBarberId.toString() !== appointment.barberId.toString() ||
          newDate !== appointment.date.toISOString().split("T")[0] ||
          newStartTime !== appointment.startTime;

      if (hasActuallyChangedTimeSlot) {
        // Validación de conflicto solo si realmente hay un cambio en el slot
        const { startOfDay, endOfDay } = getDateRangeInColombia(newDate);

        console.log(`🔄 Validando conflicto para reagendamiento:`);
        console.log(`   📅 Nueva fecha: ${newDate}`);
        console.log(`   🕐 Nuevo horario: ${newStartTime} - ${newEndTime}`);
        console.log(`   📅 Rango UTC búsqueda: ${startOfDay.toISOString()} - ${endOfDay.toISOString()}`);
        
        const conflictingAppointment = await Appointment.findOne({
          barberId: newBarberId,
          date: {
            $gte: startOfDay,
            $lt: endOfDay
          },
          _id: { $ne: appointmentId }, // Excluimos la cita actual que estamos editando
          status: { $nin: ["cancelada", "no-asistio", "completada"] }, // Excluir estados que no bloquean
          // Lógica de superposición de tiempo (intervalos se solapan)
          $or: [
            { // Nuevo intervalo empieza dentro de un slot existente
                startTime: { $lt: newEndTime },
                endTime: { $gt: newStartTime }
            }
          ]
        });

        if (conflictingAppointment) {
          console.log(`❌ Conflicto encontrado con cita: ${conflictingAppointment._id}`);
          console.log(`   🕐 Horario conflictivo: ${conflictingAppointment.startTime} - ${conflictingAppointment.endTime}`);
          console.log(`   📅 Fecha conflictiva: ${conflictingAppointment.date.toISOString()}`);

          return res
            .status(409)
            .json({
              success: false,
              message: `El horario de ${newStartTime} a ${newEndTime} ya no está disponible para el barbero seleccionado.`,
            });
        }
        console.log(`✅ No hay conflictos, reagendamiento válido`);
      }

      // Si se cambió la fecha, asegúrate de que se guarde correctamente como Date
      if (updates.date) {
        updates.date = getDateRangeInColombia(updates.date).startOfDay;
      }
      // Asegurarse de que startTime y endTime también se actualicen en `updates`
      // Esto es crucial para que `Object.keys(updates).forEach` los aplique.
      updates.startTime = newStartTime;
      updates.endTime = newEndTime;
      updates.barberId = newBarberId; // Asegurarse que el barberId final se use si fue actualizado
    }
    
    // --- APLICAR ACTUALIZACIONES ---
    Object.keys(updates).forEach((key) => {
      // Bloquear cambios de barberId o siteId para barberos (si es necesario)
      // Esta lógica de permiso ya la manejas arriba, pero aquí es para evitar que se pisen los updates
      if (role === "barbero" && (key === "barberId" || key === "siteId")) {
        // Si el barbero intenta cambiar su propio barberId o siteId, lo ignoramos
        // Aunque ya lo filtraste al principio al establecer newBarberId.
        // Quizás es mejor quitar esto y confiar en la lógica de `newBarberId`
        // o si es que quieres que un barbero NO PUEDA enviar esos campos en el body
        return; 
      }
      appointment[key] = updates[key];
    });

    const updatedAppointment = await appointment.save();

    console.log(`✅ Reserva ${appointmentId} actualizada exitosamente`);
    console.log(`   📅 Fecha final almacenada: ${updatedAppointment.date.toISOString()}`);
    console.log(`   🕐 Horario final: ${updatedAppointment.startTime} - ${updatedAppointment.endTime}`);

    res.status(200).json({
      success: true,
      message: "Reserva actualizada con éxito.",
      data: updatedAppointment,
    });
  } catch (error) {
    console.error("❌ Error en updateAppointment:", error);
    res
      .status(500)
      .json({ success: false, message: "Error interno del servidor." });
  }
};

export const deleteAppointment = async (req, res) => {
  const { appointmentId } = req.params; // ID de la cita a cancelar/eliminar
  const { cancellationReason } = req.body; // La razón de cancelación (opcional, solo para barberos)

  // Asumiendo que `req.user` es poblado por tu middleware `protect`
  const { role, _id: userId } = req.user; 

  try {
    if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
      return res.status(400).json({ success: false, message: "ID de reserva no válido." });
    }

    const appointment = await Appointment.findById(appointmentId);

    if (!appointment) {
      return res.status(404).json({ success: false, message: "Cita no encontrada." });
    }

    // --- Lógica de Autorización ---
    let canPerformAction = false;
    if (role === 'admin' || role === 'superadmin') { // Los roles pueden ser 'superadmin' o 'super-admin' según tu implementación
      canPerformAction = true; // Admin/SuperAdmin pueden eliminar/cancelar cualquier cita
    } else if (role === 'barbero') {
      // El barbero solo puede cancelar sus propias citas
      if (appointment.barberId && appointment.barberId.equals(userId)) {
        canPerformAction = true;
      }
    }

    if (!canPerformAction) {
      return res.status(403).json({ success: false, message: "No tienes los permisos para realizar esta acción sobre esta cita." });
    }

    // --- Lógica de la Acción (Cancelación vs. Eliminación Forzada) ---
    if (role === 'barbero') {
      // Si es un barbero, cambiamos el estado a 'cancelada'
      if (!cancellationReason || cancellationReason.trim() === '') {
        return res.status(400).json({ success: false, message: "La razón de cancelación es obligatoria para los barberos." });
      }

      // Añadir la razón de cancelación a las notas existentes o crearlas
      const existingNotes = appointment.notes ? `${appointment.notes}\n` : '';
      appointment.notes = `${existingNotes}Cancelado por barbero (ID: ${userId}): ${cancellationReason} (Fecha: ${new Date().toLocaleString('es-CO')})`;
      appointment.status = 'cancelada';

      await appointment.save();

      return res.status(200).json({ 
        success: true, 
        message: 'Cita cancelada exitosamente por el barbero.', 
        data: appointment 
      });

    } else if (role === 'admin' || role === 'superadmin') {
      // Si es un admin o super-admin, eliminamos la cita permanentemente
      await Appointment.deleteOne({ _id: appointmentId }); // O usa findByIdAndDelete(appointmentId);

      return res.status(200).json({ 
        success: true, 
        message: 'Cita eliminada permanentemente por el administrador.' 
      });

    } else {
      // Este caso debería ser atrapado por `canPerformAction` antes, pero como fallback
      return res.status(403).json({ success: false, message: "Rol no autorizado para esta acción." });
    }

  } catch (error) {
    console.error("❌ Error en deleteAppointment:", error);
    return res.status(500).json({ success: false, message: "Error interno del servidor al procesar la cita." });
  }
};

// --- NUEVA FUNCIÓN: Obtener Citas Próximas para el Dashboard ---
export const getUpcomingAppointmentsForDashboard = async (req, res) => {
    try {
        const { barberId, limit = 5 } = req.query; // Recibe barberId si es un barbero, y un límite opcional

        const todayFormatted = format(new Date(), 'yyyy-MM-dd');
        const { startOfDay: startOfTodayUTC } = getDateRangeInColombia(todayFormatted);

        let query = {
            // Citas a partir de hoy (incluido hoy)
            date: { $gte: startOfTodayUTC },
            // Solo citas pendientes o confirmadas
            status: { $in: ["pendiente", "confirmada"] }
        };

        if (barberId && mongoose.Types.ObjectId.isValid(barberId)) {
            query.barberId = new mongoose.Types.ObjectId(barberId);
        } else if (barberId) {
            // Si se proporciona un barberId inválido, devolver un error o un array vacío
            return res.status(400).json({
                success: false,
                message: "El ID del barbero proporcionado no es válido.",
                data: []
            });
        }

        const appointments = await Appointment.find(query)
            .populate('barberId', 'name last_name') // Trae el 'name' y 'last_name' del barbero
            .populate('serviceId', 'name price') // Trae 'name' y 'price' del servicio
            .populate('siteId', 'name_site') // Trae el 'name' de la sede
            .sort({ date: 1, startTime: 1 }) // Ordena por fecha ascendente y luego por hora de inicio
            .limit(parseInt(limit)) // Limita el número de resultados
            .lean(); // Devuelve objetos JS planos para mejor rendimiento

        if (appointments.length === 0) {
            return res.status(200).json({
                success: true,
                message: "No se encontraron citas próximas.",
                data: []
            });
        }

        res.status(200).json({
            success: true,
            message: "Citas próximas recuperadas con éxito. ✅",
            count: appointments.length,
            data: appointments
        });

    } catch (error) {
        console.error("Error en getUpcomingAppointmentsForDashboard:", error);
        res.status(500).json({
            success: false,
            message: "Error interno del servidor al obtener las citas próximas.",
            error: error.message
        });
    }
};