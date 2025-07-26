import cron from "node-cron"
import { closeOldUntouchedAppointments } from "../../utils/appointmentLogic.js"

export const scheduleTasks = () => {
    console.log ("Scheduler iniciado. Esperando para ejecutar tareas programadas.")

    cron.schedule('0 18 * * *', () => {
        console.log('-------------------------------------');
        console.log(`Ejecutando tarea programada a las ${new Date().toLocaleDateString('es-CO')}`);
        closeOldUntouchedAppointments();
    },{
        schedule: true,
        timezone: "America/Bogota"
    })
}