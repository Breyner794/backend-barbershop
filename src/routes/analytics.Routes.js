import express from 'express';
import {
  getDailyBookings,
  getBookingsByStatus,
  getTopServices,
  getTopBarbers,
  getOccupancyRate,
  getRecurringClients,
  getRevenueByDateRange,
  getRevenueByBarberOrService,
  getServiceStatus,
  getCancellationRate,
  getRevenueBreakdownByBarber,
  getNetRevenueByDateRange,
  getRevenueBySite

} from '../controllers/analyticsController.js';

const router = express.Router();

// Ruta para obtener el número de reservas por día en un rango de fechas
router.get('/analytics/daily-bookings', getDailyBookings);

// Ruta para obtener el conteo de reservas por estado (confirmada, cancelada, etc.)
router.get('/analytics/bookings-by-status', getBookingsByStatus);

// Ruta para obtener los servicios más populares
router.get('/analytics/top-services', getTopServices);

// Ruta para obtener los barberos con más reservas
router.get('/analytics/top-barbers', getTopBarbers);

// Ruta para obtener la tasa de ocupación por barberos o sedes
router.get('/analytics/occupancy-rate', getOccupancyRate);

// Ruta para identificar clientes recurrentes
router.get('/analytics/recurring-clients', getRecurringClients);

// Ruta para el recaudacion por fecha.
router.get('/analytics/revenue-by-date-range', getRevenueByDateRange);

//Ruta para el recaudo por barbero. o servicio
router.get('/analytics/revenue-by-barber-or-service', getRevenueByBarberOrService);

//Ruta para identificar servicios activos o inactivos
router.get('/analytics/service-status', getServiceStatus);

//Ruta para obtener las reservas cancelados o no asistidas.
router.get('/analytics/cancellation-rate', getCancellationRate);

// Ruta para el desglose de ingresos por barbero
router.get('/analytics/revenue/breakdown', getRevenueBreakdownByBarber);

// Ruta para la ganancia neta del negocio (descontando comisiones)
router.get('/analytics/revenue/net', getNetRevenueByDateRange);

router.get('/analytics/revenue-by-site', getRevenueBySite);

export default router;