import Site from "../../server/db/models/site.js";
import User from "../../server/db/models/user.js";

/*Buscar todos los servicios creados.*/

export const getAllSite = async (req, res) => {
  try {
    const site = await Site.find().sort({ createdAt: -1 });

    if (site.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No hay sedes creados en este momento 🔎.",
      });
    }
    res.status(200).json({
      success: true,
      count: site.length,
      data: site,
      message: "Sedes recuperados exitosamente ✅.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error General",
      error: error.message,
    });
  }
};

/*Busqueda por id*/

export const getByIdSite = async (req, res) => {
  try {
    const { id } = req.params;
    const site = await Site.findById(id);

    if (!site) {
      return res.status(404).json({
        success: false,
        message: "No se encontró una sede con ese ID 🔎.",
      });
    }
    res.status(200).json({
      success: true,
      data: site,
      message: `Sede recuperada exitosamente (${site.name_site}) ✅`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};

/*Crear un sitio.*/

export const createSite = async (req, res) => {
  try {
    const newSite = new Site(req.body);
    const saveSite = await newSite.save();
    res.status(201).json({
      success: true,
      data: saveSite,
      message: "Nueva sede se ha exitosamente. ✅",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Datos inválidos",
      error: error.message,
    });
  }
};

/*Actualizar una sede*/

export const updateSite = async (req, res) => {
  try {
    const { id } = req.params;
    const updateSite = await Site.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updateSite) {
      return res.status(404).json({ message: "Sede no encontrada. ❌" });
    }
    res.status(200).json({
      success: true,
      data: updateSite,
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

export const deleteSite = async (req, res) => {
  try {
    const { id } = req.params;
    const deleteSite = await Site.findByIdAndDelete(id);

    if (!deleteSite) {
      return res.status(404).json({
        message: "Sede no encontrada. ❌",
      });
    }
    res.status(200).json({
      data: deleteSite,
      message: "Sede eliminada correctamente ♻️",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error General",
      error: error.message,
    });
  }
};

export const getBarbersBySite = async (req, res) => {
  try {
    const { siteId } = req.params;

    // Consulta correcta - filtrar barberos por sede
    const barbers = await User.find({ 
      site_barber: siteId,
      role: "barbero" // Opcional: asegurarte que solo sean barberos
    })
    .populate('site_barber', {name_site: 1}) 
    .select('name last_name phone site_barber role'); 

    if (!barbers) {
      return res.status(200).json({
        success: false,
        message: "No se encontraron barberos en esta sede... 🔎",
      });
    }

    res.status(200).json({
      success: true,
      count: barbers.length,
      data: barbers,
      message: `Barberos de la sede recuperados exitosamente ✅.`,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};