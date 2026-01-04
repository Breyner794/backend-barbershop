/**
 * Retorna la fecha actual formateada como YYYY-MM-DD 
 * garantizando que sea la fecha de Colombia, no del servidor.
 */
export const getTodayColombiaString = () => {
  const now = new Date();
  // Convertimos a string en zona horaria de Colombia y extraemos la fecha
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(now); // Retorna "2026-01-03"
};

/**
 * Crea un objeto Date de JS que representa la medianoche de Colombia (05:00 UTC)
 * Evita el uso de strings con T00:00:00 que pueden fallar por la zona local del server.
 */
export const createColombianDate = (dateString) => {
  const [year, month, day] = dateString.split('-').map(Number);
  // Creamos la fecha tratando los números como UTC directamente
  // Para Colombia (UTC-5), el inicio del día es a las 05:00:00 UTC
  return new Date(Date.UTC(year, month - 1, day, 5, 0, 0));
};

export const getDayOfWeek = (dateString) => {
  const date = createColombianDate(dateString);
  return date.getUTCDay(); // Usamos UTC para que sea consistente con createColombianDate
};

export const getDateRangeInColombia = (dateString) => {
  const startOfDay = createColombianDate(dateString);
  const endOfDay = new Date(startOfDay);
  // El fin del día es 23:59:59 en Colombia (que son las 04:59:59 del día siguiente UTC)
  endOfDay.setUTCHours(endOfDay.getUTCHours() + 23, 59, 59, 999);
  
  return { startOfDay, endOfDay };
};