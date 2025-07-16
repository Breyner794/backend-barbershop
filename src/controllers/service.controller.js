import Service from "../../server/db/models/Service.js";
import cloudinary from "../config/cloudinaryConfig.js";

const getPublicIdFromUrl = (url) => {
    // Ejemplo de URL: http://res.cloudinary.com/cloud_name/image/upload/v1678912345/folder/image_id.jpg
    // El public_id que necesitamos es "folder/image_id"
    const regex = /\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/;
    const match = url.match(regex);
    return match ? match[1] : null;
};

export const getAllServices = async (req, res) => {
  try {
    const services = await Service.find(
      {isActive : true}
    ).sort({ createdAt: -1 });

    if (services.length === 0) {
      return res.status(200).json({
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

export const getServicesDashboard = async (req, res) => {
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
   const {name, price, duration, description, isActive } = req.body;
   
   let imageUrl = '';

   if(req.file){
    console.log("Backend (createServices) - Archivo recibido:", req.file.originalname);
    try{
      const result = await cloudinary.uploader.upload(
        `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`,
        {
          folder: 'barberpro_services',
            transformation: [{ width: 600, height: 400, crop: "fill" }]
        });
        imageUrl = result.secure_url;
        console.log("Backend (createServices) - Imagen de servicio subida. URL:", imageUrl);
    }catch (uploadError){
      console.error("Backend (createServices) - Error al subir a Cloudinary:", uploadError);
        return res.status(500).json({
          success: false,
          message: 'Error al subir la imagen del servicio. Por favor, intenta de nuevo.'
        });
      }
   }

   const newService = new Service({
     name,
      description,
      price,
      duration,
      isActive,
      image_Url: imageUrl
   });

   const savedService = await newService.save();

   res.status(201).json({
      success: true,
      data: savedService,
      message: "Nuevo Servicio se creó exitosamente. ✅",
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
    const {id} = req.params;
    const updateData = {...req.body};

    if (req.file){
      console.log("Backend (updateServices) - Nuevo archivo recibido:", req.file.originalname);

      try{
        const existingService = await Service.findById(id);
        if(existingService && existingService. image_Url){
          const publicId = getPublicIdFromUrl(existingService.image_Url);
          if(publicId){
            console.log("Backend (updateServices) - Eliminando imagen antigua:", publicId);
            await cloudinary.uploader.destroy(publicId);
          }
        }
      }catch (deleteError){
         console.error("Backend (updateServices) - No se pudo eliminar la imagen antigua:", deleteError);
      }
      try{
        const result = await cloudinary.uploader.upload(
          `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`,
          {
            folder: "barberpro_services",
            transformation: [{ width: 600, height: 400, crop: "fill" }],
          }
        );
        updateData.image_Url = result.secure_url;
        console.log("Backend (updateServices) - Nueva imagen subida. URL:", result.secure_url);
      }catch(uploadError){
        console.error("Backend (updateServices) - Error al subir la nueva imagen:", uploadError);
        return res.status(500).json({
          success: false,
          message: "Error al subir la nueva imagen del servicio. Inténtalo de nuevo.",
        });
      }
    }
    const updatedService = await Service.findByIdAndUpdate(id, updateData, {
      new:true,
      runValidators: true,
    });

    if (!updatedService) {
      return res.status(404).json({
        success: false,
        message: "Servicio no encontrado. ❌",
      });
    }

    res.status(200).json({
      success: true,
      data: updatedService,
      message: "Se actualizó el registro exitosamente. ✅",
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

      const serviceToDelete = await Service.findById(id);

      if(!serviceToDelete){
        return res.status(404).json({ message: "Servicio no encontrado. ❌" });
      }

      if(serviceToDelete.image_Url){
        const publicId = getPublicIdFromUrl(serviceToDelete.image_Url);
        if(publicId){
          console.log("Eliminando imagen de servicio de Cloudinary:", publicId);
          await cloudinary.uploader.destroy(publicId);
        }
      }

    const deleteServices = await Service.findByIdAndDelete(id);

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
