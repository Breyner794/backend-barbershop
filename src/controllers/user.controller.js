import User from "../../server/db/models/user.js";
import Site from "../../server/db/models/site.js"; // Asumiendo que tienes el modelo Site

export const getMe = (req, res, next) => {
  res.status(200).json({
    status: 'success',
    data: {
      user: req.user 
    }
  });
};

export const getAllUser = async (req, res) => {
  try {
    // Poblamos la referencia site_barber para obtener información completa
    const users = await User.find()
      .populate('site_barber', 'name_site') // Ajusta los campos según tu modelo Site
      .sort({ createdAt: -1 });

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No hay usuarios creados en este momento 🔎.",
      });
    }

    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
      message: "Usuarios recuperados exitosamente ✅.",
    });

  } catch (error) {
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
    
    const user = await User.findById(id)
      .populate('site_barber', 'name address');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: `No se encontró usuario con el id ${id} 🔎.`,
      });
    }

    res.status(200).json({
      success: true,
      data: user,
      message: `Usuario recuperado exitosamente ✅.`,
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
    const { name, last_name, phone, email, password, role, site_barber, imageUrl } = req.body;

    // Validaciones específicas según el rol
    if (role === 'barbero') {
      if (!last_name) {
        return res.status(400).json({
          success: false,
          message: "El apellido es requerido para barberos",
        });
      }
      
      if (!site_barber) {
        return res.status(400).json({
          success: false,
          message: "El sitio de barbería es requerido para barberos",
        });
      }

      // Verificar que el sitio existe
      const siteExists = await Site.findById(site_barber);
      if (!siteExists) {
        return res.status(404).json({
          success: false,
          message: "El sitio de barbería especificado no existe",
        });
      }
    }

    // Verificar si el email ya existe
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Ya existe un usuario con este email",
      });
    }

    const userData = {
      name,
      phone,
      email,
      password,
      role,
      imageUrl,
      isActive: true
    };

    // Solo agregar campos específicos si el rol lo requiere
    if (role === 'barbero') {
      userData.last_name = last_name;
      userData.site_barber = site_barber;
    }

    const newUser = new User(userData);
    const savedUser = await newUser.save();

    // Poblar la referencia antes de enviar la respuesta
    await savedUser.populate('site_barber', 'name_site');

    res.status(201).json({
      success: true,
      data: savedUser,
      message: `Nuevo usuario ${savedUser.email} registrado exitosamente. ✅`,
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Error al crear usuario",
      error: error.message,
    });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, last_name, phone, email, password, role, site_barber, imageUrl, isActive } = req.body;

    const userToUpdate = await User.findById(id);
    if (!userToUpdate) {
      return res.status(404).json({ 
        success: false,
        message: "Usuario no encontrado. ❌" 
      });
    }

    // Verificar email único si se está actualizando
    if (email && email !== userToUpdate.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Ya existe un usuario con este email",
        });
      }
    }

    // Actualizar campos básicos
    if (name) userToUpdate.name = name;
    if (phone !== undefined) userToUpdate.phone = phone;
    if (email) userToUpdate.email = email;
    if (password) userToUpdate.password = password; // El pre-save hook se encargará del hash
    if (imageUrl !== undefined) userToUpdate.imageUrl = imageUrl;
    if (isActive !== undefined) userToUpdate.isActive = isActive;

    // Manejar la actualización del rol y campos relacionados
    if (role && role !== userToUpdate.role) {
      userToUpdate.role = role;
      
      if (role === 'barbero') {
        // Si se cambia a barbero, validar campos requeridos
        if (!last_name && !userToUpdate.last_name) {
          return res.status(400).json({
            success: false,
            message: "El apellido es requerido para barberos",
          });
        }
        if (!site_barber && !userToUpdate.site_barber) {
          return res.status(400).json({
            success: false,
            message: "El sitio de barbería es requerido para barberos",
          });
        }
        
        if (last_name) userToUpdate.last_name = last_name;
        if (site_barber) {
          // Verificar que el sitio existe
          const siteExists = await Site.findById(site_barber);
          if (!siteExists) {
            return res.status(404).json({
              success: false,
              message: "El sitio de barbería especificado no existe",
            });
          }
          userToUpdate.site_barber = site_barber;
        }
      } else {
        // Si se cambia a otro rol, limpiar campos específicos de barbero
        userToUpdate.last_name = undefined;
        userToUpdate.site_barber = undefined;
      }
    } else if (userToUpdate.role === 'barbero') {
      // Si ya es barbero y se actualizan campos específicos
      if (last_name !== undefined) userToUpdate.last_name = last_name;
      if (site_barber) {
        const siteExists = await Site.findById(site_barber);
        if (!siteExists) {
          return res.status(404).json({
            success: false,
            message: "El sitio de barbería especificado no existe",
          });
        }
        userToUpdate.site_barber = site_barber;
      }
    }

    const updatedUser = await userToUpdate.save({ runValidators: true });
    await updatedUser.populate('site_barber', 'name_site');

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
    const deletedUser = await User.findByIdAndDelete(id);

    if (!deletedUser) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado. ❌",
      });
    }

    res.status(200).json({
      success: true,
      data: deletedUser,
      message: "Usuario eliminado correctamente ♻️",
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};

// Función adicional para obtener usuarios por rol
export const getUsersByRole = async (req, res) => {
  try {
    const { role } = req.params;
    
    if (!['admin', 'barbero', 'recepcionista', 'superadmin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Rol no válido",
      });
    }

    const users = await User.find({ role, isActive: true })
      .populate('site_barber', 'name_site')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
      message: `Usuarios con rol ${role} recuperados exitosamente ✅.`,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};

// Función para obtener barberos de un sitio específico
export const getBarbersBySite = async (req, res) => {
  try {
    const { siteId } = req.params;

    const barbers = await User.find({ 
      role: 'barbero', 
      site_barber: siteId,
      isActive: true 
    })
    .populate('site_barber', 'name_site')
    .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: barbers.length,
      data: barbers,
      message: "Barberos del sitio recuperados exitosamente ✅.",
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};