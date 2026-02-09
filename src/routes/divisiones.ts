import { Router } from 'express';
import * as divisionController from '../controllers/divisionController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Todas las rutas requieren autenticación
router.use(requireAuth);

// Listar divisiones
router.get('/', divisionController.listarDivisiones);

// Crear división
router.get('/crear', divisionController.mostrarFormularioCrear);
router.post('/crear', divisionController.crearDivision);

// Editar división
router.get('/:id/editar', divisionController.mostrarFormularioEditar);
router.post('/:id/editar', divisionController.actualizarDivision);

// Eliminar división
router.post('/:id/eliminar', divisionController.eliminarDivision);

export default router;
