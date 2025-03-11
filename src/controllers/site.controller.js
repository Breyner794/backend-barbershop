import Site from "../../server/db/models/site.js";

/*Buscar todos los servicios creados.*/

export const getAllSite = async (req, res) => {
  try {
    const site = await Site.find().sort({ createAt: -1 });

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
