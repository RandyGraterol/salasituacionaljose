import { Router } from 'express';
import * as municipioController from '../controllers/municipioController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Todas las rutas requieren autenticación
router.use(requireAuth);

// Listar municipios
router.get('/', municipioController.listarMunicipios);

// Crear municipio
router.get('/crear', municipioController.mostrarFormularioCrear);
router.post('/crear', municipioController.crearMunicipio);

// Editar municipio
router.get('/:id/editar', municipioController.mostrarFormularioEditar);
router.post('/:id/editar', municipioController.actualizarMunicipio);

// Eliminar municipio
router.post('/:id/eliminar', municipioController.eliminarMunicipio);

export default router;
