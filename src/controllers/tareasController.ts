import { Request, Response } from 'express';
import { Tarea, Division, Entrega, Municipio } from '../models';
import { Op } from 'sequelize';
import { actualizarEstadoTareas } from '../utils/actualizarEstadoTareas';
import { logger } from '../utils/logger';

// Mostrar formulario para crear tarea
export const showCrear = async (req: Request, res: Response): Promise<void> => {
  try {
    const sessionUser = (req.session as any)?.user;
    logger.info('Mostrando formulario de crear tarea', {
      action: 'show_crear_tarea',
      userId: sessionUser?.id,
      username: sessionUser?.usuario
    });

    // Obtener todas las divisiones para el select
    const divisiones = await Division.findAll({
      order: [['nombre', 'ASC']]
    });

    logger.info('Divisiones cargadas para formulario', {
      action: 'divisiones_loaded',
      userId: sessionUser?.id,
      details: { count: divisiones.length }
    });

    res.render('tareas/crear', {
      title: 'Crear Tarea',
      divisiones,
      error: null,
      success: null,
      currentPage: 'crear'
    });
  } catch (error) {
    logger.error('Error al cargar formulario de crear tarea', error as Error, {
      action: 'show_crear_tarea_error'
    });
    res.render('tareas/crear', {
      title: 'Crear Tarea',
      divisiones: [],
      error: 'Error al cargar el formulario',
      success: null
    });
  }
};

// Crear nueva tarea
export const crear = async (req: Request, res: Response): Promise<void> => {
  try {
    const sessionUser = (req.session as any)?.user;
    const { nombre, divisionId, fechaInicio, fechaCulminacion } = req.body;

    logger.info('Intento de crear nueva tarea', {
      action: 'crear_tarea_start',
      userId: sessionUser?.id,
      username: sessionUser?.usuario,
      details: {
        nombre,
        divisionId,
        fechaInicio,
        fechaCulminacion
      }
    });

    // Validar campos obligatorios
    if (!nombre || !divisionId || !fechaInicio || !fechaCulminacion) {
      logger.warn('Validación fallida: campos vacíos al crear tarea', {
        action: 'crear_tarea_validation_failed',
        userId: sessionUser?.id
      });

      const divisiones = await Division.findAll({ order: [['nombre', 'ASC']] });
      return res.render('tareas/crear', {
        title: 'Crear Tarea',
        divisiones,
        error: 'Por favor complete todos los campos obligatorios',
        success: null,
        currentPage: 'crear'
      });
    }

    // Validar que fecha de inicio sea anterior o igual a fecha de culminación
    const inicio = new Date(fechaInicio);
    const culminacion = new Date(fechaCulminacion);

    if (inicio > culminacion) {
      logger.warn('Validación fallida: fecha de inicio posterior a culminación', {
        action: 'crear_tarea_date_validation_failed',
        userId: sessionUser?.id,
        details: { fechaInicio, fechaCulminacion }
      });

      const divisiones = await Division.findAll({ order: [['nombre', 'ASC']] });
      return res.render('tareas/crear', {
        title: 'Crear Tarea',
        divisiones,
        error: 'La fecha de inicio debe ser anterior o igual a la fecha de culminación',
        success: null,
        currentPage: 'crear'
      });
    }

    // Crear la tarea
    const tarea = await Tarea.create({
      nombre,
      divisionId: parseInt(divisionId),
      fechaInicio: inicio,
      fechaCulminacion: culminacion,
      estado: 'en_proceso'
    });

    logger.info('Tarea creada exitosamente', {
      action: 'crear_tarea_success',
      userId: sessionUser?.id,
      username: sessionUser?.usuario,
      details: {
        tareaId: tarea.id,
        nombre: tarea.nombre
      }
    });

    // Recargar divisiones y mostrar mensaje de éxito
    const divisiones = await Division.findAll({ order: [['nombre', 'ASC']] });
    res.render('tareas/crear', {
      title: 'Crear Tarea',
      divisiones,
      error: null,
      success: 'Tarea creada exitosamente',
      currentPage: 'crear'
    });
  } catch (error) {
    logger.error('Error al crear tarea', error as Error, {
      action: 'crear_tarea_error',
      userId: (req.session as any)?.user?.id
    });

    const divisiones = await Division.findAll({ order: [['nombre', 'ASC']] });
    res.render('tareas/crear', {
      title: 'Crear Tarea',
      divisiones,
      error: 'Error al crear la tarea. Por favor intente nuevamente.',
      success: null,
      currentPage: 'crear'
    });
  }
};

// Mostrar tareas en proceso
export const showProceso = async (req: Request, res: Response): Promise<void> => {
  try {
    // Actualizar estado de tareas antes de mostrar
    await actualizarEstadoTareas();
    
    const { divisionId } = req.query;

    // Obtener divisiones que tienen tareas en proceso
    const divisiones = await Division.findAll({
      include: [{
        model: Tarea,
        as: 'tareas',
        where: { estado: 'en_proceso' },
        required: true
      }],
      order: [['nombre', 'ASC']]
    });

    let tareas: any[] = [];
    let divisionSeleccionada = null;

    // Si se seleccionó una división, obtener sus tareas
    if (divisionId) {
      tareas = await Tarea.findAll({
        where: {
          divisionId: parseInt(divisionId as string),
          estado: 'en_proceso'
        },
        include: [{
          model: Division,
          as: 'division'
        }],
        order: [['fechaInicio', 'DESC']]
      });

      divisionSeleccionada = await Division.findByPk(parseInt(divisionId as string));
    }

    res.render('tareas/proceso', {
      title: 'Tareas en Proceso',
      divisiones,
      tareas,
      divisionSeleccionada,
      divisionId: divisionId || null,
      currentPage: 'proceso'
    });
  } catch (error) {
    console.error('Error al cargar tareas en proceso:', error);
    res.render('tareas/proceso', {
      title: 'Tareas en Proceso',
      divisiones: [],
      tareas: [],
      divisionSeleccionada: null,
      divisionId: null,
      currentPage: 'proceso'
    });
  }
};

// Mostrar detalle de una tarea
export const showDetalle = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const tarea = await Tarea.findByPk(parseInt(id), {
      include: [
        {
          model: Division,
          as: 'division'
        },
        {
          model: Entrega,
          as: 'entregas',
          include: [{
            model: Municipio,
            as: 'municipio'
          }]
        }
      ],
      order: [[{ model: Entrega, as: 'entregas' }, 'fechaHoraEntrega', 'ASC']]
    });

    if (!tarea) {
      return res.redirect('/tareas/proceso');
    }

    // Obtener todos los municipios para el select
    const municipios = await Municipio.findAll({
      order: [['nombre', 'ASC']]
    });

    // Identificar el municipio más rápido (primera entrega)
    let municipioMasRapidoId = null;
    const entregas = (tarea as any).entregas;
    if (entregas && entregas.length > 0) {
      municipioMasRapidoId = entregas[0].municipioId;
    }

    res.render('tareas/detalle', {
      title: `Detalle de Tarea: ${tarea.nombre}`,
      tarea,
      municipios,
      municipioMasRapidoId,
      error: null,
      success: null,
      currentPage: 'proceso'
    });
  } catch (error) {
    console.error('Error al cargar detalle de tarea:', error);
    res.redirect('/tareas/proceso');
  }
};

// Agregar entrega de municipio
export const agregarEntrega = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tareaId, municipioId, fechaHoraEntrega } = req.body;
    const file = req.file; // Access uploaded file from multer middleware

    // Validar campos
    if (!tareaId || !municipioId || !fechaHoraEntrega) {
      return res.redirect(`/tareas/detalle/${tareaId}?error=campos_vacios`);
    }

    // Verificar si el municipio ya entregó para esta tarea
    const entregaExistente = await Entrega.findOne({
      where: {
        tareaId: parseInt(tareaId),
        municipioId: parseInt(municipioId)
      }
    });

    if (entregaExistente) {
      return res.redirect(`/tareas/detalle/${tareaId}?error=municipio_duplicado`);
    }

    // Prepare file URL if file was uploaded (optional field)
    const archivoUrl = file ? `/uploads/entregas/${file.filename}` : undefined;

    // Crear la entrega with optional file URL
    await Entrega.create({
      tareaId: parseInt(tareaId),
      municipioId: parseInt(municipioId),
      fechaHoraEntrega: new Date(fechaHoraEntrega),
      archivoUrl: archivoUrl
    });

    res.redirect(`/tareas/detalle/${tareaId}?success=entrega_agregada`);
  } catch (error) {
    console.error('Error al agregar entrega:', error);
    const tareaId = req.body.tareaId;
    
    // Handle file upload errors specifically
    if (error instanceof Error && error.message.includes('Formato de archivo no permitido')) {
      return res.redirect(`/tareas/detalle/${tareaId}?error=formato_invalido`);
    }
    
    if (error instanceof Error && error.message.includes('File too large')) {
      return res.redirect(`/tareas/detalle/${tareaId}?error=archivo_grande`);
    }
    
    res.redirect(`/tareas/detalle/${tareaId}?error=error_servidor`);
  }
};

// Eliminar entrega
export const eliminarEntrega = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { tareaId } = req.query;

    const entrega = await Entrega.findByPk(parseInt(id));

    if (entrega) {
      await entrega.destroy();
      res.redirect(`/tareas/detalle/${tareaId}?success=entrega_eliminada`);
    } else {
      res.redirect(`/tareas/detalle/${tareaId}?error=entrega_no_encontrada`);
    }
  } catch (error) {
    console.error('Error al eliminar entrega:', error);
    const tareaId = req.query.tareaId;
    res.redirect(`/tareas/detalle/${tareaId}?error=error_servidor`);
  }
};

// Mostrar tareas finalizadas
export const showFinalizadas = async (req: Request, res: Response): Promise<void> => {
  try {
    // Actualizar estado de tareas antes de mostrar
    await actualizarEstadoTareas();
    
    const { fechaInicio, fechaFin, divisionId, nombre } = req.query;

    // Construir filtros
    const where: any = { estado: 'finalizada' };

    if (fechaInicio && fechaFin) {
      where.fechaCulminacion = {
        [Op.between]: [new Date(fechaInicio as string), new Date(fechaFin as string)]
      };
    }

    if (divisionId) {
      where.divisionId = parseInt(divisionId as string);
    }

    if (nombre) {
      where.nombre = {
        [Op.like]: `%${nombre}%`
      };
    }

    // Obtener tareas finalizadas
    const tareas = await Tarea.findAll({
      where,
      include: [
        {
          model: Division,
          as: 'division'
        },
        {
          model: Entrega,
          as: 'entregas',
          include: [{
            model: Municipio,
            as: 'municipio'
          }]
        }
      ],
      order: [['fechaCulminacion', 'DESC']]
    });

    // Obtener todas las divisiones para el filtro
    const divisiones = await Division.findAll({
      order: [['nombre', 'ASC']]
    });

    res.render('tareas/finalizadas', {
      title: 'Tareas Finalizadas',
      tareas,
      divisiones,
      filtros: {
        fechaInicio: fechaInicio || '',
        fechaFin: fechaFin || '',
        divisionId: divisionId || '',
        nombre: nombre || ''
      },
      currentPage: 'finalizadas'
    });
  } catch (error) {
    console.error('Error al cargar tareas finalizadas:', error);
    res.render('tareas/finalizadas', {
      title: 'Tareas Finalizadas',
      tareas: [],
      divisiones: [],
      filtros: {
        fechaInicio: '',
        fechaFin: '',
        divisionId: '',
        nombre: ''
      },
      currentPage: 'finalizadas'
    });
  }
};
