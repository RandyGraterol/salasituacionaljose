import Entrega from '../models/Entrega';
import Municipio from '../models/Municipio';
import { Op } from 'sequelize';

/**
 * Result interface for delivery count operations
 */
export interface DeliveryCountResult {
  totalMunicipalities: number;
  uniqueMunicipalityIds: number[];
}

/**
 * Delivery Service
 * 
 * Provides business logic for delivery-related operations including
 * accurate counting of unique municipalities and proper sorting of deliveries.
 */
class DeliveryService {
  /**
   * Count unique municipalities that have submitted deliveries for a task
   * 
   * This function ensures accurate counting by grouping deliveries by municipioId,
   * which means a municipality is counted only once even if it has submitted
   * multiple deliveries for the same task.
   * 
   * @param tareaId - The ID of the task to count deliveries for
   * @returns Promise resolving to DeliveryCountResult with total count and municipality IDs
   * 
   * @example
   * const result = await deliveryService.countUniqueMunicipalitiesForTask(1);
   * console.log(`${result.totalMunicipalities} municipalities have submitted deliveries`);
   */
  async countUniqueMunicipalitiesForTask(tareaId: number): Promise<DeliveryCountResult> {
    try {
      // Use Sequelize grouping to get unique municipalities
      // This ensures each municipality is counted only once
      const entregas = await Entrega.findAll({
        where: { tareaId },
        attributes: ['municipioId'],
        group: ['municipioId'],
        raw: true
      });

      // Extract unique municipality IDs from the grouped results
      const uniqueMunicipalityIds = entregas.map((e: any) => e.municipioId);

      return {
        totalMunicipalities: uniqueMunicipalityIds.length,
        uniqueMunicipalityIds
      };
    } catch (error) {
      console.error('Error counting unique municipalities:', error);
      throw new Error('Failed to count unique municipalities for task');
    }
  }

  /**
   * Get sorted deliveries for a task in chronological order
   * 
   * Returns all deliveries for a task sorted by submission timestamp (fechaHoraEntrega)
   * in ascending order (earliest first). This ensures deliveries are displayed
   * in the order they were submitted, considering both date and time components.
   * 
   * @param tareaId - The ID of the task to get deliveries for
   * @returns Promise resolving to array of Entrega instances sorted chronologically
   * 
   * @example
   * const deliveries = await deliveryService.getSortedDeliveriesForTask(1);
   * deliveries.forEach(d => console.log(d.fechaHoraEntrega));
   */
  async getSortedDeliveriesForTask(tareaId: number): Promise<Entrega[]> {
    try {
      // Fetch deliveries with proper ordering by submission timestamp
      const entregas = await Entrega.findAll({
        where: { tareaId },
        include: [{
          model: Municipio,
          as: 'municipio'
        }],
        order: [['fechaHoraEntrega', 'ASC']]
      });

      return entregas;
    } catch (error) {
      console.error('Error fetching sorted deliveries:', error);
      throw new Error('Failed to fetch sorted deliveries for task');
    }
  }

  /**
   * Get all deliveries for a task with municipality information
   * 
   * Returns all deliveries for a task including associated municipality data.
   * This is useful for displaying delivery information with municipality names.
   * 
   * @param tareaId - The ID of the task to get deliveries for
   * @returns Promise resolving to array of Entrega instances with municipality data
   * 
   * @example
   * const deliveries = await deliveryService.getDeliveriesForTask(1);
   * deliveries.forEach(d => console.log(d.municipio.nombre));
   */
  async getDeliveriesForTask(tareaId: number): Promise<Entrega[]> {
    try {
      const entregas = await Entrega.findAll({
        where: { tareaId },
        include: [{
          model: Municipio,
          as: 'municipio'
        }]
      });

      return entregas;
    } catch (error) {
      console.error('Error fetching deliveries:', error);
      throw new Error('Failed to fetch deliveries for task');
    }
  }
}

// Export singleton instance
export const deliveryService = new DeliveryService();
export default deliveryService;
