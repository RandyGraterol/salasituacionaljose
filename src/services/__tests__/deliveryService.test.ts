import deliveryService, { DeliveryCountResult } from '../deliveryService';
import Entrega from '../../models/Entrega';
import Municipio from '../../models/Municipio';

// Mock the models
jest.mock('../../models/Entrega');
jest.mock('../../models/Municipio');

describe('DeliveryService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('countUniqueMunicipalitiesForTask', () => {
    test('should count unique municipalities correctly when multiple deliveries from same municipality', async () => {
      const mockEntregas = [
        { municipioId: 1 },
        { municipioId: 2 },
        { municipioId: 3 }
      ];

      (Entrega.findAll as jest.Mock).mockResolvedValue(mockEntregas);

      const result = await deliveryService.countUniqueMunicipalitiesForTask(1);

      expect(result.totalMunicipalities).toBe(3);
      expect(result.uniqueMunicipalityIds).toEqual([1, 2, 3]);
      expect(Entrega.findAll).toHaveBeenCalledWith({
        where: { tareaId: 1 },
        attributes: ['municipioId'],
        group: ['municipioId'],
        raw: true
      });
    });

    test('should return zero count when no deliveries exist', async () => {
      (Entrega.findAll as jest.Mock).mockResolvedValue([]);

      const result = await deliveryService.countUniqueMunicipalitiesForTask(1);

      expect(result.totalMunicipalities).toBe(0);
      expect(result.uniqueMunicipalityIds).toEqual([]);
    });

    test('should return single municipality when only one has delivered', async () => {
      const mockEntregas = [{ municipioId: 5 }];

      (Entrega.findAll as jest.Mock).mockResolvedValue(mockEntregas);

      const result = await deliveryService.countUniqueMunicipalitiesForTask(2);

      expect(result.totalMunicipalities).toBe(1);
      expect(result.uniqueMunicipalityIds).toEqual([5]);
    });

    test('should throw error when database query fails', async () => {
      (Entrega.findAll as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(
        deliveryService.countUniqueMunicipalitiesForTask(1)
      ).rejects.toThrow('Failed to count unique municipalities for task');
    });
  });

  describe('getSortedDeliveriesForTask', () => {
    test('should return deliveries sorted by fechaHoraEntrega in ascending order', async () => {
      const mockEntregas = [
        {
          id: 1,
          tareaId: 1,
          municipioId: 1,
          fechaHoraEntrega: new Date('2024-01-01T10:00:00'),
          municipio: { id: 1, nombre: 'Municipio A' }
        },
        {
          id: 2,
          tareaId: 1,
          municipioId: 2,
          fechaHoraEntrega: new Date('2024-01-01T12:00:00'),
          municipio: { id: 2, nombre: 'Municipio B' }
        }
      ];

      (Entrega.findAll as jest.Mock).mockResolvedValue(mockEntregas);

      const result = await deliveryService.getSortedDeliveriesForTask(1);

      expect(result).toEqual(mockEntregas);
      expect(Entrega.findAll).toHaveBeenCalledWith({
        where: { tareaId: 1 },
        include: [{
          model: Municipio,
          as: 'municipio'
        }],
        order: [['fechaHoraEntrega', 'ASC']]
      });
    });

    test('should return empty array when no deliveries exist', async () => {
      (Entrega.findAll as jest.Mock).mockResolvedValue([]);

      const result = await deliveryService.getSortedDeliveriesForTask(1);

      expect(result).toEqual([]);
    });

    test('should include municipality information in results', async () => {
      const mockEntregas = [
        {
          id: 1,
          tareaId: 1,
          municipioId: 1,
          fechaHoraEntrega: new Date('2024-01-01T10:00:00'),
          municipio: { id: 1, nombre: 'Municipio A', codigo: 'MA' }
        }
      ];

      (Entrega.findAll as jest.Mock).mockResolvedValue(mockEntregas);

      const result = await deliveryService.getSortedDeliveriesForTask(1);

      expect(result[0].municipio).toBeDefined();
      expect(result[0].municipio.nombre).toBe('Municipio A');
    });

    test('should throw error when database query fails', async () => {
      (Entrega.findAll as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(
        deliveryService.getSortedDeliveriesForTask(1)
      ).rejects.toThrow('Failed to fetch sorted deliveries for task');
    });
  });

  describe('getDeliveriesForTask', () => {
    test('should return all deliveries for a task with municipality data', async () => {
      const mockEntregas = [
        {
          id: 1,
          tareaId: 1,
          municipioId: 1,
          fechaHoraEntrega: new Date('2024-01-01T10:00:00'),
          municipio: { id: 1, nombre: 'Municipio A' }
        },
        {
          id: 2,
          tareaId: 1,
          municipioId: 2,
          fechaHoraEntrega: new Date('2024-01-02T10:00:00'),
          municipio: { id: 2, nombre: 'Municipio B' }
        }
      ];

      (Entrega.findAll as jest.Mock).mockResolvedValue(mockEntregas);

      const result = await deliveryService.getDeliveriesForTask(1);

      expect(result).toEqual(mockEntregas);
      expect(result.length).toBe(2);
      expect(Entrega.findAll).toHaveBeenCalledWith({
        where: { tareaId: 1 },
        include: [{
          model: Municipio,
          as: 'municipio'
        }]
      });
    });

    test('should return empty array when no deliveries exist', async () => {
      (Entrega.findAll as jest.Mock).mockResolvedValue([]);

      const result = await deliveryService.getDeliveriesForTask(999);

      expect(result).toEqual([]);
    });

    test('should throw error when database query fails', async () => {
      (Entrega.findAll as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(
        deliveryService.getDeliveriesForTask(1)
      ).rejects.toThrow('Failed to fetch deliveries for task');
    });
  });
});
