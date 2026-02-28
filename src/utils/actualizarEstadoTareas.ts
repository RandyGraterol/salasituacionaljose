import { Tarea } from '../models';
import { Op } from 'sequelize';

/**
 * Actualiza el estado de las tareas que han alcanzado su fecha de culminación
 * Cambia el estado de 'en_proceso' a 'finalizada'
 * 
 * IMPORTANTE: Compara usando UTC para evitar problemas de zona horaria
 * La fecha de culminación se guarda en UTC en la base de datos
 */
export const actualizarEstadoTareas = async (): Promise<void> => {
  try {
    // Obtener la hora actual en UTC
    const ahora = new Date();
    
    console.log(`[actualizarEstadoTareas] Hora actual del servidor: ${ahora.toISOString()}`);

    // Buscar tareas en proceso cuya fecha de culminación ya pasó
    // Op.lte = menor o igual (less than or equal)
    // Esto asegura que solo se finalicen tareas cuya hora de culminación realmente ya pasó
    const tareasActualizadas = await Tarea.update(
      { estado: 'finalizada' },
      {
        where: {
          estado: 'en_proceso',
          fechaCulminacion: {
            [Op.lte]: ahora  // Cambiado de Op.lt a Op.lte para incluir la hora exacta
          }
        }
      }
    );

    if (tareasActualizadas[0] > 0) {
      console.log(`✓ ${tareasActualizadas[0]} tarea(s) actualizada(s) a estado 'finalizada'`);
    }
  } catch (error) {
    console.error('Error al actualizar estado de tareas:', error);
  }
};
