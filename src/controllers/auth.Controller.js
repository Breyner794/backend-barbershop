import jwt from "jsonwebtoken";
import User from "../../server/db/models/user.js";
import crypto from "crypto";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth:{
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
})

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

  const userProfile = user.getPublicProfile(); //VERIFICAR...
  // Enviar respuesta
  res.status(statusCode).json({
    status: "success",
    token,
    data: {
      user,
    },
  });
};

//Esta logica se va a quedar deshabilitada ya que se piensa que en en un futuro podria ser necesario para clientes..
// const sendVerificationEmail = async (user, token) => {
  
//   const verificationUrl = `${process.env.FRONTED_URL}/verifity-email/${token}`;

//   const mailOptions = {
//     from: process.env.EMAIL_USER,
//     to: user.email,
//     subject: 'verificar tu cuenta - Caballeros_del_señorApp',
//     html: `
//       <h2>¡Bienvenido ${user.name}!</h2>
//       <p>Por favor verifica tu cuenta haciendo clic en el siguiente enlace:</p>
//       <a href="${verificationUrl}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
//         Verificar cuenta
//       </a>
//       <p>Este enlace expira en 24 horas.</p>
//     `,
//   };

//   await transporter.sendMail(mailOptions);

// }

const sendPasswordResetEmail = async (user, resetToken) => {

  const resetUrl = `${process.env.FRONTED_URL}/reset-password/${resetToken}`;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: user.email,
    subject: 'Restablecer contraseña - BarberApp',
    html: `
      <h2>Restablecer contraseña</h2>
      <p>Hola ${user.name},</p>
      <p>Haz clic en el siguiente enlace para restablecer tu contraseña:</p>
      <a href="${resetUrl}" style="background: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
        Restablecer contraseña
      </a>
      <p>Este enlace expira en 10 minutos.</p>
    `,
  }

  await transporter.sendMail(mailOptions);

}

/*CONTROLADOR DE AUTENTICACION*/

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // 1) Verificar si email y password existen
    if (!email || !password) {
      return res.status(400).json({
        status: false,
        message: "Por favor proporciona email y contraseña",
      });
    }

    // 2) Verificar si el usuario existe y la contraseña es correcta
    const user = await User.findOne({ email }).select("+password").populate('site_barber');

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        status: false,
        message: "Email o contraseña incorrectos",
      });
    }

    // Verificar si está activo
    if (!user.isActive) {
      return res.status(401).json({
        status: false,
        message: "Cuenta desactivada. Contacta al administrador.",
      });
    }

    // Actualizar último login (agregado)
    user.last_login = new Date();
    await user.save({ validateBeforeSave: false });

    // 3) Si todo está bien, enviar token al cliente
    crearEnviarToken(user, 200, res);
  } catch (error) {
    res.status(400).json({
      status: false,
      message: "Error en el servidor", 
      error: error.message
    });
  }
};

export const forgotPassword = async (req, res) => {
  try{

    const {email} = req.body;
    const user = await User.findOne({ email });

     if (!user) {
      return res.status(200).json({ //Se puede cambiar la respuesta por un 404 pero comprometemos la informacion de si existe o no
        status: "error",
        message: 'Si existe una cuenta con este email, se ha enviado un enlace de recuperación.'
      });
    }
    
    const resetToken = user.generatePasswordResetToken();
    await user.save(); // { validateBeforeSave: false } se agrega... antes no estaba.

    try {
      await sendPasswordResetEmail(user, resetToken);
      
      res.json({
        status: "success",
        message: 'Email de recuperación enviado'
      });
    } catch (emailError) {
      user.reset_password_token = undefined;
      user.reset_password_expires = undefined;
      await user.save({ validateBeforeSave: false });

      res.status(500).json({
        status: "error",
        message: 'Error al enviar email. Intenta de nuevo.'
      });
    }
    
  }catch (error){
    res.status(500).json({
      status: false,
      message: 'Error en el servidor', 
      error: error.message
    });
  }
}

// RESTABLECER CONTRASEÑA
export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({
        status: false,
        message: 'La contraseña debe tener al menos 6 caracteres'
      });
    }

    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await User.findOne({
      reset_password_token: hashedToken,
      reset_password_expires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        status: false,
        message: 'Token inválido o expirado'
      });
    }

    user.password = password;
    user.reset_password_token = undefined;
    user.reset_password_expires = undefined;
    await user.save();

    //crearEnviarToken(user,200, res) // probar de ambas formas

    res.json({
      status: true,
      message: 'Contraseña actualizada exitosamente'
    });

  } catch (error) {
    res.status(500).json({
      status: false,
       message: 'Error al restablecer la contraseña', error: error.message
    });
  }
};

/*MIDDLEWARES DE SEGURIDAD*/
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

    // Verificar si está activo (agregado)
    if (!usuarioActual.isActive) {
      return res.status(401).json({
        status: "error",
        message: "Cuenta desactivada",
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

// export const verifyEmail = async (req, res) => {
//   try{
//     const { token } = req.params;
//     const user = await User.findOne({ email_verification_token: token });
    
//     if(!user) {
//       return res.status(400).json({
//         status: error,
//         message: 'Token de verificación inválido o expirado',
//       })
//     }

//     user.email_verified = true;
//     user.email_verification_token = undefined;
//     await user.save();

//     res.json({
//       status: "success",
//       message: 'email Verficado exitosamente',
//     })

//   }catch (error){
//     res.status(500).json({
//       status: "error",
//       message: error.message
//     });
//   }
// }