import Service from "../../server/db/models/Service.js";

export const getAllServices = async (req, res) => {
  try {
    const services = await Service.find().sort({ createdAt: -1 });

    if (services.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No hay servicios creados en este momento 🔎.",
      });
    }
    res.status(200).json({
      success: true,
      count: services.length,
      data: services,
      message: "Servicios recuperados exitosamente ✅.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};

/*Busqueda por id*/

export const getByIdServices = async (req, res) => {
  try {
    const { id } = req.params;
    const service = await Service.findById(id);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Servicio no encontrado con el ID proporcionado 🔎.",
      });
    }
    res.status(200).json({
      success: true,
      count: 1,
      data: service,
      message: "Servicios recuperados exitosamente ✅.",
    });
  } catch (error) {
    if(error.name === 'CastError'){
      return res.status(400).json({
        success: false,
        message: "ID de servicio con formato inválido.",
      });
    }
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};

/*Crear un servicio.*/
export const createServices = async (req, res) => {
  try {
    const newservices = new Service(req.body);
    const saveServices = await newservices.save();
    res.status(201).json({
      success: true,
      data: saveServices,
      message: "Nuevo Servicio se creo exitosamente. ✅",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Datos inválidos",
      error: error.message,
    });
  }
};

/*Actualizar un servicio*/

export const updateServices = async (req, res) => {
  try {
    const { id } = req.params;
    const updateServices = await Service.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updateServices) {
      return res.status(404).json({
        message: "Servicio no encontrado. ❌" 
      });
    }
    res.status(200).json({
      success: true,
      data: updateServices,
      message: "Se actualizo el registro exitosamente. ✅",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};

/*Eliminar servicio.*/

export const deleteServices = async (req, res) => {
  try {
    const { id } = req.params;
    const deleteServices = await Service.findByIdAndDelete(id);

    if (!deleteServices) {
      return res.status(404).json({
        message: "Servicio no encontrado. ❌",
      });
    }
    res.status(200).json({
      data: deleteServices,
      message: "Servicio eliminado correctamente ♻️",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error General",
      error: error.message,
    });
  }
};
