import { Router } from 'express';
import { 
  showEvaluacion, 
  calcularDesempeno, 
  showDesempenoMunicipios, 
  showMonthlyPerformance,
  showEvaluacionAvanzada,
  showEvaluacionMunicipio,
  showRanking
} from '../controllers/evaluacionController';
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

// Rutas para evaluación avanzada
router.get('/avanzada', showEvaluacionAvanzada);
router.get('/municipio/:id', showEvaluacionMunicipio);
router.get('/ranking', showRanking);

export default router;
