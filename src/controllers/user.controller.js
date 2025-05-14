import User from "../../server/db/models/user.js";
import Barber from "../../server/db/models/barber.js";

export const getMe = (req, res, next) => {
  
  res.status(200).json({
    status: 'success',
    data: {
      user: req.user 
      
    }
  });
};

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
      const { id } = req.params;
      const { name, phone, email, password, role, id_barber, isActive } = req.body;
  
      const userToUpdate = await User.findById(id);
      if (!userToUpdate) {
        return res.status(404).json({ message: "Usuario no encontrado. ❌" });
      }
  
      // Actualizar los campos básicos
      if (name) userToUpdate.name = name;
      if (phone) userToUpdate.phone = phone;
      if (email) userToUpdate.email = email;
      if (password) userToUpdate.password = password;
      if (isActive !== undefined) userToUpdate.isActive = isActive;
  
      // Manejar la actualización del rol y el id_barber condicionalmente
      if (role) {
        userToUpdate.role = role;
        if (role !== 'barbero') {
          userToUpdate.id_barber = undefined;
        } else if (id_barber) {
          const current_barber = await Barber.findOne({ _id: id_barber });
          if (!current_barber) {
            return res.status(404).json({
              success: false,
              message: "El barbero especificado no existe.",
            });
          }
          userToUpdate.id_barber = current_barber._id;
        } else if (role === 'barbero' && !userToUpdate.id_barber) {
          console.warn(`ADVERTENCIA: Intentando actualizar usuario ${id} a barbero sin proporcionar id_barber.`);
          
        }
      } else if (id_barber && userToUpdate.role === 'barbero') {
        // Si no se cambia el rol pero se proporciona un id_barber, actualizarlo
        const current_barber = await Barber.findOne({ _id: id_barber });
        if (!current_barber) {
          return res.status(404).json({
            success: false,
            message: "El barbero especificado no existe.",
          });
        }
        userToUpdate.id_barber = current_barber._id;
      } else if (id_barber === null || id_barber === undefined) {
          userToUpdate.id_barber = undefined;
      }
  
      const updatedUser = await userToUpdate.save({ runValidators: true });
      res.status(200).json({
        success: true,
        data: updatedUser,
        message: "Usuario actualizado exitosamente. ✅",
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