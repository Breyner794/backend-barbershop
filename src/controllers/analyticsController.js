// backend/controllers/analyticsController.js

import Appointment from "../../server/db/models/appoiment.js";
import User from '../../server/db/models/user.js';
import Service from '../../server/db/models/Service.js';
import mongoose from 'mongoose';
import { parseISO, format, differenceInMinutes, addDays, isBefore, isSameDay } from 'date-fns';
import { getEffectiveAvailability } from '../../utils/availabilityConflictValidator.js'; 
import { timeToMinutes, getDateRangeInColombia } from './appointment.Controller.js'; 
import { BUSINESS_FEE_PER_CUT } from '../config/fees.js';

// --- Endpoint 1: Reservas diarias en un rango de fechas ---
export const getDailyBookings = async (req, res) => {
    try {
        const { startDate, endDate, barberId, status: statusQuery } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({ message: 'Missing startDate or endDate query parameters.' });
        }

        const { startOfDay: startOfRangeUTC } = getDateRangeInColombia(startDate);
        const { endOfDay: endOfRangeUTC } = getDateRangeInColombia(endDate);

        let matchQuery = {
            date: { $gte: startOfRangeUTC, $lte: endOfRangeUTC }
        };

        // --- Lógica para filtrar por estado (dinámico) ---
        if (statusQuery) {
            
            matchQuery.status = { $in: statusQuery.split(',') };
        } else {
            
            matchQuery.status = { $in: ["pendiente", "confirmada"] };
        }

        // --- Lógica para filtrar por barbero ---
        if (barberId) {
            if (!mongoose.Types.ObjectId.isValid(barberId)) {
                return res.status(400).json({ success: false, message: 'Invalid barberId provided.' });
            }
            matchQuery.barberId = new mongoose.Types.ObjectId(barberId);
        }

        const dailyBookings = await Appointment.aggregate([
            {
                $match: matchQuery // <-- Usa el matchQuery modificado
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { _id: 1 }
            }
        ]);

        const result = [];
        let currentDate = parseISO(startDate);
        while (currentDate <= parseISO(endDate)) {
            const dateStr = format(currentDate, 'yyyy-MM-dd');
            const found = dailyBookings.find(item => item._id === dateStr);
            result.push({ date: dateStr, count: found ? found.count : 0 });
            currentDate = new Date(currentDate.setDate(currentDate.getDate() + 1));
        }

        res.json(result);
    } catch (error) {
        console.error('Error fetching daily bookings:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// --- Endpoint 2: Conteo de reservas por estado ---
// (No requiere cambios)
export const getBookingsByStatus = async (req, res) => {
    try {
        const bookingsByStatus = await Appointment.aggregate([
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 }
                }
            },
            {
                $project: {
                    status: "$_id",
                    count: 1,
                    _id: 0
                }
            }
        ]);
        res.json(bookingsByStatus);
    } catch (error) {
        console.error('Error fetching bookings by status:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// --- Endpoint 3: Servicios más populares ---
// (No requiere cambios)
export const getTopServices = async (req, res) => {
    try {
        const topServices = await Appointment.aggregate([
            {
                $match: { status: { $in: ["confirmada", "completada"] } }
            },
            {
                $group: {
                    _id: "$serviceId",
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { count: -1 }
            },
            {
                $limit: 5
            },
            {
                $lookup: {
                    from: "services",
                    localField: "_id",
                    foreignField: "_id",
                    as: "serviceDetails"
                }
            },
            {
                $unwind: "$serviceDetails"
            },
            {
                $project: {
                    _id: 0,
                    serviceId: "$_id",
                    serviceName: "$serviceDetails.name",
                    count: 1
                }
            }
        ]);
        res.json(topServices);
    } catch (error) {
        console.error('Error fetching top services:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// --- Endpoint 4: Barberos con más reservas ---
// (No requiere cambios)
export const getTopBarbers = async (req, res) => {
    try {
        const topBarbers = await Appointment.aggregate([
            {
                $match: { status: { $in: ["confirmada", "completada"] } }
            },
            {
                $group: {
                    _id: "$barberId",
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { count: -1 }
            },
            {
                $limit: 5
            },
            {
                $lookup: {
                    from: "users",
                    localField: "_id",
                    foreignField: "_id",
                    as: "barberDetails"
                }
            },
            {
                $unwind: "$barberDetails"
            },
            {
                $project: {
                    _id: 0,
                    barberId: "$_id",
                    barberName: "$barberDetails.name",
                    count: 1
                }
            }
        ]);
        res.json(topBarbers);
    } catch (error) {
        console.error('Error fetching top barbers:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// --- Endpoint 5: Tasa de ocupación (REVISIÓN FINAL) ---
export const getOccupancyRate = async (req, res) => {
    try {
        const { startDate, endDate, barberId, siteId } = req.query;

        if (!startDate || !endDate || !barberId) {
            return res.status(400).json({ 
                success: false,
                message: 'Missing startDate, endDate, or barberId query parameters.' 
            });
        }

        if (!mongoose.Types.ObjectId.isValid(barberId)) {
            return res.status(400).json({ 
                success: false,
                message: 'Invalid barberId provided.' 
            });
        }

        const { startOfDay: startOfRangeUTC } = getDateRangeInColombia(startDate);
        const { endOfDay: endOfRangeUTC } = getDateRangeInColombia(endDate);

        const barber = await User.findById(barberId);
        if (!barber) {
            return res.status(404).json({ 
                success: false,
                message: 'Barber not found.' 
            });
        }

        // Obtener la disponibilidad efectiva del barbero para el rango de fechas
        let totalAvailableMinutes = 0;
        const startDateObj = parseISO(startDate);
        const endDateObj = parseISO(endDate);
        let currentDate = startDateObj;

        // Iterar día por día en el rango de fechas
        while (isBefore(currentDate, endDateObj) || isSameDay(currentDate, endDateObj)) {
            const dateString = format(currentDate, 'yyyy-MM-dd');
            
            try {
                const effectiveAvailability = await getEffectiveAvailability(
                    new mongoose.Types.ObjectId(barberId),
                    dateString
                );

                // Si el barbero trabaja ese día y tiene slots disponibles
                if (effectiveAvailability.isWorkingDay && effectiveAvailability.timeSlots.length > 0) {
                    for (const slot of effectiveAvailability.timeSlots) {
                        const slotStartTime = parseISO(`${dateString}T${slot.startTime}:00`);
                        const slotEndTime = parseISO(`${dateString}T${slot.endTime}:00`);
                        totalAvailableMinutes += differenceInMinutes(slotEndTime, slotStartTime);
                    }
                }
            } catch (error) {
                console.warn(`Error obteniendo disponibilidad para ${dateString}:`, error.message);
                // Continuar con el siguiente día en caso de error
            }

            // Avanzar al siguiente día
            currentDate = addDays(currentDate, 1);
        }

        // Calcular los minutos reservados en el rango de fechas
        const matchQuery = {
            barberId: new mongoose.Types.ObjectId(barberId),
            date: { $gte: startOfRangeUTC, $lte: endOfRangeUTC },
            status: { $in: ["confirmada", "completada"] }
        };

        if (siteId) {
            if (!mongoose.Types.ObjectId.isValid(siteId)) {
                return res.status(400).json({ 
                    success: false,
                    message: 'Invalid siteId provided.' 
                });
            }
            matchQuery.siteId = new mongoose.Types.ObjectId(siteId);
        }

        const bookedMinutesResult = await Appointment.aggregate([
            { $match: matchQuery },
            {
                $lookup: {
                    from: 'services',
                    localField: 'serviceId',
                    foreignField: '_id',
                    as: 'serviceDetails'
                }
            },
            { $unwind: '$serviceDetails' },
            {
                $group: {
                    _id: null,
                    totalBookedMinutes: { $sum: '$serviceDetails.duration' }
                }
            }
        ]);

        const totalBookedMinutes = bookedMinutesResult.length > 0 ? bookedMinutesResult[0].totalBookedMinutes : 0;

        // Calcular la tasa de ocupación
        const occupancyRate = totalAvailableMinutes > 0
            ? ((totalBookedMinutes / totalAvailableMinutes) * 100).toFixed(2) + '%'
            : '0.00%';

        res.status(200).json({
            success: true,
            barberId: barberId,
            startDate: startDate,
            endDate: endDate,
            occupancyRate: occupancyRate,
            bookedMinutes: totalBookedMinutes,
            totalAvailableMinutes: totalAvailableMinutes,
            message: totalAvailableMinutes === 0 ? 'El barbero no tiene disponibilidad en el rango de fechas especificado.' : undefined
        });

    } catch (error) {
        console.error('Error in getOccupancyRate:', error);
        res.status(500).json({ 
            success: false,
            message: 'Server error', 
            error: error.message 
        });
    }
};

// --- Endpoint 6: Clientes recurrentes por número de celular ---
// (No requiere cambios)
export const getRecurringClients = async (req, res) => {
    try {
        const minBookings = parseInt(req.query.minBookings) || 2; 

        const recurringClients = await Appointment.aggregate([
            {
                $match: {
                    clientPhone: { $exists: true, $ne: null, $ne: "" },
                    status: { $in: ["confirmada", "completada"] }
                }
            },
            {
                $group: {
                    _id: "$clientPhone",
                    clientName: { $first: "$clientName" },
                    totalBookings: { $sum: 1 },
                    lastBookingDate: { $max: "$date" }
                }
            },
            {
                $match: {
                    totalBookings: { $gte: minBookings }
                }
            },
            {
                $sort: { totalBookings: -1 }
            }
        ]);
        res.json(recurringClients);
    } catch (error) {
        console.error('Error fetching recurring clients:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// --- NUEVO ENDPOINT: Recaudación por fecha ---
export const getRevenueByDateRange = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Los parámetros "startDate" y "endDate" son requeridos para calcular la recaudación.'
            });
        }

        // Obtener el rango de fechas UTC ajustado por la zona horaria de Colombia
        const { startOfDay: startOfRangeUTC, endOfDay: endOfRangeUTC } = getDateRangeInColombia(endDate);
        const { startOfDay: startOfStartDateUTC } = getDateRangeInColombia(startDate);

        const totalRevenue = await Appointment.aggregate([
            {
                $match: {
                    // Filtra por citas dentro del rango de fechas y con estado 'completada'
                    date: { $gte: startOfStartDateUTC, $lte: endOfRangeUTC },
                    status: "completada" // Solo contamos ingresos de citas completadas
                }
            },
            {
                $lookup: { 
                    from: 'services', // Asegúrate que sea el nombre exacto de tu colección de servicios
                    localField: 'serviceId',
                    foreignField: '_id',
                    as: 'serviceDetails'
                }
            },
            { $unwind: { path: '$serviceDetails', preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: null, 
                    totalAmount: { $sum: { 
                            // Si ambos fallan (null), usa 0 (aunque el match ya filtró 'completada', es buena práctica)
                            $ifNull: [
                                '$serviceDetails.price',
                                '$servicePriceSnapshot',
                                0
                            ]
                        } 
                    } 
                }
            },
            {
                $project: {
                    _id: 0,
                    totalAmount: 1
                }
            }
        ]);

        const revenue = totalRevenue.length > 0 ? totalRevenue[0].totalAmount : 0;

        res.status(200).json({
            success: true,
            startDate: format(parseISO(startDate), 'yyyy-MM-dd'),
            endDate: format(parseISO(endDate), 'yyyy-MM-dd'),
            totalRevenue: revenue,
            message: `Recaudación total de servicios completados entre ${startDate} y ${endDate}.`
        });

    } catch (error) {
        console.error('❌ Error fetching revenue by date range:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor al obtener la recaudación.',
            error: error.message
        });
    }
};

// --- NUEVO ENDPOINT: Recaudación por Barbero o Servicio ---
export const getRevenueByBarberOrService = async (req, res) => {
    try {
        const { startDate, endDate, groupBy } = req.query; // groupBy puede ser 'barber' o 'service'

        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Los parámetros "startDate" y "endDate" son requeridos para calcular la recaudación.'
            });
        }

        if (groupBy && !['barber', 'service'].includes(groupBy)) {
            return res.status(400).json({
                success: false,
                message: 'El parámetro "groupBy" debe ser "barber" o "service" si se proporciona.'
            });
        }

        const { startOfDay: startOfRangeUTC } = getDateRangeInColombia(startDate);
        const { endOfDay: endOfRangeUTC } = getDateRangeInColombia(endDate);

        let aggregationPipeline = [
            {
                $match: {
                    date: { $gte: startOfRangeUTC, $lte: endOfRangeUTC },
                    status: "completada" // Solo consideramos citas completadas para ingresos
                }
            },
            {
                $lookup: {
                    from: 'services', // Colección de servicios
                    localField: 'serviceId',
                    foreignField: '_id',
                    as: 'serviceDetails'
                }
            },
            { $unwind: { path: '$serviceDetails', preserveNullAndEmptyArrays: true } }, 
            {
                $project: {
                    barberId: 1,
                    serviceId: 1,
                    serviceNameSnapshot: 1, 
                    barberNameSnapshot: 1,
                    revenue: {$ifNull: ['$serviceDetails.price', '$servicePriceSnapshot']}
                }
            }
        ];

        if (groupBy === 'barber') {
            aggregationPipeline.push(
                {
                    $group: {
                        _id: '$barberId',
                        totalRevenue: { $sum: '$revenue' },
                        barberSnapshotName: { $max: '$barberNameSnapshot' }
                    }
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'barberDetails'
                    }
                },
                { $unwind: { path: '$barberDetails', preserveNullAndEmptyArrays: true } }, 
                {
                    $project: {
                        _id: 0,
                        barberId: '$_id',
                        barberName: { 
                            $ifNull: [
                                '$barberDetails.name', '$barberSnapshotName', 'Usuario por defecto'
                            ]
                        },
                        barberLastName: { $ifNull: ['$barberDetails.last_name', '- Eliminado'] },
                        totalRevenue: 1
                    }
                },
                { $sort: { totalRevenue: -1 } }
            );
        } else if (groupBy === 'service') {
            aggregationPipeline.push(
                {
                    $group: {
                        _id: '$serviceId',
                        totalRevenue: { $sum: '$revenue' },
                        serviceSnapshotName: { $max: '$serviceNameSnapshot' } 
                    }
                },
                {
                    $lookup: {
                        from: 'services',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'serviceDetails'
                    }
                },
                
                { $unwind: { path: '$serviceDetails', preserveNullAndEmptyArrays: true } }, 
                {
                    $project: {
                        _id: 0,
                        serviceId: '$_id',
                        totalRevenue: 1,
                        serviceName: { 
                            $ifNull: [
                                '$serviceDetails.name', 
                                {
                                    $cond: {
                                        if: { $ne: ["$serviceSnapshotName", null] },
                                        then: { $concat: ["$serviceSnapshotName", " (Eliminado)"] },
                                        else: 'Servicio por defecto'
                                    }
                                }
                            ]
                        }
                    }
                },
                { $sort: { totalRevenue: -1 } }
            );
        } else {
             aggregationPipeline.push(
                {
                    $group: {
                        _id: null,
                        totalRevenue: { $sum: '$revenue' }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        totalRevenue: 1
                    }
                }
            );
        }

        const result = await Appointment.aggregate(aggregationPipeline);

        res.status(200).json({
            success: true,
            startDate: format(parseISO(startDate), 'yyyy-MM-dd'),
            endDate: format(parseISO(endDate), 'yyyy-MM-dd'),
            groupBy: groupBy || 'total',
            data: result,
            message: `Recaudación por ${groupBy || 'total'} de servicios completados.`
        });

    } catch (error) {
        console.error('❌ Error fetching revenue by barber or service:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor al obtener la recaudación por barbero o servicio.',
            error: error.message
        });
    }
};

// --- NUEVO ENDPOINT: Servicios Activos e Inactivos ---
export const getServiceStatus = async (req, res) => {
    try {
        const activeServices = await Service.find({ isActive: true }).select('name price duration description');
        const inactiveServices = await Service.find({ isActive: false }).select('name price duration description');

        res.status(200).json({
            success: true,
            activeCount: activeServices.length,
            inactiveCount: inactiveServices.length,
            data: {
                activeServices,
                inactiveServices
            },
            message: "Estado de servicios recuperado exitosamente."
        });

    } catch (error) {
        console.error('❌ Error fetching service status:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor al obtener el estado de los servicios.',
            error: error.message
        });
    }
};

// --- NUEVO ENDPOINT: Tasa de Cancelación ---
export const getCancellationRate = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Los parámetros "startDate" y "endDate" son requeridos para calcular la tasa de cancelación.'
            });
        }

        const { startOfDay: startOfRangeUTC } = getDateRangeInColombia(startDate);
        const { endOfDay: endOfRangeUTC } = getDateRangeInColombia(endDate);

        // Contar el total de citas en el rango (excluyendo "no-asistio" para ser justos en la cancelación)
        const totalAppointmentsCount = await Appointment.countDocuments({
            date: { $gte: startOfRangeUTC, $lte: endOfRangeUTC },
            status: { $nin: ["no-asistio"] } // No contamos no-asistio aquí para el total de citas activas
        });

        // Contar las citas canceladas
        const cancelledAppointmentsCount = await Appointment.countDocuments({
            date: { $gte: startOfRangeUTC, $lte: endOfRangeUTC },
            status: "cancelada"
        });

        let cancellationRate = 0;
        if (totalAppointmentsCount > 0) {
            cancellationRate = (cancelledAppointmentsCount / totalAppointmentsCount) * 100;
        }

        res.status(200).json({
            success: true,
            startDate: format(parseISO(startDate), 'yyyy-MM-dd'),
            endDate: format(parseISO(endDate), 'yyyy-MM-dd'),
            totalAppointments: totalAppointmentsCount,
            cancelledAppointments: cancelledAppointmentsCount,
            cancellationRate: cancellationRate.toFixed(2) + '%',
            message: "Tasa de cancelación recuperada exitosamente."
        });

    } catch (error) {
        console.error('❌ Error fetching cancellation rate:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor al obtener la tasa de cancelación.',
            error: error.message
        });
    }
};

// --- ENDPOINT: Ganancia Neta del Negocio (descontando comisiones) ---
export const getNetRevenueByDateRange = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Los parámetros "startDate" y "endDate" son requeridos.'
            });
        }

        const { startOfDay: startOfRangeUTC } = getDateRangeInColombia(startDate);
        const { endOfDay: endOfRangeUTC } = getDateRangeInColombia(endDate);


        const revenueData = await Appointment.aggregate([
            {
                $match: {
                    date: { $gte: startOfRangeUTC, $lte: endOfRangeUTC },
                    status: "completada"
                }
            },
            {
                $lookup: { 
                    from: 'services',
                    localField: 'serviceId',
                    foreignField: '_id',
                    as: 'serviceDetails'
                }
            },
            { $unwind: { path: '$serviceDetails', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    // Precio final del servicio
                    servicePrice: {$ifNull: ['$servicePriceSnapshot', '$serviceDetails.price', 0]}, 
                }
            },
            {
                $addFields: {
                    // El negocio recibe $6,000 fijos por cada corte
                    businessRevenue: BUSINESS_FEE_PER_CUT,
                    // El barbero recibe el resto (precio del servicio - $6,000)
                    barberCommission: { $subtract: ['$servicePrice', BUSINESS_FEE_PER_CUT] }
                }
            },
            {
                $group: {
                    _id: null,
                    grossRevenue: { $sum: '$servicePrice' }, // Ganancia bruta total
                    netRevenue: { $sum: '$businessRevenue' }, // Ganancia neta del negocio ($6,000 × cortes)
                    totalCommissions: { $sum: '$barberCommission' }, // Total para barberos
                    totalAppointments: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0,
                    grossRevenue: 1,
                    netRevenue: 1,
                    totalCommissions: 1,
                    totalAppointments: 1,
                    // Porcentaje real de ganancia neta basado en comisión fija
                    netRevenuePercentage: {
                        $cond: [
                            { $eq: ['$grossRevenue', 0] },
                            0,
                            { $multiply: [ { $divide: ['$netRevenue', '$grossRevenue'] }, 100 ] }
                        ]
                    }
                }
            }
        ]);

        const data = revenueData.length > 0 ? revenueData[0] : {
            grossRevenue: 0,
            netRevenue: 0,
            totalCommissions: 0,
            totalAppointments: 0,
            netRevenuePercentage: 0
        };

        res.status(200).json({
            success: true,
            startDate: format(parseISO(startDate), 'yyyy-MM-dd'),
            endDate: format(parseISO(endDate), 'yyyy-MM-dd'),
            data: {
                grossRevenue: data.grossRevenue, // Ingresos brutos totales
                netRevenue: data.netRevenue, // Ganancia neta para el negocio ($6,000 × cantidad de cortes)
                totalCommissions: data.totalCommissions, // Total pagado a barberos (precio - $6,000 por cada corte)
                totalAppointments: data.totalAppointments,
                netRevenuePercentage: parseFloat(data.netRevenuePercentage?.toFixed(2)) || 0,
                businessFeePerCut: BUSINESS_FEE_PER_CUT, // Comisión fija por corte
                commissionModel: 'fixed' // Modelo de comisión fija
            },
            message: 'Ganancia neta calculada exitosamente.'
        });

    } catch (error) {
        console.error('❌ Error fetching net revenue:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor al calcular la ganancia neta.',
            error: error.message
        });
    }
};


// --- ENDPOINT: Desglose detallado por barbero ---
export const getRevenueBreakdownByBarber = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Los parámetros "startDate" y "endDate" son requeridos.'
            });
        }
        const { startOfDay: startOfRangeUTC } = getDateRangeInColombia(startDate);
        const { endOfDay: endOfRangeUTC } = getDateRangeInColombia(endDate);
        
        
        const breakdown = await Appointment.aggregate([
          {
            $match: {
              date: { $gte: startOfRangeUTC, $lte: endOfRangeUTC },
              status: "completada",
            },
          },
          {
            $lookup: {
              from: "services",
              localField: "serviceId",
              foreignField: "_id",
              as: "serviceDetails",
            },
          },
          { $unwind: { path: '$serviceDetails', preserveNullAndEmptyArrays: true } },
          {
            $group: {
              _id: "$barberId",
              barberSnapshotName: { $max: '$barberNameSnapshot' },
              totalServices: {
                $sum: {
                  $ifNull: [
                    "$servicePriceSnapshot",
                    "$serviceDetails.price",
                    0,
                  ],
                },
              },
              appointmentCount: { $sum: 1 },
            },
          },
          {
            $addFields: {
              // El negocio recibe $6,000 por cada corte
              businessShare: { $multiply: ["$appointmentCount", BUSINESS_FEE_PER_CUT] },
              // El barbero recibe el total menos la comisión fija del negocio
              barberCommission: { 
                $subtract: [
                  "$totalServices", 
                  { $multiply: ["$appointmentCount", BUSINESS_FEE_PER_CUT] }
                ] 
              },
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "_id",
              foreignField: "_id",
              as: "barberDetails",
            },
          },
          { $unwind: { path: '$barberDetails', preserveNullAndEmptyArrays: true } },
          {
            $project: {
              _id: 0,
              barberId: "$_id",
              barberName: {
                $ifNull: [
                  "$barberDetails.name",
                  "$barberSnapshotName",
                  "Usuario",
                ],
              },
              barberLastName: {
                $ifNull: ["$barberDetails.last_name", " (Eliminado)"],
              },
              totalServices: 1,
              appointmentCount: 1,
              barberCommission: 1, // Total - ($6,000 × cantidad de cortes)
              businessShare: 1, // $6,000 × cantidad de cortes
            },
          },
          { $sort: { totalServices: -1 } },
        ]);
        
        res.status(200).json({
            success: true,
            startDate: format(parseISO(startDate), 'yyyy-MM-dd'),
            endDate: format(parseISO(endDate), 'yyyy-MM-dd'),
            data: breakdown,
            businessFeePerCut: BUSINESS_FEE_PER_CUT,
            commissionModel: 'fixed', // Indicador del modelo de comisión
            message: 'Desglose de ingresos por barbero calculado exitosamente.'
        });
    } catch (error) {
        console.error('❌ Error fetching revenue breakdown:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor.',
            error: error.message
        });
    }
};

// --- ENDPOINT: Recaudo por sede ---
export const getRevenueBySite = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Los parámetros "startDate" y "endDate" son requeridos.'
            });
        }

        const { startOfDay: startOfRangeUTC } = getDateRangeInColombia(startDate);
        const { endOfDay: endOfRangeUTC } = getDateRangeInColombia(endDate);


        const siteRevenue = await Appointment.aggregate([
            {
                $match: {
                    date: { $gte: startOfRangeUTC, $lte: endOfRangeUTC },
                    status: "completada"
                }
            },
            {
                $lookup: {
                    from: "services",
                    localField: "serviceId",
                    foreignField: "_id",
                    as: "serviceDetails"
                }
            },
            { $unwind: { path: '$serviceDetails', preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: "$siteId",
                    siteName: { $first: "$siteNameSnapshot" },
                    totalRevenue: {
                        $sum: {
                            $ifNull: [
                                "$servicePriceSnapshot",
                                "$serviceDetails.price",
                                0
                            ]
                        }
                    },
                    appointmentCount: { $sum: 1 }
                }
            },
            {
                $addFields: {
                    // Ganancia neta para el negocio ($6,000 × cantidad de cortes)
                    netRevenue: { $multiply: ["$appointmentCount", BUSINESS_FEE_PER_CUT] },
                    // Total para barberos (ingreso total - comisión del negocio)
                    totalCommissions: { 
                        $subtract: [
                            "$totalRevenue", 
                            { $multiply: ["$appointmentCount", BUSINESS_FEE_PER_CUT] }
                        ] 
                    }
                }
            },
            {
                $lookup: {
                    from: "sites",
                    localField: "_id",
                    foreignField: "_id",
                    as: "siteDetails"
                }
            },
            { $unwind: { path: '$siteDetails', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 0,
                    siteId: "$_id",
                    siteName: {
                        $ifNull: [
                            "$siteDetails.name_site", // 1. Intenta usar el nombre original (si existe)
                            {
                                // 2. Si el original es null, ejecuta este condicional:
                                $cond: {
                                    if: { $ne: [ "$siteName", null ] }, // SI siteName (snapshot) NO es null
                                    then: { $concat: [ "$siteName", " (Eliminado)" ] }, // ENTONCES, concatena con la etiqueta
                                    else: "Sede Desconocida" // SINO (si ambos son null), usa el valor por defecto
                                }
                            }
                        ]
                    },
                    totalRevenue: 1,
                    netRevenue: 1, // $6,000 × cantidad de cortes
                    totalCommissions: 1, // Total para barberos
                    appointmentCount: 1,
                    averageRevenuePerAppointment: {
                        $cond: [
                            { $eq: ["$appointmentCount", 0] },
                            0,
                            { $divide: ["$totalRevenue", "$appointmentCount"] }
                        ]
                    },
                    // Porcentaje real de ganancia neta por sede
                    netRevenuePercentage: {
                        $cond: [
                            { $eq: ["$totalRevenue", 0] },
                            0,
                            { $multiply: [ { $divide: ["$netRevenue", "$totalRevenue"] }, 100 ] }
                        ]
                    }
                }
            },
            { $sort: { totalRevenue: -1 } }
        ]);

        // Calcular totales generales
        const totals = siteRevenue.reduce((acc, site) => ({
            totalRevenue: acc.totalRevenue + site.totalRevenue,
            netRevenue: acc.netRevenue + site.netRevenue,
            totalCommissions: acc.totalCommissions + site.totalCommissions,
            totalAppointments: acc.totalAppointments + site.appointmentCount
        }), {
            totalRevenue: 0,
            netRevenue: 0,
            totalCommissions: 0,
            totalAppointments: 0
        });

        // Calcular porcentaje promedio general
        const overallNetRevenuePercentage = totals.totalRevenue > 0 
            ? parseFloat(((totals.netRevenue / totals.totalRevenue) * 100).toFixed(2))
            : 0;

        res.status(200).json({
            success: true,
            startDate: format(parseISO(startDate), 'yyyy-MM-dd'),
            endDate: format(parseISO(endDate), 'yyyy-MM-dd'),
            data: siteRevenue,
            totals: {
                ...totals,
                netRevenuePercentage: overallNetRevenuePercentage
            },
            businessFeePerCut: BUSINESS_FEE_PER_CUT,
            commissionModel: 'fixed',
            message: 'Recaudo por sede calculado exitosamente.'
        });

    } catch (error) {
        console.error('❌ Error fetching revenue by site:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor.',
            error: error.message
        });
    }
};