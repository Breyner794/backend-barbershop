import jwt from "jsonwebtoken";
import User from "../../server/db/models/user.js";

// Crear y enviar token JWT
const crearEnviarToken = (user, statusCode, res) => {
  // Crear token
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
  // Opciones para la cookie
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };

  // Enviar cookie segura solo en producción
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true; //.NODE_ENV === 'production'

  // Enviar cookie
  res.cookie("jwt", token, cookieOptions);

  // Eliminar la contraseña de la salida
  user.password = undefined;

  // Enviar respuesta
  res.status(statusCode).json({
    status: "success",
    token,
    data: {
      user,
    },
  });
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // 1) Verificar si email y password existen
    if (!email || !password) {
      return res.status(400).json({
        status: "error",
        message: "Por favor proporciona email y contraseña",
      });
    }

    // 2) Verificar si el usuario existe y la contraseña es correcta
    const user = await User.findOne({ email }).select("+password");

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        status: "error",
        message: "Email o contraseña incorrectos",
      });
    }

    // 3) Si todo está bien, enviar token al cliente
    crearEnviarToken(user, 200, res);
  } catch (error) {
    res.status(400).json({
      status: "error",
      message: error.message,
    });
  }
};

// Verificar si el usuario está autenticado (middleware)

export const protect = async (req, res, next) => {
  try {
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies.jwt) {
      token = req.cookies.jwt;
    }

    if (!token) {
      return res.status(401).json({
        status: "error",
        message:
          "No has iniciado sesión. Por favor inicia sesión para obtener acceso",
      });
    }
    // 2) Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3) Verificar si el usuario aún existe
    const usuarioActual = await User.findById(decoded.id);
    if (!usuarioActual) {
      return res.status(401).json({
        status: "error",
        message: "El usuario de este token ya no existe",
      });
    }
    // 4) Guardar usuario en req para uso en rutas protegidas
    req.user = usuarioActual;
    next();
  } catch (error) {
    res.status(401).json({
      status: "error",
      message: "No autorizado: " + error.message,
    });
  }
};

// Restringir acceso por roles
export const restrictTo = (...roles) => {
    return (req, res, next) => {
      if (!roles.includes(req.user.role)) {
        return res.status(403).json({
          status: 'error',
          message: 'No tienes permiso para realizar esta acción'
        });
      }
      next();
    };
  };


