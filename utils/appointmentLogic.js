import Appointment from "../server/db/models/appoiment.js";

export const closeOldUntouchedAppointments = async (req, res) => {

    try{
        //Obtener la fecha del dia de hoy...
        const today = new Date();
        today.setHours(0,0,0,0);

        console.log (`Buscando citas anteriores a ${today.toISOString()} para cerrar...`);

        const filter ={
            date: {$lt: today},
            status: {$in: ["pendiente", "confirmada"]}
        }

        const update = {
            $set: {
                status: "no-asistio", //se puede cambiar el estado al que se va actualizar..
                notes: "Reserva cerrada automáticamente por inactividad post-fecha."
            }
        }

        const result = await Appointment.updateMany(filter, update);

        if (result.modifiedCount > 0){
            console.log(`Tarea completada: ${result.modifiedCount} reservas antiguas han sido cerradas.`);
        } else {
            console.log("Tarea completada: No se encontraron reservas antiguas para cerrar.");
        }

    }catch (error){
        console.error("Error durante la tarea programada de cierre de reservas:", error);
    }
}