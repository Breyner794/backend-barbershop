import Barber from "../../server/db/models/barber.js";
import Site from "../../server/db/models/site.js";

export const getAllBarber = async (req, res) => {
  try {
    const barber = await Barber.find().sort({ createdAt: -1 });

    if (barber.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No hay barberos creados en este momento 🔎.",
      });
    }

    res.status(200).json({
      success: true,
      count: barber.length,
      data: barber,
      message: "Barberos recuperados exitosamente ✅.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error General",
      error: error.message,
    });
  }
};

export const getByIdBarber = async (req, res) => {
  try {
    const { id } = req.params;
    const barber = await Barber.findById(id);

    if (barber.length === 0) {
      return res.status(400).json({
        success: false,
        message: `No se encontro el barbero por el id ${barber.id} creados en este momento 🔎.`,
      });
    }
    res.status(200).json({
      success: true,
      count: barber.length,
      data: barber,
      message: `Barbero recuperado por el Id ${barber.id} recuperado exitosamente ✅.`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};

export const createBarber = async (req, res) => {
  try {
    const newBarber = new Barber(req.body);
    const saveBarber = await newBarber.save();
    res.status(201).json({
      success: true,
      data: saveBarber,
      message: "Nuevo Barbero registrado exitosamente. ✅",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Datos inválidos",
      error: error.message,
    });
  }
};

export const updateBarber = async (req, res) => {
  try {
    const { site_barber } = req.body;

    const site_current_barber = await Site.findOne({ _id: site_barber });

    if (!site_current_barber) {
      return res.status(404).json({
        success: false,
        message: "Sede al que desea actualizar no existe",
      });
    }

    const updateBarber = await Barber.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        site_barber: site_current_barber._id,
      },
      {
        new: true,
        runValidators: true,
      }
    );
    if (!updateBarber) {
      return res.status(404).json({ message: "Barbero no encontrado. ❌" });
    }
    res.status(200).json({
      success: true,
      data: updateBarber,
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

export const deleteBarber = async (req, res) => {
  try {
    const { id } = req.params;
    const deleteBarber = await Barber.findByIdAndDelete(id);

    if (!deleteBarber) {
      return res.status(404).json({
        message: "Barbero no encontrado. ❌",
      });
    }
    res.status(200).json({
      data: deleteBarber,
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
