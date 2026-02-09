import { Tarea } from '../models';
import { Op } from 'sequelize';

/**
 * Actualiza el estado de las tareas que han alcanzado su fecha de culminación
 * Cambia el estado de 'en_proceso' a 'finalizada'
 */
export const actualizarEstadoTareas = async (): Promise<void> => {
  try {
    const ahora = new Date();

    // Buscar tareas en proceso cuya fecha de culminación ya pasó
    const tareasActualizadas = await Tarea.update(
      { estado: 'finalizada' },
      {
        where: {
          estado: 'en_proceso',
          fechaCulminacion: {
            [Op.lt]: ahora
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
