/**
 * Performance Service
 * 
 * Provides functions to calculate and retrieve performance data for municipalities.
 * Used for generating performance charts and evaluation dashboards.
 */

import { Municipio, Tarea, Entrega, Division } from '../models';
import { generateColor } from '../utils/colorGenerator';
import { Op } from 'sequelize';

/**
 * Interface for municipality performance data
 */
export interface MunicipalityPerformance {
  municipioId: number;
  municipioNombre: string;
  totalTareas: number;
  tareasCompletadas: number;
  porcentajeCompletado: number;
  actividadesCompletadas: string[];
  color: string;
}

/**
 * Get performance data for all municipalities
 * 
 * Queries all municipalities and calculates their task completion performance.
 * For each municipality:
 * - Counts total tasks in the system
 * - Counts tasks completed by the municipality (tasks with deliveries)
 * - Calculates completion percentage
 * - Lists completed task names
 * - Assigns a unique color for chart visualization
 * 
 * @returns Promise<MunicipalityPerformance[]> Array of performance data for each municipality
 * 
 * @example
 * const performanceData = await getMunicipalityPerformanceData();
 * // Returns: [
 * //   {
 * //     municipioId: 1,
 * //     municipioNombre: "Municipio A",
 * //     totalTareas: 10,
 * //     tareasCompletadas: 7,
 * //     porcentajeCompletado: 70.00,
 * //     actividadesCompletadas: ["Tarea 1", "Tarea 2", ...],
 * //     color: "#3B82F6"
 * //   },
 * //   ...
 * // ]
 */
export async function getMunicipalityPerformanceData(): Promise<MunicipalityPerformance[]> {
  // Get all municipalities
  const municipios = await Municipio.findAll({
    order: [['nombre', 'ASC']]
  });

  // Get all tasks
  const tareas = await Tarea.findAll();
  const totalTareas = tareas.length;

  // Build performance data for each municipality
  const performanceData: MunicipalityPerformance[] = [];

  for (let i = 0; i < municipios.length; i++) {
    const municipio = municipios[i];

    // Get all deliveries for this municipality with associated task information
    const entregas = await Entrega.findAll({
      where: { municipioId: municipio.id },
      include: [{
        model: Tarea,
        as: 'tarea',
        attributes: ['id', 'nombre']
      }]
    });

    // Get unique task IDs that this municipality has completed
    const uniqueTaskIds = new Set<number>();
    const actividadesCompletadas: string[] = [];

    entregas.forEach(entrega => {
      if (entrega.tarea && !uniqueTaskIds.has(entrega.tarea.id)) {
        uniqueTaskIds.add(entrega.tarea.id);
        actividadesCompletadas.push(entrega.tarea.nombre);
      }
    });

    const tareasCompletadas = uniqueTaskIds.size;
    const porcentajeCompletado = totalTareas > 0 
      ? Math.round((tareasCompletadas / totalTareas) * 10000) / 100 
      : 0;

    performanceData.push({
      municipioId: municipio.id,
      municipioNombre: municipio.nombre,
      totalTareas,
      tareasCompletadas,
      porcentajeCompletado,
      actividadesCompletadas,
      color: generateColor(i)
    });
  }

  return performanceData;
}

/**
 * Interface for division performance data within a municipality
 */
export interface DivisionPerformanceData {
  divisionId: number;
  divisionNombre: string;
  tareasAsignadas: number;
  tareasCompletadas: number;
  porcentaje: number;
}

/**
 * Interface for municipality monthly performance data
 */
export interface MunicipalityMonthlyPerformance {
  municipioId: number;
  municipioNombre: string;
  divisionData: DivisionPerformanceData[];
  totalTareasAsignadas: number;
  totalTareasCompletadas: number;
  porcentajeTotal: number;
}

/**
 * Interface for monthly performance data
 */
export interface MonthlyPerformanceData {
  mes: string;
  municipios: MunicipalityMonthlyPerformance[];
}

/**
 * Get monthly performance data for all municipalities
 * 
 * Calculates performance metrics for all municipalities for a specific month.
 * For each municipality:
 * - Counts total tasks assigned in the month
 * - Counts tasks completed by the municipality in the month
 * - Calculates completion percentage
 * - Breaks down performance by division
 * 
 * @param year - The year to query (e.g., 2024)
 * @param month - The month to query (1-12)
 * @returns Promise<MonthlyPerformanceData> Monthly performance data for all municipalities
 * 
 * @example
 * const monthlyData = await getMonthlyPerformance(2024, 1);
 * // Returns: {
 * //   mes: "2024-01",
 * //   municipios: [
 * //     {
 * //       municipioId: 1,
 * //       municipioNombre: "Municipio A",
 * //       divisionData: [
 * //         {
 * //           divisionId: 1,
 * //           divisionNombre: "División 1",
 * //           tareasAsignadas: 5,
 * //           tareasCompletadas: 3,
 * //           porcentaje: 60.00
 * //         }
 * //       ],
 * //       totalTareasAsignadas: 10,
 * //       totalTareasCompletadas: 7,
 * //       porcentajeTotal: 70.00
 * //     },
 * //     ...
 * //   ]
 * // }
 * 
 * Requirements: 7.4, 7.5, 7.6
 */
export async function getMonthlyPerformance(year: number, month: number): Promise<MonthlyPerformanceData> {
  // Construct date range for the selected month
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  // Get all tasks that fall within the month
  // A task is considered "in the month" if:
  // - It starts in the month, OR
  // - It ends in the month, OR
  // - It spans across the month (starts before and ends after)
  const tareas = await Tarea.findAll({
    where: {
      [Op.or]: [
        {
          fechaInicio: {
            [Op.between]: [startDate, endDate]
          }
        },
        {
          fechaCulminacion: {
            [Op.between]: [startDate, endDate]
          }
        },
        {
          [Op.and]: [
            { fechaInicio: { [Op.lte]: startDate } },
            { fechaCulminacion: { [Op.gte]: endDate } }
          ]
        }
      ]
    },
    include: [
      {
        model: Division,
        as: 'division',
        attributes: ['id', 'nombre']
      },
      {
        model: Entrega,
        as: 'entregas',
        attributes: ['id', 'municipioId']
      }
    ]
  });

  // Get all municipalities
  const municipios = await Municipio.findAll({
    order: [['nombre', 'ASC']]
  });

  // Get all divisions
  const divisiones = await Division.findAll({
    order: [['nombre', 'ASC']]
  });

  // Build performance data for each municipality
  const municipiosData: MunicipalityMonthlyPerformance[] = [];

  for (const municipio of municipios) {
    const divisionData: DivisionPerformanceData[] = [];
    let totalTareasAsignadas = 0;
    let totalTareasCompletadas = 0;

    // Calculate performance by division
    for (const division of divisiones) {
      // Get tasks for this division in the month
      const tareasDivision = tareas.filter(t => t.divisionId === division.id);
      const tareasAsignadas = tareasDivision.length;

      // Count how many of these tasks the municipality completed
      let tareasCompletadas = 0;
      for (const tarea of tareasDivision) {
        const entregas = (tarea as any).entregas || [];
        const hasEntrega = entregas.some((e: any) => e.municipioId === municipio.id);
        if (hasEntrega) {
          tareasCompletadas++;
        }
      }

      // Only include divisions that have tasks in this month
      if (tareasAsignadas > 0) {
        const porcentaje = (tareasCompletadas / tareasAsignadas) * 100;

        divisionData.push({
          divisionId: division.id,
          divisionNombre: division.nombre,
          tareasAsignadas,
          tareasCompletadas,
          porcentaje: Math.round(porcentaje * 100) / 100
        });

        totalTareasAsignadas += tareasAsignadas;
        totalTareasCompletadas += tareasCompletadas;
      }
    }

    // Calculate total percentage for the municipality
    const porcentajeTotal = totalTareasAsignadas > 0
      ? (totalTareasCompletadas / totalTareasAsignadas) * 100
      : 0;

    municipiosData.push({
      municipioId: municipio.id,
      municipioNombre: municipio.nombre,
      divisionData,
      totalTareasAsignadas,
      totalTareasCompletadas,
      porcentajeTotal: Math.round(porcentajeTotal * 100) / 100
    });
  }

  // Format month string as YYYY-MM
  const mesString = `${year}-${month.toString().padStart(2, '0')}`;

  return {
    mes: mesString,
    municipios: municipiosData
  };
}
