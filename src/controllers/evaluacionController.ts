import { Request, Response } from 'express';
import { Division, Tarea, Entrega, Municipio } from '../models';
import { Op } from 'sequelize';
import { getMunicipalityPerformanceData, getMonthlyPerformance } from '../services/performanceService';

// Mostrar página de evaluación
export const showEvaluacion = async (req: Request, res: Response): Promise<void> => {
  try {
    // Obtener todas las divisiones
    const divisiones = await Division.findAll({
      order: [['nombre', 'ASC']]
    });

    // Get performance data for all municipalities
    const performanceData = await getMunicipalityPerformanceData();

    res.render('evaluacion/index', {
      title: 'Evaluación de Municipios',
      divisiones,
      resultados: null,
      filtros: {
        mes: '',
        anio: '',
        divisionId: ''
      },
      performanceData,
      currentPage: 'evaluacion'
    });
  } catch (error) {
    console.error('Error al cargar evaluación:', error);
    res.render('evaluacion/index', {
      title: 'Evaluación de Municipios',
      divisiones: [],
      resultados: null,
      filtros: {
        mes: '',
        anio: '',
        divisionId: ''
      },
      performanceData: [],
      currentPage: 'evaluacion'
    });
  }
};

// Calcular desempeño de municipios
export const calcularDesempeno = async (req: Request, res: Response): Promise<void> => {
  try {
    const { mes, anio, divisionId } = req.query;

    // Validar parámetros
    if (!mes || !anio || !divisionId) {
      const divisiones = await Division.findAll({ order: [['nombre', 'ASC']] });
      const performanceData = await getMunicipalityPerformanceData();
      return res.render('evaluacion/index', {
        title: 'Evaluación de Municipios',
        divisiones,
        resultados: null,
        filtros: { mes: mes || '', anio: anio || '', divisionId: divisionId || '' },
        performanceData,
        currentPage: 'evaluacion'
      });
    }

    // Construir rango de fechas para el mes seleccionado
    const mesNum = parseInt(mes as string);
    const anioNum = parseInt(anio as string);
    const fechaInicio = new Date(anioNum, mesNum - 1, 1);
    const fechaFin = new Date(anioNum, mesNum, 0, 23, 59, 59);

    // Obtener todas las tareas de la división en el mes seleccionado
    const tareas = await Tarea.findAll({
      where: {
        divisionId: parseInt(divisionId as string),
        [Op.or]: [
          {
            fechaInicio: {
              [Op.between]: [fechaInicio, fechaFin]
            }
          },
          {
            fechaCulminacion: {
              [Op.between]: [fechaInicio, fechaFin]
            }
          },
          {
            [Op.and]: [
              { fechaInicio: { [Op.lte]: fechaInicio } },
              { fechaCulminacion: { [Op.gte]: fechaFin } }
            ]
          }
        ]
      },
      include: [{
        model: Entrega,
        as: 'entregas',
        include: [{
          model: Municipio,
          as: 'municipio'
        }]
      }]
    });

    const totalTareas = tareas.length;

    // Obtener todos los municipios
    const municipios = await Municipio.findAll({
      order: [['nombre', 'ASC']]
    });

    // Calcular desempeño por municipio
    const desempenoPorMunicipio = municipios.map(municipio => {
      // Contar cuántas tareas cumplió este municipio
      let tareasCumplidas = 0;

      tareas.forEach(tarea => {
        const entregas = (tarea as any).entregas;
        const entregaMunicipio = entregas?.find(
          (entrega: any) => entrega.municipioId === municipio.id
        );
        if (entregaMunicipio) {
          tareasCumplidas++;
        }
      });

      // Calcular porcentaje
      const porcentaje = totalTareas > 0 
        ? Math.round((tareasCumplidas / totalTareas) * 100) 
        : 0;

      return {
        municipio: municipio.nombre,
        tareasCumplidas,
        totalTareas,
        porcentaje
      };
    });

    // Ordenar por porcentaje descendente
    desempenoPorMunicipio.sort((a, b) => b.porcentaje - a.porcentaje);

    // Obtener información de la división
    const division = await Division.findByPk(parseInt(divisionId as string));

    // Obtener todas las divisiones para el select
    const divisiones = await Division.findAll({ order: [['nombre', 'ASC']] });

    // Get performance data for all municipalities
    const performanceData = await getMunicipalityPerformanceData();

    // Preparar resultados
    const resultados = {
      division: division?.nombre || '',
      mes: mesNum,
      anio: anioNum,
      totalActividades: totalTareas,
      desempeno: desempenoPorMunicipio
    };

    res.render('evaluacion/index', {
      title: 'Evaluación de Municipios',
      divisiones,
      resultados,
      filtros: {
        mes: mes as string,
        anio: anio as string,
        divisionId: divisionId as string
      },
      performanceData,
      currentPage: 'evaluacion'
    });
  } catch (error) {
    console.error('Error al calcular desempeño:', error);
    const divisiones = await Division.findAll({ order: [['nombre', 'ASC']] });
    const performanceData = await getMunicipalityPerformanceData();
    res.render('evaluacion/index', {
      title: 'Evaluación de Municipios',
      divisiones,
      resultados: null,
      filtros: {
        mes: req.query.mes || '',
        anio: req.query.anio || '',
        divisionId: req.query.divisionId || ''
      },
      performanceData,
      currentPage: 'evaluacion'
    });
  }
};

/**
 * Show municipality performance chart
 * 
 * Displays a comprehensive bar chart showing all municipalities' task completion performance.
 * Each municipality is represented by a bar showing their completion percentage and completed activities.
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */
export const showDesempenoMunicipios = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get performance data from service
    const performanceData = await getMunicipalityPerformanceData();

    res.render('evaluacion/desempeno-municipios', {
      title: 'Desempeño de Municipios',
      performanceData,
      currentPage: 'evaluacion'
    });
  } catch (error) {
    console.error('Error al cargar desempeño de municipios:', error);
    res.render('evaluacion/desempeno-municipios', {
      title: 'Desempeño de Municipios',
      performanceData: [],
      currentPage: 'evaluacion',
      error: 'Error al cargar los datos de desempeño'
    });
  }
};

/**
 * Show monthly performance evaluation dashboard
 * 
 * Displays monthly performance metrics for all municipalities.
 * Handles month selection from query parameters (defaults to current month).
 * Shows graphical representation and detailed breakdown by division.
 * 
 * Requirements: 7.1, 7.4, 7.5, 7.6
 */
export const showMonthlyPerformance = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get month from query parameter (format: YYYY-MM), default to current month
    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth() + 1;

    if (req.query.month) {
      const monthParam = req.query.month as string;
      const parts = monthParam.split('-');
      if (parts.length === 2) {
        year = parseInt(parts[0]);
        month = parseInt(parts[1]);
      }
    }

    // Validate month and year
    if (month < 1 || month > 12 || year < 2000 || year > 2100) {
      throw new Error('Invalid month or year');
    }

    // Get monthly performance data from service
    const monthlyData = await getMonthlyPerformance(year, month);

    // Format current month for the month selector
    const currentMonth = `${year}-${month.toString().padStart(2, '0')}`;

    res.render('evaluacion/monthly-performance', {
      title: 'Desempeño Mensual de Todas las Asignaciones',
      monthlyData,
      currentMonth,
      currentPage: 'evaluacion'
    });
  } catch (error) {
    console.error('Error al cargar desempeño mensual:', error);
    
    // Default to current month on error
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    
    res.render('evaluacion/monthly-performance', {
      title: 'Desempeño Mensual de Todas las Asignaciones',
      monthlyData: {
        mes: currentMonth,
        municipios: []
      },
      currentMonth,
      currentPage: 'evaluacion',
      error: 'Error al cargar los datos de desempeño mensual'
    });
  }
};
