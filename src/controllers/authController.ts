import { Request, Response } from 'express';
import { Usuario } from '../models';
import { logger } from '../utils/logger';

// Mostrar landing page
export const showLanding = (req: Request, res: Response): void => {
  logger.info('Mostrando landing page', { action: 'show_landing' });
  res.render('landing', {
    title: 'Sistema de Tareas CDCE'
  });
};

// Mostrar página de login
export const showLogin = (req: Request, res: Response): void => {
  const successParam = req.query.success as string;
  let successMessage = null;
  
  if (successParam === 'registro_exitoso') {
    successMessage = '¡Cuenta creada exitosamente! Ahora puedes iniciar sesión.';
  }
  
  logger.info('Mostrando página de login', { 
    action: 'show_login',
    details: {
      hasSuccessMessage: !!successMessage
    }
  });
  
  res.render('login', {
    title: 'Iniciar Sesión',
    error: null,
    success: successMessage
  });
};

// Procesar login
export const login = async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  
  try {
    const { usuario, password } = req.body;

    logger.info('Inicio de proceso de login', { 
      action: 'login_start',
      username: usuario,
      details: { 
        hasPassword: !!password,
        passwordLength: password?.length || 0
      }
    });

    // Validar que se enviaron los campos
    if (!usuario || !password) {
      logger.warn('Validación fallida: campos vacíos', {
        action: 'login_validation_failed',
        details: {
          hasUsuario: !!usuario,
          hasPassword: !!password
        }
      });

      return res.render('login', {
        title: 'Iniciar Sesión',
        error: 'Por favor complete todos los campos'
      });
    }

    // Validar que no sean solo espacios
    if (usuario.trim().length === 0 || password.trim().length === 0) {
      logger.warn('Validación fallida: campos solo con espacios', {
        action: 'login_validation_failed',
        username: usuario
      });

      return res.render('login', {
        title: 'Iniciar Sesión',
        error: 'Por favor complete todos los campos correctamente'
      });
    }

    logger.info('Validación de campos exitosa', {
      action: 'login_validation_success',
      username: usuario
    });

    // Buscar usuario por nombre de usuario o correo
    logger.info('Buscando usuario en base de datos', {
      action: 'login_db_search',
      username: usuario
    });

    const user = await Usuario.findOne({
      where: {
        [require('sequelize').Op.or]: [
          { usuario: usuario },
          { correo: usuario }
        ]
      }
    });

    // Verificar si el usuario existe
    if (!user) {
      logger.warn('Usuario no encontrado en base de datos', {
        action: 'login_user_not_found',
        username: usuario
      });

      return res.render('login', {
        title: 'Iniciar Sesión',
        error: 'Usuario o contraseña incorrectos'
      });
    }

    logger.info('Usuario encontrado en base de datos', {
      action: 'login_user_found',
      userId: user.id,
      username: user.usuario,
      details: {
        hasPasswordHash: !!user.password,
        passwordHashLength: user.password?.length || 0
      }
    });

    // Verificar contraseña
    logger.info('Iniciando comparación de contraseña', {
      action: 'login_password_compare_start',
      userId: user.id,
      username: user.usuario
    });

    const isPasswordValid = await user.comparePassword(password);
    
    logger.info('Comparación de contraseña completada', {
      action: 'login_password_compare_complete',
      userId: user.id,
      username: user.usuario,
      details: {
        isValid: isPasswordValid
      }
    });

    if (!isPasswordValid) {
      logger.warn('Contraseña incorrecta', {
        action: 'login_password_invalid',
        userId: user.id,
        username: user.usuario
      });

      return res.render('login', {
        title: 'Iniciar Sesión',
        error: 'Usuario o contraseña incorrectos'
      });
    }

    logger.info('Contraseña válida, creando sesión', {
      action: 'login_password_valid',
      userId: user.id,
      username: user.usuario
    });

    // Crear sesión
    (req.session as any).user = {
      id: user.id,
      usuario: user.usuario,
      correo: user.correo
    };

    // Verificar que la sesión se creó correctamente
    const sessionUser = (req.session as any).user;
    if (!sessionUser || !sessionUser.id) {
      logger.error('Error al crear sesión', new Error('Session user not set'), {
        action: 'login_session_creation_failed',
        userId: user.id,
        username: user.usuario
      });

      return res.render('login', {
        title: 'Iniciar Sesión',
        error: 'Error al iniciar sesión. Por favor intente nuevamente.'
      });
    }

    logger.info('Sesión creada exitosamente', {
      action: 'login_session_created',
      userId: user.id,
      username: user.usuario,
      details: {
        sessionUserId: sessionUser.id,
        sessionUsername: sessionUser.usuario
      }
    });

    const redirectUrl = '/tareas/crear';
    logger.info('Redirigiendo usuario después de login exitoso', {
      action: 'login_redirect',
      userId: user.id,
      username: user.usuario,
      details: {
        redirectUrl
      }
    });

    // Redirigir al módulo de tareas
    res.redirect(redirectUrl);

    logger.info('Login completado exitosamente', {
      action: 'login_success',
      userId: user.id,
      username: user.usuario,
      details: {
        duration: Date.now() - startTime
      }
    });

  } catch (error) {
    logger.error('Error inesperado durante login', error as Error, {
      action: 'login_error',
      username: req.body?.usuario,
      details: {
        duration: Date.now() - startTime
      }
    });

    res.render('login', {
      title: 'Iniciar Sesión',
      error: 'Error al iniciar sesión. Por favor intente nuevamente.'
    });
  }
};

// Mostrar página de registro
export const showRegister = (req: Request, res: Response): void => {
  logger.info('Mostrando página de registro', { action: 'show_register' });
  res.render('registro', {
    title: 'Crear Cuenta',
    error: null,
    success: null
  });
};

// Procesar registro
export const register = async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  
  try {
    const { usuario, correo, password, confirmPassword } = req.body;

    logger.info('Inicio de proceso de registro', { 
      action: 'register_start',
      username: usuario,
      email: correo,
      details: { 
        hasPassword: !!password,
        hasConfirmPassword: !!confirmPassword
      }
    });

    // Validar que se enviaron todos los campos
    if (!usuario || !correo || !password || !confirmPassword) {
      logger.warn('Validación fallida: campos vacíos', {
        action: 'register_validation_failed',
        details: {
          hasUsuario: !!usuario,
          hasCorreo: !!correo,
          hasPassword: !!password,
          hasConfirmPassword: !!confirmPassword
        }
      });

      return res.render('registro', {
        title: 'Crear Cuenta',
        error: 'Por favor complete todos los campos',
        success: null
      });
    }

    // Validar que no sean solo espacios
    if (usuario.trim().length === 0 || correo.trim().length === 0 || 
        password.trim().length === 0 || confirmPassword.trim().length === 0) {
      logger.warn('Validación fallida: campos solo con espacios', {
        action: 'register_validation_failed',
        username: usuario
      });

      return res.render('registro', {
        title: 'Crear Cuenta',
        error: 'Por favor complete todos los campos correctamente',
        success: null
      });
    }

    // Validar longitud mínima del usuario
    if (usuario.trim().length < 3) {
      logger.warn('Validación fallida: usuario muy corto', {
        action: 'register_validation_failed',
        username: usuario,
        details: { length: usuario.trim().length }
      });

      return res.render('registro', {
        title: 'Crear Cuenta',
        error: 'El nombre de usuario debe tener al menos 3 caracteres',
        success: null
      });
    }

    // Validar que el usuario no contenga espacios
    if (usuario.includes(' ')) {
      logger.warn('Validación fallida: usuario con espacios', {
        action: 'register_validation_failed',
        username: usuario
      });

      return res.render('registro', {
        title: 'Crear Cuenta',
        error: 'El nombre de usuario no puede contener espacios',
        success: null
      });
    }

    // Validar longitud mínima de la contraseña
    if (password.length < 6) {
      logger.warn('Validación fallida: contraseña muy corta', {
        action: 'register_validation_failed',
        username: usuario,
        details: { passwordLength: password.length }
      });

      return res.render('registro', {
        title: 'Crear Cuenta',
        error: 'La contraseña debe tener al menos 6 caracteres',
        success: null
      });
    }

    // Validar que las contraseñas coincidan
    if (password !== confirmPassword) {
      logger.warn('Validación fallida: contraseñas no coinciden', {
        action: 'register_validation_failed',
        username: usuario
      });

      return res.render('registro', {
        title: 'Crear Cuenta',
        error: 'Las contraseñas no coinciden',
        success: null
      });
    }

    // Validar formato de correo
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(correo)) {
      logger.warn('Validación fallida: formato de correo inválido', {
        action: 'register_validation_failed',
        username: usuario,
        email: correo
      });

      return res.render('registro', {
        title: 'Crear Cuenta',
        error: 'Por favor ingrese un correo electrónico válido',
        success: null
      });
    }

    logger.info('Validación de campos exitosa', {
      action: 'register_validation_success',
      username: usuario,
      email: correo
    });

    // Verificar si el usuario ya existe
    logger.info('Verificando si el usuario ya existe', {
      action: 'register_check_existing',
      username: usuario,
      email: correo
    });

    const existingUser = await Usuario.findOne({
      where: {
        [require('sequelize').Op.or]: [
          { usuario: usuario },
          { correo: correo }
        ]
      }
    });

    if (existingUser) {
      const conflictField = existingUser.usuario === usuario ? 'usuario' : 'correo';
      
      logger.warn('Usuario o correo ya existe', {
        action: 'register_user_exists',
        username: usuario,
        email: correo,
        details: { conflictField }
      });

      return res.render('registro', {
        title: 'Crear Cuenta',
        error: conflictField === 'usuario' 
          ? 'El nombre de usuario ya está en uso' 
          : 'El correo electrónico ya está registrado',
        success: null
      });
    }

    logger.info('Usuario disponible, creando nuevo usuario', {
      action: 'register_creating_user',
      username: usuario,
      email: correo
    });

    // Crear nuevo usuario
    const newUser = await Usuario.create({
      usuario: usuario.trim(),
      correo: correo.trim().toLowerCase(),
      password: password
    });

    logger.info('Usuario creado exitosamente', {
      action: 'register_user_created',
      userId: newUser.id,
      username: newUser.usuario,
      email: newUser.correo,
      details: {
        duration: Date.now() - startTime
      }
    });

    // Redirigir al login con mensaje de éxito
    logger.info('Redirigiendo a login después de registro exitoso', {
      action: 'register_redirect',
      userId: newUser.id,
      username: newUser.usuario
    });
    
    res.redirect('/login?success=registro_exitoso');

  } catch (error) {
    logger.error('Error inesperado durante registro', error as Error, {
      action: 'register_error',
      username: req.body?.usuario,
      email: req.body?.correo,
      details: {
        duration: Date.now() - startTime
      }
    });

    res.render('registro', {
      title: 'Crear Cuenta',
      error: 'Error al crear la cuenta. Por favor intente nuevamente.',
      success: null
    });
  }
};

// Cerrar sesión
export const logout = (req: Request, res: Response): void => {
  const sessionUser = (req.session as any)?.user;
  
  logger.info('Iniciando cierre de sesión', {
    action: 'logout_start',
    userId: sessionUser?.id,
    username: sessionUser?.usuario
  });

  req.session.destroy((err) => {
    if (err) {
      logger.error('Error al cerrar sesión', err, {
        action: 'logout_error',
        userId: sessionUser?.id,
        username: sessionUser?.usuario
      });
    } else {
      logger.info('Sesión cerrada exitosamente', {
        action: 'logout_success',
        userId: sessionUser?.id,
        username: sessionUser?.usuario
      });
    }
    res.redirect('/');
  });
};
