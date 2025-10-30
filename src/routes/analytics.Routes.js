import express from 'express';
import { protect, restrictTo } from '../controllers/auth.Controller.js';
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

router.use(protect);

// Ruta para obtener el número de reservas por día en un rango de fechas
router.get('/analytics/daily-bookings', getDailyBookings); //para todo los usuarios.

// Ruta para obtener el conteo de reservas por estado (confirmada, cancelada, etc.)
//router.get('/analytics/bookings-by-status', getBookingsByStatus);

// Ruta para obtener los servicios más populares
//router.get('/analytics/top-services', getTopServices);

// Ruta para obtener los barberos con más reservas
//router.get('/analytics/top-barbers', getTopBarbers);

// Ruta para obtener la tasa de ocupación por barberos o sedes
router.get('/analytics/occupancy-rate', getOccupancyRate);

// Ruta para identificar clientes recurrentes
router.route('/analytics/recurring-clients') .get(restrictTo("admin", "superadmin"), getRecurringClients);

// Ruta para el recaudacion por fecha.
router.route('/analytics/revenue-by-date-range') .get(restrictTo("admin", "superadmin"), getRevenueByDateRange);

//Ruta para el recaudo por barbero. o servicio
router.route('/analytics/revenue-by-barber-or-service') .get(restrictTo("admin", "superadmin", "barbero"), getRevenueByBarberOrService);

//Ruta para identificar servicios activos o inactivos
router.get('/analytics/service-status', getServiceStatus); //para todo los usuarios, menos clientes claramente.

//Ruta para obtener las reservas cancelados o no asistidas.
router.get('/analytics/cancellation-rate', getCancellationRate);

// Ruta para el desglose de ingresos por barbero
router.route('/analytics/revenue/breakdown') .get(restrictTo("admin","superadmin"), getRevenueBreakdownByBarber);

// Ruta para la ganancia neta del negocio (descontando comisiones)
router.route('/analytics/revenue/net') .get(restrictTo("admin", "superadmin"), getNetRevenueByDateRange);

router.route('/analytics/revenue-by-site') .get(restrictTo("admin", "superadmin"), getRevenueBySite);

export default router;