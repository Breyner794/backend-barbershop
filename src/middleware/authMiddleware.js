import Appointment from "../../server/db/models/appoiment.js";

export const canUpdateAppointment = async (req, res, next) => {
    try {
        const appointment = await Appointment.findById(req.params.appointmentId);
        if (!appointment) {
            return res.status(404).json({ success: false, message: "Reserva no encontrada." });
        }
        
        req.appointment = appointment; 

        const isHistorical = ["completada", "cancelada", "no-asistio"].includes(appointment.status);
        const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';

        if (isHistorical){
            if (isAdmin){
                return next();
            }else {
                 return res.status(403).json({ 
                    success: false, 
                    message: `Acceso denegado. Una cita '${appointment.status}' no puede ser modificada por este rol.` 
                });
            }
        }

        if ( isAdmin || appointment.barberId.toString() === req.user._id.toString()) {
            next(); // Es admin O es el barbero asignado. Permitido.
        } else {
            return res.status(403).json({ success: false, message: "Acceso denegado. No tienes permiso para modificar esta reserva." });
        }

    } catch (error) {
        return res.status(500).json({ success: false, message: "Error de servidor al verificar permisos." });
    }
};

export const isOwnerOrAdmin = (req, res, next) => {
    
    if (req.user.role === 'admin' || req.user.role === 'superadmin' || req.user._id.toString() === req.params.barberId.toString()) {
        next(); 
    } else {
        return res.status(403).json({ success: false, message: "Acceso denegado. No tienes permiso para ver estos recursos." });
    }
};