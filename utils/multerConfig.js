import multer from "multer";

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Solo se pueden subir imágenes. Por favor, sube un archivo de imagen válido."
      ),
      false
    );
  }
};

const upload = multer({
    storage: multerStorage,
    fileFilter: multerFilter,
    limits:  {fileSize: 5 * 1024 * 1024}
});

export const uploadUserPhoto = upload.single('photo');