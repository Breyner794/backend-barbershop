import User from "../../server/db/models/user.js";
import Barber from "../../server/db/models/barber.js";

export const getAllUser = async (req, res) => {
    try{
        const user = await User.find().sort({creatAt: -1});

        if (user.length === 0){
            return res.status(400).json({
                success: false,
                message: "No hay usuarios creados en este momento 🔎.",
            });
        }

        res.status(200).json({
            success: true,
            count: user.length,
            data: user,
            message: "Usuarios recuperados exitosamente ✅.",
          });

        }catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
}

export const getByIdUser = async (req, res) => {
    try {
      const { id } = req.params;
      const user = await User.findById(id);
  
      if (user.length === 0) {
        return res.status(400).json({
          success: false,
          message: `No se encontro usuario por el id ${user.id} creados en este momento 🔎.`,
        });
      }
      res.status(200).json({
        success: true,
        count: user.length,
        data: user,
        message: `Barbero recuperado por el Id ${user.id} recuperado exitosamente ✅.`,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
        error: error.message,
      });
    }
  };

  export const createUser = async (req, res) => {
    try {
      const newUser = new User(req.body);
      const saveUser = await newUser.save();
      res.status(201).json({
        success: true,
        data: saveUser,
        message: `Nuevo usuario ${saveUser.email} registrado exitosamente. ✅`,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: "Datos inválidos",
        error: error.message,
      });
    }
  };

  export const updateUser = async (req, res) => {
    try {
      const { id_barber } = req.body;
  
      const current_barber = await Barber.findOne({ _id: id_barber });
  
      if (!current_barber) {
        return res.status(404).json({
          success: false,
          message: "Barbero al que desea actualizar no existe",
        });
      }
  
      const updateUser = await User.findByIdAndUpdate(
        req.params.id,
        {
          ...req.body,
          id_barber: current_barber._id,
        },
        {
          new: true,
          runValidators: true,
        }
      );
      if (!updateUser) {
        return res.status(404).json({ message: "Usuario no encontrado. ❌" });
      }
      res.status(200).json({
        success: true,
        data: updateUser,
        message: "Se actualizo el barbero exitosamente. ✅",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
        error: error.message,
      });
    }
  };

  export const deleteUser = async (req, res) => {
    try {
      const { id } = req.params;
      const deleteUser = await User.findByIdAndDelete(id);
  
      if (!deleteUser) {
        return res.status(404).json({
          message: "Barbero no encontrado. ❌",
        });
      }
      res.status(200).json({
        data: deleteUser,
        message: "Barbero eliminado correctamente ♻️",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
        error: error.message,
      });
    }
  };