import { Router } from 'express';
import { showLogin, login, logout, showLanding, showRegister, register } from '../controllers/authController';
import { redirectIfAuth } from '../middleware/auth';

const router = Router();

// Ruta para mostrar landing page (solo si no está autenticado)
router.get('/', redirectIfAuth, showLanding);

// Ruta para mostrar login (solo si no está autenticado)
router.get('/login', redirectIfAuth, showLogin);

// Ruta para procesar login
router.post('/login', login);

// Ruta para mostrar registro (solo si no está autenticado)
router.get('/registro', redirectIfAuth, showRegister);

// Ruta para procesar registro
router.post('/registro', register);

// Ruta para cerrar sesión
router.get('/logout', logout);

export default router;
