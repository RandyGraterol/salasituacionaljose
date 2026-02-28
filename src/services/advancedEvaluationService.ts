/**
 * Advanced Evaluation Service
 * 
 * Provides comprehensive evaluation metrics considering:
 * - Punctuality (on-time delivery)
 * - Quantity (number of deliveries)
 * - Quality (delivery ratings)
 */

import { Municipio, Tarea, Entrega, Division } from '../models';
import { Op } from 'sequelize';

/**
 * Interface for detailed task evaluation
 */
export interface TaskEvaluation {
  tareaId: number;
  tareaNombre: string;
  entregado: boolean;
  cantidadEntregas: number;
  puntualidad: number; // 0-100: porcentaje basado en qué tan temprano entregó
  calidad: number; // 0-100: promedio de calificaciones
  primeraEntrega?: Date;
  fechaLimite: Date;
}

/**
 * Interface for comprehensive municipality evaluation
 */
export interface ComprehensiveEvaluation {
  municipioId: number;
  municipioNombre: string;
  
  // Métricas básicas
  totalTareas: number;
  tareasCompletadas: number;
  porcentajeCobertura: number; // % de tareas con al menos 1 entrega
  
  // Métricas de puntualidad
  entregasPuntuales: number; // Entregas antes de la fecha límite
  entregasTardias: number; // Entregas después de la fecha límite
  porcentajePuntualidad: number; // % de entregas a tiempo
  promedioPuntualidad: number; // 0-100: qué tan temprano entrega en promedio
  
  // Métricas de cantidad
  totalEntregas: number;
  promedioEntregasPorTarea: number;
  
  // Métricas de calidad
  entregasCalificadas: number;
  promedioCalidad: number; // 0-100: promedio de calificaciones
  
  // Puntuación final ponderada
  puntuacionFinal: number; // 0-100: combinación de todos los factores
  
  // Detalle por tarea
  detallesTareas: TaskEvaluation[];
}

/**
 * Calculate punctuality score based on delivery time vs deadline
 * 
 * @param fechaEntrega - Delivery date
 * @param fechaInicio - Task start date
 * @param fechaLimite - Task deadline
 * @returns Score from 0-100 (100 = delivered at start, 0 = delivered at or after deadline)
 */
function calcularPuntualidad(
  fechaEntrega: Date,
  fechaInicio: Date,
  fechaLimite: Date
): number {
  const tiempoTotal = fechaLimite.getTime() - fechaInicio.getTime();
  const tiempoTranscurrido = fechaEntrega.getTime() - fechaInicio.getTime();
  
  // Si entregó antes de la fecha de inicio (imposible pero por si acaso)
  if (tiempoTranscurrido <= 0) return 100;
  
  // Si entregó después de la fecha límite
  if (tiempoTranscurrido >= tiempoTotal) return 0;
  
  // Calcular porcentaje: mientras más temprano, mejor
  const porcentaje = 100 - (tiempoTranscurrido / tiempoTotal) * 100;
  return Math.round(porcentaje * 100) / 100;
}

/**
 * Get comprehensive evaluation for a specific municipality
 * 
 * @param municipioId - Municipality ID to evaluate
 * @param filtros - Optional filters (date range, division)
 * @returns Comprehensive evaluation data
 */
export async function getMunicipalityComprehensiveEvaluation(
  municipioId: number,
  filtros?: {
    fechaInicio?: Date;
    fechaFin?: Date;
    divisionId?: number;
  }
): Promise<ComprehensiveEvaluation> {
  // Build task query filters
  const whereClause: any = {};
  
  if (filtros?.divisionId) {
    whereClause.divisionId = filtros.divisionId;
  }
  
  if (filtros?.fechaInicio && filtros?.fechaFin) {
    whereClause[Op.or] = [
      {
        fechaInicio: {
          [Op.between]: [filtros.fechaInicio, filtros.fechaFin]
        }
      },
      {
        fechaCulminacion: {
          [Op.between]: [filtros.fechaInicio, filtros.fechaFin]
        }
      },
      {
        [Op.and]: [
          { fechaInicio: { [Op.lte]: filtros.fechaInicio } },
          { fechaCulminacion: { [Op.gte]: filtros.fechaFin } }
        ]
      }
    ];
  }
  
  // Get municipality
  const municipio = await Municipio.findByPk(municipioId);
  if (!municipio) {
    throw new Error(`Municipio con ID ${municipioId} no encontrado`);
  }
  
  // Get all tasks (filtered)
  const tareas = await Tarea.findAll({
    where: whereClause,
    include: [{
      model: Entrega,
      as: 'entregas',
      where: { municipioId },
      required: false
    }],
    order: [['fechaInicio', 'DESC']]
  });
  
  const totalTareas = tareas.length;
  let tareasCompletadas = 0;
  let entregasPuntuales = 0;
  let entregasTardias = 0;
  let totalEntregas = 0;
  let sumaPuntualidad = 0;
  let sumaCalidad = 0;
  let entregasCalificadas = 0;
  
  const detallesTareas: TaskEvaluation[] = [];
  
  // Evaluate each task
  for (const tarea of tareas) {
    const entregas = (tarea as any).entregas || [];
    const cantidadEntregas = entregas.length;
    const entregado = cantidadEntregas > 0;
    
    if (entregado) {
      tareasCompletadas++;
      totalEntregas += cantidadEntregas;
    }
    
    // Calculate punctuality and quality for this task
    let puntualidadTarea = 0;
    let calidadTarea = 0;
    let primeraEntrega: Date | undefined;
    let calificacionesCount = 0;
    
    for (const entrega of entregas) {
      // Track first delivery
      if (!primeraEntrega || entrega.fechaHoraEntrega < primeraEntrega) {
        primeraEntrega = entrega.fechaHoraEntrega;
      }
      
      // Calculate punctuality
      const puntualidad = calcularPuntualidad(
        entrega.fechaHoraEntrega,
        tarea.fechaInicio,
        tarea.fechaCulminacion
      );
      puntualidadTarea += puntualidad;
      sumaPuntualidad += puntualidad;
      
      // Check if on time
      if (entrega.fechaHoraEntrega <= tarea.fechaCulminacion) {
        entregasPuntuales++;
      } else {
        entregasTardias++;
      }
      
      // Calculate quality
      if (entrega.calificacion !== null && entrega.calificacion !== undefined) {
        calidadTarea += entrega.calificacion;
        sumaCalidad += entrega.calificacion;
        calificacionesCount++;
        entregasCalificadas++;
      }
    }
    
    // Average for this task
    if (cantidadEntregas > 0) {
      puntualidadTarea = puntualidadTarea / cantidadEntregas;
      if (calificacionesCount > 0) {
        calidadTarea = calidadTarea / calificacionesCount;
      }
    }
    
    detallesTareas.push({
      tareaId: tarea.id,
      tareaNombre: tarea.nombre,
      entregado,
      cantidadEntregas,
      puntualidad: Math.round(puntualidadTarea * 100) / 100,
      calidad: Math.round(calidadTarea * 100) / 100,
      primeraEntrega,
      fechaLimite: tarea.fechaCulminacion
    });
  }
  
  // Calculate overall metrics
  const porcentajeCobertura = totalTareas > 0 
    ? (tareasCompletadas / totalTareas) * 100 
    : 0;
  
  const porcentajePuntualidad = totalEntregas > 0
    ? (entregasPuntuales / totalEntregas) * 100
    : 0;
  
  const promedioPuntualidad = totalEntregas > 0
    ? sumaPuntualidad / totalEntregas
    : 0;
  
  const promedioEntregasPorTarea = tareasCompletadas > 0
    ? totalEntregas / tareasCompletadas
    : 0;
  
  const promedioCalidad = entregasCalificadas > 0
    ? sumaCalidad / entregasCalificadas
    : 0;
  
  // Calculate final weighted score
  // 40% coverage, 30% punctuality, 20% quality, 10% quantity
  const puntuacionFinal = (
    porcentajeCobertura * 0.40 +
    promedioPuntualidad * 0.30 +
    promedioCalidad * 0.20 +
    Math.min(promedioEntregasPorTarea * 20, 100) * 0.10
  );
  
  return {
    municipioId,
    municipioNombre: municipio.nombre,
    totalTareas,
    tareasCompletadas,
    porcentajeCobertura: Math.round(porcentajeCobertura * 100) / 100,
    entregasPuntuales,
    entregasTardias,
    porcentajePuntualidad: Math.round(porcentajePuntualidad * 100) / 100,
    promedioPuntualidad: Math.round(promedioPuntualidad * 100) / 100,
    totalEntregas,
    promedioEntregasPorTarea: Math.round(promedioEntregasPorTarea * 100) / 100,
    entregasCalificadas,
    promedioCalidad: Math.round(promedioCalidad * 100) / 100,
    puntuacionFinal: Math.round(puntuacionFinal * 100) / 100,
    detallesTareas
  };
}

/**
 * Get comprehensive evaluation for all municipalities
 * 
 * @param filtros - Optional filters (date range, division)
 * @returns Array of comprehensive evaluations for all municipalities
 */
export async function getAllMunicipalitiesComprehensiveEvaluation(
  filtros?: {
    fechaInicio?: Date;
    fechaFin?: Date;
    divisionId?: number;
  }
): Promise<ComprehensiveEvaluation[]> {
  const municipios = await Municipio.findAll({
    order: [['nombre', 'ASC']]
  });
  
  const evaluaciones: ComprehensiveEvaluation[] = [];
  
  for (const municipio of municipios) {
    const evaluacion = await getMunicipalityComprehensiveEvaluation(
      municipio.id,
      filtros
    );
    evaluaciones.push(evaluacion);
  }
  
  // Sort by final score descending
  evaluaciones.sort((a, b) => b.puntuacionFinal - a.puntuacionFinal);
  
  return evaluaciones;
}

/**
 * Get ranking of municipalities by specific metric
 */
export async function getMunicipalityRanking(
  metrica: 'cobertura' | 'puntualidad' | 'calidad' | 'cantidad' | 'final',
  filtros?: {
    fechaInicio?: Date;
    fechaFin?: Date;
    divisionId?: number;
  }
): Promise<Array<{ municipio: string; valor: number; posicion: number }>> {
  const evaluaciones = await getAllMunicipalitiesComprehensiveEvaluation(filtros);
  
  // Select metric
  let ranking = evaluaciones.map(e => {
    let valor = 0;
    switch (metrica) {
      case 'cobertura':
        valor = e.porcentajeCobertura;
        break;
      case 'puntualidad':
        valor = e.promedioPuntualidad;
        break;
      case 'calidad':
        valor = e.promedioCalidad;
        break;
      case 'cantidad':
        valor = e.promedioEntregasPorTarea;
        break;
      case 'final':
        valor = e.puntuacionFinal;
        break;
    }
    
    return {
      municipio: e.municipioNombre,
      valor: Math.round(valor * 100) / 100
    };
  });
  
  // Sort descending
  ranking.sort((a, b) => b.valor - a.valor);
  
  // Add position
  return ranking.map((item, index) => ({
    ...item,
    posicion: index + 1
  }));
}
