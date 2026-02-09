import { Router } from 'express';
import { showEvaluacion, calcularDesempeno, showDesempenoMunicipios, showMonthlyPerformance } from '../controllers/evaluacionController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Todas las rutas requieren autenticación
router.use(requireAuth);

// Ruta para mostrar página de evaluación
router.get('/', showEvaluacion);

// Ruta para calcular desempeño
router.get('/calcular', calcularDesempeno);

// Ruta para mostrar gráfico de desempeño de municipios
router.get('/desempeno-municipios', showDesempenoMunicipios);

// Ruta para mostrar desempeño mensual de todas las asignaciones
router.get('/monthly', showMonthlyPerformance);

export default router;
