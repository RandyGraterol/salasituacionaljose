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
    const { nombre, divisionId, fechaInicio, fechaCulminacion, esRetroactiva } = req.body;

    logger.info('Intento de crear nueva tarea', {
      action: 'crear_tarea_start',
      userId: sessionUser?.id,
      username: sessionUser?.usuario,
      details: {
        nombre,
        divisionId,
        fechaInicio,
        fechaCulminacion,
        esRetroactiva: esRetroactiva === 'on'
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

    // Procesar fechas
    const ahora = new Date();
    const esRetroactivaBool = esRetroactiva === 'on';
    
    // IMPORTANTE: Los campos datetime-local envían la fecha SIN zona horaria
    // Por ejemplo: "2026-02-28T15:35" se interpreta como hora LOCAL del servidor
    // Para evitar problemas, debemos tratarlas como strings y construir las fechas correctamente
    
    // Construir fecha de inicio - agregar 'Z' NO porque queremos hora local
    const inicio = new Date(fechaInicio);
    
    // Construir fecha de culminación
    const culminacion = new Date(fechaCulminacion);
    
    // Log para debug
    logger.info('Procesando fechas recibidas', {
      action: 'crear_tarea_debug',
      userId: sessionUser?.id,
      details: {
        fechaInicio_raw: fechaInicio,
        fechaCulminacion_raw: fechaCulminacion,
        inicio_parsed: inicio.toISOString(),
        culminacion_parsed: culminacion.toISOString(),
        ahora: ahora.toISOString(),
        timezone_offset: ahora.getTimezoneOffset()
      }
    });
    
    // Validar que la fecha de culminación sea posterior a la de inicio
    if (culminacion <= inicio) {
      logger.warn('Validación fallida: fecha de culminación no es posterior a inicio', {
        action: 'crear_tarea_validation_failed',
        userId: sessionUser?.id,
        details: { 
          inicio: inicio.toISOString(), 
          culminacion: culminacion.toISOString() 
        }
      });

      const divisiones = await Division.findAll({ order: [['nombre', 'ASC']] });
      return res.render('tareas/crear', {
        title: 'Crear Tarea',
        divisiones,
        error: 'La fecha y hora de culminación debe ser posterior a la fecha y hora de inicio.',
        success: null,
        currentPage: 'crear'
      });
    }
    
    // Validar fechas según si es retroactiva o no
    if (!esRetroactivaBool) {
      // Para tareas NO retroactivas, validar que la culminación sea futura
      // NO comparamos con la hora del servidor directamente porque puede estar en otra zona horaria
      // En su lugar, solo verificamos que culminación > inicio (ya validado arriba)
      // La validación de "futuro" se hace en el cliente con JavaScript
      
      // Sin embargo, agregamos una validación mínima: la culminación debe ser al menos
      // posterior a hace 1 hora (para evitar crear tareas que ya expiraron)
      const hace1Hora = new Date(ahora.getTime() - (60 * 60 * 1000));
      
      if (culminacion < hace1Hora) {
        logger.warn('Validación fallida: fecha de culminación muy en el pasado', {
          action: 'crear_tarea_validation_failed',
          userId: sessionUser?.id,
          details: { 
            culminacion: culminacion.toISOString(), 
            hace1Hora: hace1Hora.toISOString()
          }
        });

        const divisiones = await Division.findAll({ order: [['nombre', 'ASC']] });
        return res.render('tareas/crear', {
          title: 'Crear Tarea',
          divisiones,
          error: 'La fecha y hora de culminación parece estar en el pasado. Si desea crear una tarea con fechas pasadas, active la opción "Tarea Retroactiva".',
          success: null,
          currentPage: 'crear'
        });
      }
    }

    // Validar que haya al menos 1 hora de diferencia
    const diferenciaHoras = (culminacion.getTime() - inicio.getTime()) / (1000 * 60 * 60);
    if (diferenciaHoras < 1) {
      logger.warn('Validación fallida: diferencia de tiempo muy corta', {
        action: 'crear_tarea_time_validation_failed',
        userId: sessionUser?.id,
        details: { diferenciaHoras }
      });

      const divisiones = await Division.findAll({ order: [['nombre', 'ASC']] });
      return res.render('tareas/crear', {
        title: 'Crear Tarea',
        divisiones,
        error: 'La tarea debe tener al menos 1 hora de duración entre inicio y culminación',
        success: null,
        currentPage: 'crear'
      });
    }
    
    // Determinar estado inicial
    // Si es retroactiva Y la fecha de culminación ya pasó, crear como finalizada
    const estadoInicial = (esRetroactivaBool && culminacion < ahora) ? 'finalizada' : 'en_proceso';

    // Crear la tarea
    const tarea = await Tarea.create({
      nombre,
      divisionId: parseInt(divisionId),
      fechaInicio: inicio,
      fechaCulminacion: culminacion,
      estado: estadoInicial
    });

    logger.info('Tarea creada exitosamente', {
      action: 'crear_tarea_success',
      userId: sessionUser?.id,
      username: sessionUser?.usuario,
      details: {
        tareaId: tarea.id,
        nombre: tarea.nombre,
        esRetroactiva: esRetroactivaBool,
        estadoInicial
      }
    });

    // Recargar divisiones y mostrar mensaje de éxito
    const divisiones = await Division.findAll({ order: [['nombre', 'ASC']] });
    const mensajeExito = esRetroactivaBool && estadoInicial === 'finalizada'
      ? 'Tarea retroactiva creada exitosamente como "finalizada". Puede agregar entregas desde "Tareas Finalizadas".'
      : 'Tarea creada exitosamente';
    
    res.render('tareas/crear', {
      title: 'Crear Tarea',
      divisiones,
      error: null,
      success: mensajeExito,
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
    
    const { divisionId, error, success } = req.query;

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
      error: error || null,
      success: success || null,
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
      error: 'Error al cargar las tareas',
      success: null,
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

    // Prepare file URL if file was uploaded (optional field)
    const archivoUrl = file ? `/uploads/entregas/${file.filename}` : undefined;

    // Crear la entrega (permitir múltiples entregas del mismo municipio)
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

    console.log('=== DEBUG FILTROS ===');
    console.log('Parámetros recibidos:', { fechaInicio, fechaFin, divisionId, nombre });

    // Construir filtros
    const where: any = { estado: 'finalizada' };

    if (fechaInicio && fechaFin) {
      // Construir fechas en UTC para evitar problemas de zona horaria
      // Formato recibido: "YYYY-MM-DD"
      const [yearInicio, monthInicio, dayInicio] = (fechaInicio as string).split('-').map(Number);
      const [yearFin, monthFin, dayFin] = (fechaFin as string).split('-').map(Number);
      
      // Crear fechas en UTC: inicio a las 00:00:00 UTC, fin al final del día siguiente
      // Ampliamos el rango para incluir tareas que se guardaron con offset de zona horaria
      const fechaInicioDate = new Date(Date.UTC(yearInicio, monthInicio - 1, dayInicio, 0, 0, 0, 0));
      // Agregamos 1 día completo al final para cubrir todas las zonas horarias
      const fechaFinDate = new Date(Date.UTC(yearFin, monthFin - 1, dayFin + 1, 23, 59, 59, 999));
      
      console.log('Rango de fechas construido:');
      console.log('  Inicio:', fechaInicioDate.toISOString());
      console.log('  Fin:', fechaFinDate.toISOString());
      console.log('  (Se agrega 1 día al final para cubrir zonas horarias)');
      
      where.fechaCulminacion = {
        [Op.between]: [fechaInicioDate, fechaFinDate]
      };
    }

    if (divisionId) {
      where.divisionId = parseInt(divisionId as string);
      console.log('Filtro por división:', where.divisionId);
    }

    if (nombre) {
      where.nombre = {
        [Op.like]: `%${nombre}%`
      };
      console.log('Filtro por nombre:', nombre);
    }

    console.log('WHERE final:', JSON.stringify(where, null, 2));

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

    console.log('Tareas encontradas:', tareas.length);
    if (tareas.length > 0) {
      console.log('Primera tarea:', {
        nombre: tareas[0].nombre,
        fechaCulminacion: tareas[0].fechaCulminacion,
        divisionId: tareas[0].divisionId
      });
    }
    console.log('=== FIN DEBUG ===');

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


/**
 * Calificar una entrega
 * Permite asignar una calificación de calidad (0-100) a una entrega
 */
export const calificarEntrega = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { calificacion, tareaId } = req.body;

    // Validar calificación
    const calif = parseInt(calificacion);
    if (isNaN(calif) || calif < 0 || calif > 100) {
      return res.redirect(`/tareas/detalle/${tareaId}?error=calificacion_invalida`);
    }

    // Buscar la entrega
    const entrega = await Entrega.findByPk(parseInt(id));

    if (!entrega) {
      return res.redirect(`/tareas/detalle/${tareaId}?error=entrega_no_encontrada`);
    }

    // Actualizar calificación
    await entrega.update({ calificacion: calif });

    res.redirect(`/tareas/detalle/${tareaId}?success=entrega_calificada`);
  } catch (error) {
    console.error('Error al calificar entrega:', error);
    const tareaId = req.body.tareaId;
    res.redirect(`/tareas/detalle/${tareaId}?error=error_servidor`);
  }
};

/**
 * Finalizar tarea manualmente
 * Permite marcar una tarea como finalizada antes de su fecha de culminación
 */
export const finalizarTareaManual = async (req: Request, res: Response): Promise<void> => {
  try {
    const sessionUser = (req.session as any)?.user;
    const { id } = req.params;
    const { divisionId } = req.query;

    logger.info('Intento de finalizar tarea manualmente', {
      action: 'finalizar_tarea_manual',
      userId: sessionUser?.id,
      username: sessionUser?.usuario,
      details: { tareaId: id }
    });

    // Buscar la tarea
    const tarea = await Tarea.findByPk(parseInt(id));

    if (!tarea) {
      logger.warn('Tarea no encontrada', {
        action: 'finalizar_tarea_manual_not_found',
        userId: sessionUser?.id,
        details: { tareaId: id }
      });
      return res.redirect(`/tareas/proceso?error=tarea_no_encontrada`);
    }

    // Verificar que la tarea esté en proceso
    if (tarea.estado === 'finalizada') {
      logger.warn('Intento de finalizar tarea ya finalizada', {
        action: 'finalizar_tarea_manual_already_finished',
        userId: sessionUser?.id,
        details: { tareaId: id }
      });
      return res.redirect(`/tareas/proceso?divisionId=${divisionId}&error=tarea_ya_finalizada`);
    }

    // Actualizar estado a finalizada
    await tarea.update({ estado: 'finalizada' });

    logger.info('Tarea finalizada manualmente', {
      action: 'finalizar_tarea_manual_success',
      userId: sessionUser?.id,
      username: sessionUser?.usuario,
      details: {
        tareaId: tarea.id,
        nombre: tarea.nombre
      }
    });

    res.redirect(`/tareas/proceso?divisionId=${divisionId}&success=tarea_finalizada`);
  } catch (error) {
    logger.error('Error al finalizar tarea manualmente', error as Error, {
      action: 'finalizar_tarea_manual_error',
      userId: (req.session as any)?.user?.id
    });
    const divisionId = req.query.divisionId;
    res.redirect(`/tareas/proceso?divisionId=${divisionId}&error=error_servidor`);
  }
};

/**
 * Eliminar tarea
 * Permite eliminar una tarea en proceso y todas sus entregas asociadas
 */
export const eliminarTarea = async (req: Request, res: Response): Promise<void> => {
  try {
    const sessionUser = (req.session as any)?.user;
    const { id } = req.params;
    const { divisionId } = req.query;

    logger.info('Intento de eliminar tarea', {
      action: 'eliminar_tarea',
      userId: sessionUser?.id,
      username: sessionUser?.usuario,
      details: { tareaId: id }
    });

    // Buscar la tarea con sus entregas
    const tarea = await Tarea.findByPk(parseInt(id), {
      include: [{
        model: Entrega,
        as: 'entregas'
      }]
    });

    if (!tarea) {
      logger.warn('Tarea no encontrada para eliminar', {
        action: 'eliminar_tarea_not_found',
        userId: sessionUser?.id,
        details: { tareaId: id }
      });
      return res.redirect(`/tareas/proceso?error=tarea_no_encontrada`);
    }

    const nombreTarea = tarea.nombre;
    const cantidadEntregas = (tarea as any).entregas?.length || 0;

    // Eliminar la tarea (las entregas se eliminan automáticamente por CASCADE)
    await tarea.destroy();

    logger.info('Tarea eliminada exitosamente', {
      action: 'eliminar_tarea_success',
      userId: sessionUser?.id,
      username: sessionUser?.usuario,
      details: {
        tareaId: id,
        nombre: nombreTarea,
        entregasEliminadas: cantidadEntregas
      }
    });

    res.redirect(`/tareas/proceso?divisionId=${divisionId}&success=tarea_eliminada`);
  } catch (error) {
    logger.error('Error al eliminar tarea', error as Error, {
      action: 'eliminar_tarea_error',
      userId: (req.session as any)?.user?.id
    });
    const divisionId = req.query.divisionId;
    res.redirect(`/tareas/proceso?divisionId=${divisionId}&error=error_servidor`);
  }
};
