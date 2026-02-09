import { Request, Response, NextFunction } from 'express';

// Middleware para verificar autenticación
export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  // Verificar si existe sesión de usuario
  if (req.session && (req.session as any).user) {
    // Usuario autenticado, continuar
    next();
  } else {
    // Usuario no autenticado, redirigir a login
    res.redirect('/');
  }
};

// Middleware para redirigir usuarios autenticados
export const redirectIfAuth = (req: Request, res: Response, next: NextFunction): void => {
  // Si el usuario ya está autenticado, redirigir al dashboard
  if (req.session && (req.session as any).user) {
    res.redirect('/tareas/crear');
  } else {
    // Usuario no autenticado, continuar
    next();
  }
};
