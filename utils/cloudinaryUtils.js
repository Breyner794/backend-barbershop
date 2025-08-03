import cloudinary from "../src/config/cloudinaryConfig.js";

/**
 * Extrae el public_id de una URL de Cloudinary
 * @param {string} url - URL de Cloudinary
 * @returns {string|null} - public_id o null si no se puede extraer
 */

export const getPublicIdFromUrl = (url) => {
  try {
    if (!url || typeof url !== "string") return null;
    const matches = url.match(/\/v\d+\/(.+)\./);
    return matches ? matches[1] : null;
  } catch (error) {
    console.error("Error al extraer public_id de la URL:", error);
    return null;
  }
};

/**
 * Elimina una imagen de Cloudinary
 * @param {string} imageUrl - URL de la imagen a eliminar
 * @param {string} contexto - Contexto para logging (opcional)
 * @returns {Promise<Object|null>} - Resultado de la eliminación o null
 */

export const eliminarImagenCloudinary = async (imageUrl, contexto = "") => {
  try {
    if (!imageUrl) {
      console.log(`Backend - No hay imagen que eliminar (${contexto})`);
      return null;
    }

    const publicId = getPublicIdFromUrl(imageUrl);
    if (!publicId) {
      console.warn(
        `Backend - No se pudo extraer public_id de: ${imageUrl} (${contexto})`
      );
      return null;
    }

    const deleteResult = await cloudinary.uploader.destroy(publicId);

    if (deleteResult.result === "ok") {
      console.log(`Backend - ✅ Imagen eliminada exitosamente (${contexto}):`, {
        publicId,
        result: deleteResult.result,
      });
    } else {
      console.warn(
        `Backend - ⚠️ Imagen no encontrada en Cloudinary (${contexto}):`,
        {
          publicId,
          result: deleteResult.result,
        }
      );
    }

    return deleteResult;
  } catch (deleteError) {
    console.error(
      `Backend - ❌ Error al eliminar imagen (${contexto}):`,
      deleteError
    );
    return null;
  }
};

/**
 * Sube una imagen a Cloudinary con configuración estándar
 * @param {Object} file - Archivo de Multer
 * @param {string} folder - Carpeta en Cloudinary (opcional)
 * @param {Object} transformation - Transformaciones específicas (opcional)
 * @returns {Promise<Object>} - Resultado de la subida
 */

export const subirImagenCloudinary = async (
  file,
  folder = "barberpro_avatars",
  transformation = null
) => {
  try {
    const defaultTransformation = [
      { width: 200, height: 200, crop: "fill", gravity: "face" },
    ];

    const result = await cloudinary.uploader.upload(
      `data:${file.mimetype};base64,${file.buffer.toString("base64")}`,
      {
        folder,
        transformation: transformation || defaultTransformation,
      }
    );

    console.log(
      `Backend - ✅ Imagen subida exitosamente a ${folder}:`,
      result.secure_url
    );
    return result;
  } catch (error) {
    console.error(`Backend - ❌ Error al subir imagen a ${folder}:`, error);
    throw error;
  }
};

/**
 * Reemplaza una imagen: elimina la anterior y sube la nueva
 * @param {Object} file - Nuevo archivo de Multer
 * @param {string} oldImageUrl - URL de la imagen anterior
 * @param {string} folder - Carpeta en Cloudinary
 * @param {string} contexto - Contexto para logging
 * @returns {Promise<string>} - Nueva URL de la imagen
 */

export const reemplazarImagenCloudinary = async (
  file,
  oldImageUrl,
  folder = "barberpro_avatars",
  contexto = ""
) => {
  try {
    // 1. Subir nueva imagen primero
    const uploadResult = await subirImagenCloudinary(file, folder);

    // 2. Si la subida fue exitosa, eliminar la anterior
    if (oldImageUrl) {
      await eliminarImagenCloudinary(oldImageUrl, `${contexto} - reemplazo`);
    }

    return uploadResult.secure_url;
  } catch (error) {
    console.error(`Backend - Error al reemplazar imagen (${contexto}):`, error);
    throw error;
  }
};
