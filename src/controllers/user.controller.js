import User from "../../server/db/models/user.js";
import Site from "../../server/db/models/site.js";

/* --- FUNCIONES PARA EL PROPIO USUARIO (AUTENTICADO) --- */

export const getMyProfile = (req, res) => {
  res.status(200).json({
    status: true,
    data: req.user.getPublicProfile()
  });
};

export const updateMyProfile = async (req,res) =>{
  try{
    //solo se actualizara campos no comprometederos.
    const {name, last_name, phone, imageUrl} = req.body;
    const filteredBody = {name, last_name, phone, imageUrl};

    const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
            new: true,
            runValidators: true
        });

        res.status(200).json({
          success: true,
          message: "Perfil actualizado exitosamente",
          data: updatedUser.getPublicProfile()
        })
  }catch (error){
    res.status(400).json({ 
      success: false, 
      message: 'Error al actualizar el perfil', 
      /*error: error.message*/ });
  }
}

// Cambiar la contraseña del usuario logueado
export const changeMyPassword = async (req, res) => {
  try{

    const {currentPassword, newPassword} = req.body

    const user = await User.findById(req.user.id).select('+password');
    if (!(await user.comparePassword(currentPassword))){
      return res.status(400).json({ 
        success: false, 
        message: 'La contraseña actual es incorrecta.' });
    }
    user.password = newPassword;
    await user.save();

    res.json({ 
      success: true,
      message: 'Contraseña cambiada exitosamente.'
    });
  }catch (error){

  }
}

/* --- FUNCIONES ADMINISTRATIVAS (SOLO PARA ADMIN/SUPERADMIN) --- */

export const getAllUser = async (req, res) => {
  try {
    
    const { role, isActive, page = 1, limit = 10, search = '' } = req.query;
    const filters = {};
    if(role) filters.role = role;
    if (isActive !== undefined) filters.isActive = isActive === 'true';
    if(search){
      filters.$or = [
        {name: { $regex: search, $options: 'i'} },
        { last_name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(filters)
    .populate('site_barber', 'name_site')
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort({ createdAt: -1 });

    const total = await User.countDocuments(filters);

    res.status(200).json({
            success: true,
            data: users.map(u => u.getPublicProfile()),
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalUsers: total,
            }
        });

  } catch (error) {
     res.status(500).json({ 
      success: false, 
      message: 'Error al obtener usuarios.', 
      error: error.message });
  }
}

export const getUserById = async (req, res) => {
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

/**
 * @desc    Crear un nuevo usuario. La lógica de permisos varía según el rol del creador.
 * @route   POST /api/users/admin/create  (Ejemplo de ruta)
 * @access  Admin, Superadmin
 */

export const createUser = async (req, res) => {
    try {
        const requesterRole = req.user.role; // Rol del usuario que está haciendo la petición (viene del middleware 'protect')
        const { name, last_name, phone, email, password, role, site_barber } = req.body;

        // --- VALIDACIÓN DE PERMISOS POR ROL ---
        // Si el que crea es un 'admin', validamos qué rol quiere asignar.
        if (requesterRole === 'admin') {
            const allowedRoles = ['barbero', 'recepcionista'];
            if (!allowedRoles.includes(role)) {
                return res.status(403).json({ // 403 Forbidden: Sabes quién soy, pero no tienes permiso
                    success: false,
                    message: 'Permiso denegado. Los administradores solo pueden crear usuarios con rol de "barbero" o "recepcionista".'
                });
            }
        }
        // Si el rol es 'superadmin', esta validación se omite y puede crear cualquier rol.

        // --- VALIDACIÓN DE DATOS ---
        if (role === 'barbero' && !site_barber) {
            return res.status(400).json({ 
              success: false, 
              message: 'El sitio de barbería es requerido para los barberos.'
            });
        }
        const siteExists = await Site.findById(site_barber);

       if (!siteExists) {
         return res.status(404).json({
           success: false,
           message: "El sitio de barbería especificado no existe",
         });
       }

        // --- CREACIÓN DEL USUARIO ---
        const newUser = await User.create({
            name,
            last_name,
            phone,
            email,
            password, // El hook 'pre-save' se encarga del hash
            role,
            site_barber: role === 'barbero' ? site_barber : undefined
        });

        res.status(201).json({
            success: true,
            message: `Usuario "${newUser.name}" con rol de "${newUser.role}" creado exitosamente.`,
            data: newUser.getPublicProfile()
        });

    } catch (error) {
        if (error.code === 11000) { // Error de email duplicado
            return res.status(400).json({ success: false, message: 'Ya existe un usuario con este email.' });
        }
        res.status(400).json({ success: false, message: 'Error al crear el usuario.', error: error.message });
    }
};

// export const createUser = async (req, res) => {
//   try {
//     const { name, last_name, phone, email, password, role, site_barber, imageUrl } = req.body;

//     // Validaciones específicas según el rol
//     if (role === 'barbero') {
//       if (!site_barber) {
//         return res.status(400).json({
//           success: false,
//           message: "El sitio de barbería es requerido para barberos",
//         });
//       }

//       // Verificar que el sitio existe
//       const siteExists = await Site.findById(site_barber);

//       if (!siteExists) {
//         return res.status(404).json({
//           success: false,
//           message: "El sitio de barbería especificado no existe",
//         });
//       }
//     }

//     // Verificar si el email ya existe
//     const existingUser = await User.findOne({ email });
//     if (existingUser) {
//       return res.status(400).json({
//         success: false,
//         message: "Ya existe un usuario con este email",
//       });
//     }

//     const userData = {
//       name,
//       last_name,
//       phone,
//       email,
//       password,
//       role,
//       imageUrl,
//       isActive: true
//     };

//     // Solo agregar campos específicos si el rol lo requiere
//     if (role === 'barbero') {
//       userData.site_barber = site_barber;
//     }

//     const newUser = new User(userData);
//     const savedUser = await newUser.save();

//     // Poblar la referencia antes de enviar la respuesta
//     await savedUser.populate('site_barber', 'name_site');

//     res.status(201).json({
//       success: true,
//       message: `Nuevo usuario ${savedUser.email} registrado exitosamente. ✅`,
//       data: savedUser.getPublicProfile(), //Funcion para que no devuelva todo los datos delicados
//     });

//   } catch (error) {
//      if (error.code === 11000) {
//             return res.status(400).json({ 
//               success: false, 
//               message: 'Ya existe un usuario con este email.' });
//         }
//         res.status(400).json({ 
//           success: false, 
//           message: 'Error al crear el usuario.', 
//           error: error.message });
//   }
// };

/**
 * @desc    Actualización segura de usuario por un Admin.
 * @route   PATCH /api/users/admin/update/:id
 * @access  Admin, Superadmin
 */

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    // El admin solo puede cambiar estos campos. No puede cambiar el ROL.
    const { name, last_name, phone, imageUrl, isActive, site_barber } =
      req.body;
    const updateData = {
      name,
      last_name,
      phone,
      imageUrl,
      isActive,
      site_barber,
    };

    // Prevenir que un admin cambie el rol directamente con esta función
    if (req.body.role) {
      return res
        .status(403)
        .json({
          success: false,
          message:
            "Los administradores no pueden cambiar roles desde esta ruta.",
        });
    }

    const updatedUser = await User.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedUser) {
      return res
        .status(404)
        .json({ success: false, message: "Usuario no encontrado." });
    }
    res
      .status(200)
      .json({
        success: true,
        message: "Usuario actualizado.",
        data: updatedUser.getPublicProfile(),
      });
  } catch (error) {
    res
      .status(400)
      .json({
        success: false,
        message: "Error al actualizar usuario.",
        error: error.message,
      });
  }
};

/**
 * @desc    Desactivar un usuario (borrado suave).
 * @route   DELETE /api/users/admin/delete/:id
 * @access  Admin, Superadmin
 */

export const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, {
      isActive: false,
    });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "Usuario no encontrado." });
    }
    res
      .status(200)
      .json({ success: true, message: "Usuario desactivado exitosamente." });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        message: "Error al desactivar usuario.",
        error: error.message,
      });
  }
};

/* --- FUNCIONES EXCLUSIVAS PARA ROL 'SUPERADMIN' --- */

/**
 * @desc    Actualización completa y avanzada de un usuario por un Superadmin.
 * @route   PATCH /api/users/superadmin/update/:id
 * @access  Superadmin
 */

export const superUpdateUser = async (req, res) => {
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
    if (last_name) userToUpdate.last_name = last_name;
    if (phone !== undefined) userToUpdate.phone = phone;
    //if (email) userToUpdate.email = email;
    if (password) userToUpdate.password = password; // El pre-save hook se encargará del hash
    if (imageUrl !== undefined) userToUpdate.imageUrl = imageUrl;
    if (isActive !== undefined) userToUpdate.isActive = isActive;

    // Manejar la actualización del rol y campos relacionados
    if (role && role !== userToUpdate.role) {
      userToUpdate.role = role;
      
      if (role === 'barbero') {
        // Si se cambia a barbero, validar campos requeridos
        if (!site_barber && !userToUpdate.site_barber) {
          return res.status(400).json({
            success: false,
            message: "El sitio de barbería es requerido para barberos",
          });
        }
        
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
        userToUpdate.site_barber = undefined;
      }
    } else if (userToUpdate.role === 'barbero') {
      // Si ya es barbero y se actualizan campos específicos
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

/**
 * @desc    Eliminación permanente de un usuario de la BD.
 * @route   DELETE /api/users/superadmin/delete/:id
 * @access  Superadmin
 */

export const hardDeleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedUser = await User.findByIdAndDelete(id);

    if (!deletedUser) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado. ❌",
      });
    }

    // res.status(200).json({
    //   success: true,
    //   data: deletedUser,
    //   message: "Usuario eliminado correctamente ♻️",
    // });

    res.status(204).send(); // 204 No Content, no hay cuerpo en la respuesta

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error en el borrado permanente.', 
      error: error.message
    });
  }
};

// Función adicional para obtener usuarios por rol
// export const getUsersByRole = async (req, res) => {
//   try {
//     const { role } = req.params;
    
//     if (!['admin', 'barbero', 'recepcionista', 'superadmin'].includes(role)) {
//       return res.status(400).json({
//         success: false,
//         message: "Rol no válido",
//       });
//     }

//     const users = await User.find({ role, isActive: true })
//       .populate('site_barber', 'name_site')
//       .sort({ createdAt: -1 });

//     res.status(200).json({
//       success: true,
//       count: users.length,
//       data: users,
//       message: `Usuarios con rol ${role} recuperados exitosamente ✅.`,
//     });

//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: "Error interno del servidor",
//       error: error.message,
//     });
//   }
// };

// Función para obtener barberos de un sitio específico
// export const getBarbersBySite = async (req, res) => {
//   try {
//     const { siteId } = req.params;

//     const barbers = await User.find({ 
//       role: 'barbero', 
//       site_barber: siteId,
//       isActive: true 
//     })
//     .populate('site_barber', 'name_site')
//     .sort({ createdAt: -1 });

//     res.status(200).json({
//       success: true,
//       count: barbers.length,
//       data: barbers,
//       message: "Barberos del sitio recuperados exitosamente ✅.",
//     });

//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: "Error interno del servidor",
//       error: error.message,
//     });
//   }
// };