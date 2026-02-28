import { Router } from 'express';
import {
  showCrear,
  crear,
  showProceso,
  showDetalle,
  agregarEntrega,
  eliminarEntrega,
  showFinalizadas,
  calificarEntrega,
  finalizarTareaManual,
  eliminarTarea
} from '../controllers/tareasController';
import { requireAuth } from '../middleware/auth';
import { uploadEntrega } from '../middleware/upload';

const router = Router();

// Todas las rutas requieren autenticación
router.use(requireAuth);

// Rutas para crear tarea
router.get('/crear', showCrear);
router.post('/crear', crear);

// Rutas para tareas en proceso
router.get('/proceso', showProceso);
router.get('/detalle/:id', showDetalle);
router.post('/agregar-entrega', uploadEntrega.single('archivo'), agregarEntrega);
router.post('/entrega/eliminar/:id', eliminarEntrega);
router.post('/entrega/calificar/:id', calificarEntrega);
router.post('/finalizar/:id', finalizarTareaManual);
router.post('/eliminar/:id', eliminarTarea);

// Rutas para tareas finalizadas
router.get('/finalizadas', showFinalizadas);

export default router;
