import Reservation from "../../server/db/models/reservation.js";
import Barber from "../../server/db/models/barber.js";
import Site from "../../server/db/models/site.js";

export const getAllReservation = async (req, res) => {
    try{
        const reservation = await Reservation.find().sort({createdAt: -1});

        if (reservation.length === 0){
            return res.status(400).json({
                success:false,
                message: "No hay reservaciones creadas en este momento 🔎.",
            });
        }
        res.status(200).json({
            success: true,
            count: reservation.length,
            data: reservation,
            message: "Reservas recuperadas exitosamente ✅.",
          });

        }catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }    
}

export const createReservation = async (req, res) => {
    try{
        const newReservation = new Reservation(req.body);
        const saveReservation = await newReservation.save();
        res.status(201).json({
            success: true,
            data: saveReservation,
            message: "Nueva reserva registrada exitosamente.",
        });
        }catch (error) {
            res.status(400).json({
                success: false,
                message: 'Datos inválidos.',        
                error: error.message
            });
        }
}

export const updateReservation = async (req, res) => {
    try{
        const {site} = req.body;
        const {barber} = req.body;

        const site_update = await Site.findOne({_id: site});
        const barber_update = await Barber.findOne({_id: barber});

        if(!site_update){
            return res.status(404).json({
                success: false,
                message: "Sede al que desea actualizar no exite",
            });
        };

        if(!barber_update){
            return res.status(404).json({
                success: false,
                message: "Barbero al que desea actualizar no exite",
            });
        };

        const update_reservation = await Reservation.findByIdAndUpdate(
            req.params.id,
            {
                ...req.body,
                site: site_update._id,
                barber: barber_update._id,
            },
            {
                new:true,
                runValidators: true,
            }
        );

        if(!update_reservation){
            return res.status(404).json({message: "Reserva no encontrada. ❌"})
        }
        res.status(200).json({
            success: true,
            data: update_reservation,
            message: "Se actualizo correctamente la reserva. ✅"
        });

        }catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }    
}

export const deleteReservation = async (req, res) => {
  try {
    const { id } = req.params;
    const deleteReservation = await Reservation.findByIdAndDelete(id);

    if (!deleteReservation) {
      return res.status(404).json({
        message: "Reserva no encontrado. ❌",
      });
    }
    res.status(200).json({
      data: deleteReservation,
      message: "Reserva eliminada correctamente ♻️",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};
