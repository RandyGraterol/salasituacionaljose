/**
 * Unit Tests for Performance Service
 * 
 * Tests the getMunicipalityPerformanceData function to ensure accurate
 * performance calculations and data structure.
 */

import { getMunicipalityPerformanceData } from '../performanceService';
import { Municipio, Tarea, Entrega, sequelize } from '../../models';

describe('Performance Service', () => {
  beforeEach(async () => {
    // Clean up database before each test
    await Entrega.destroy({ where: {}, force: true });
    await Tarea.destroy({ where: {}, force: true });
    await Municipio.destroy({ where: {}, force: true });
  });

  afterAll(async () => {
    // Close database connection
    await sequelize.close();
  });

  describe('getMunicipalityPerformanceData', () => {
    it('should return empty array when no municipalities exist', async () => {
      const result = await getMunicipalityPerformanceData();
      expect(result).toEqual([]);
    });

    it('should return correct data for single municipality with no deliveries', async () => {
      // Create municipality
      const municipio = await Municipio.create({
        nombre: 'Municipio Test',
        codigo: 'MT01'
      });

      // Create tasks
      await Tarea.create({
        nombre: 'Tarea 1',
        divisionId: 1,
        fechaInicio: new Date('2024-01-01'),
        fechaCulminacion: new Date('2024-01-31'),
        estado: 'en_proceso'
      });

      const result = await getMunicipalityPerformanceData();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        municipioId: municipio.id,
        municipioNombre: 'Municipio Test',
        totalTareas: 1,
        tareasCompletadas: 0,
        porcentajeCompletado: 0,
        actividadesCompletadas: []
      });
      expect(result[0].color).toBeDefined();
    });

    it('should calculate correct percentage for municipality with deliveries', async () => {
      // Create municipality
      const municipio = await Municipio.create({
        nombre: 'Municipio A',
        codigo: 'MA01'
      });

      // Create tasks
      const tarea1 = await Tarea.create({
        nombre: 'Tarea 1',
        divisionId: 1,
        fechaInicio: new Date('2024-01-01'),
        fechaCulminacion: new Date('2024-01-31'),
        estado: 'en_proceso'
      });

      const tarea2 = await Tarea.create({
        nombre: 'Tarea 2',
        divisionId: 1,
        fechaInicio: new Date('2024-02-01'),
        fechaCulminacion: new Date('2024-02-28'),
        estado: 'en_proceso'
      });

      // Create delivery for tarea1
      await Entrega.create({
        tareaId: tarea1.id,
        municipioId: municipio.id,
        fechaHoraEntrega: new Date('2024-01-15T10:00:00')
      });

      const result = await getMunicipalityPerformanceData();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        municipioId: municipio.id,
        municipioNombre: 'Municipio A',
        totalTareas: 2,
        tareasCompletadas: 1,
        porcentajeCompletado: 50,
        actividadesCompletadas: ['Tarea 1']
      });
    });

    it('should count each task only once even with multiple deliveries', async () => {
      // Create municipality
      const municipio = await Municipio.create({
        nombre: 'Municipio B',
        codigo: 'MB01'
      });

      // Create task
      const tarea = await Tarea.create({
        nombre: 'Tarea Multiple',
        divisionId: 1,
        fechaInicio: new Date('2024-01-01'),
        fechaCulminacion: new Date('2024-01-31'),
        estado: 'en_proceso'
      });

      // Create multiple deliveries for same task
      await Entrega.create({
        tareaId: tarea.id,
        municipioId: municipio.id,
        fechaHoraEntrega: new Date('2024-01-15T10:00:00')
      });

      await Entrega.create({
        tareaId: tarea.id,
        municipioId: municipio.id,
        fechaHoraEntrega: new Date('2024-01-16T11:00:00')
      });

      const result = await getMunicipalityPerformanceData();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        totalTareas: 1,
        tareasCompletadas: 1,
        porcentajeCompletado: 100,
        actividadesCompletadas: ['Tarea Multiple']
      });
    });

    it('should return data for multiple municipalities with unique colors', async () => {
      // Create municipalities
      const municipio1 = await Municipio.create({
        nombre: 'Municipio 1',
        codigo: 'M1'
      });

      const municipio2 = await Municipio.create({
        nombre: 'Municipio 2',
        codigo: 'M2'
      });

      // Create tasks
      const tarea1 = await Tarea.create({
        nombre: 'Tarea 1',
        divisionId: 1,
        fechaInicio: new Date('2024-01-01'),
        fechaCulminacion: new Date('2024-01-31'),
        estado: 'en_proceso'
      });

      const tarea2 = await Tarea.create({
        nombre: 'Tarea 2',
        divisionId: 1,
        fechaInicio: new Date('2024-02-01'),
        fechaCulminacion: new Date('2024-02-28'),
        estado: 'en_proceso'
      });

      // Create deliveries
      await Entrega.create({
        tareaId: tarea1.id,
        municipioId: municipio1.id,
        fechaHoraEntrega: new Date('2024-01-15T10:00:00')
      });

      await Entrega.create({
        tareaId: tarea1.id,
        municipioId: municipio2.id,
        fechaHoraEntrega: new Date('2024-01-16T10:00:00')
      });

      await Entrega.create({
        tareaId: tarea2.id,
        municipioId: municipio2.id,
        fechaHoraEntrega: new Date('2024-02-15T10:00:00')
      });

      const result = await getMunicipalityPerformanceData();

      expect(result).toHaveLength(2);
      
      // Check first municipality
      expect(result[0]).toMatchObject({
        municipioNombre: 'Municipio 1',
        totalTareas: 2,
        tareasCompletadas: 1,
        porcentajeCompletado: 50
      });

      // Check second municipality
      expect(result[1]).toMatchObject({
        municipioNombre: 'Municipio 2',
        totalTareas: 2,
        tareasCompletadas: 2,
        porcentajeCompletado: 100
      });

      // Verify unique colors
      expect(result[0].color).not.toBe(result[1].color);
    });

    it('should handle 100% completion correctly', async () => {
      // Create municipality
      const municipio = await Municipio.create({
        nombre: 'Municipio Complete',
        codigo: 'MC01'
      });

      // Create tasks
      const tarea1 = await Tarea.create({
        nombre: 'Tarea 1',
        divisionId: 1,
        fechaInicio: new Date('2024-01-01'),
        fechaCulminacion: new Date('2024-01-31'),
        estado: 'finalizada'
      });

      const tarea2 = await Tarea.create({
        nombre: 'Tarea 2',
        divisionId: 1,
        fechaInicio: new Date('2024-02-01'),
        fechaCulminacion: new Date('2024-02-28'),
        estado: 'finalizada'
      });

      // Create deliveries for all tasks
      await Entrega.create({
        tareaId: tarea1.id,
        municipioId: municipio.id,
        fechaHoraEntrega: new Date('2024-01-15T10:00:00')
      });

      await Entrega.create({
        tareaId: tarea2.id,
        municipioId: municipio.id,
        fechaHoraEntrega: new Date('2024-02-15T10:00:00')
      });

      const result = await getMunicipalityPerformanceData();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        totalTareas: 2,
        tareasCompletadas: 2,
        porcentajeCompletado: 100
      });
    });

    it('should sort municipalities alphabetically by name', async () => {
      // Create municipalities in non-alphabetical order
      await Municipio.create({ nombre: 'Zebra', codigo: 'Z' });
      await Municipio.create({ nombre: 'Alpha', codigo: 'A' });
      await Municipio.create({ nombre: 'Beta', codigo: 'B' });

      const result = await getMunicipalityPerformanceData();

      expect(result).toHaveLength(3);
      expect(result[0].municipioNombre).toBe('Alpha');
      expect(result[1].municipioNombre).toBe('Beta');
      expect(result[2].municipioNombre).toBe('Zebra');
    });

    it('should include all completed task names in actividadesCompletadas', async () => {
      // Create municipality
      const municipio = await Municipio.create({
        nombre: 'Municipio Test',
        codigo: 'MT'
      });

      // Create multiple tasks
      const tarea1 = await Tarea.create({
        nombre: 'Actividad A',
        divisionId: 1,
        fechaInicio: new Date('2024-01-01'),
        fechaCulminacion: new Date('2024-01-31'),
        estado: 'en_proceso'
      });

      const tarea2 = await Tarea.create({
        nombre: 'Actividad B',
        divisionId: 1,
        fechaInicio: new Date('2024-02-01'),
        fechaCulminacion: new Date('2024-02-28'),
        estado: 'en_proceso'
      });

      const tarea3 = await Tarea.create({
        nombre: 'Actividad C',
        divisionId: 1,
        fechaInicio: new Date('2024-03-01'),
        fechaCulminacion: new Date('2024-03-31'),
        estado: 'en_proceso'
      });

      // Create deliveries for tarea1 and tarea3
      await Entrega.create({
        tareaId: tarea1.id,
        municipioId: municipio.id,
        fechaHoraEntrega: new Date('2024-01-15T10:00:00')
      });

      await Entrega.create({
        tareaId: tarea3.id,
        municipioId: municipio.id,
        fechaHoraEntrega: new Date('2024-03-15T10:00:00')
      });

      const result = await getMunicipalityPerformanceData();

      expect(result).toHaveLength(1);
      expect(result[0].actividadesCompletadas).toHaveLength(2);
      expect(result[0].actividadesCompletadas).toContain('Actividad A');
      expect(result[0].actividadesCompletadas).toContain('Actividad C');
      expect(result[0].actividadesCompletadas).not.toContain('Actividad B');
    });
  });

  describe('getMonthlyPerformance', () => {
    it('should return empty municipios array when no tasks exist in month', async () => {
      const { getMonthlyPerformance } = await import('../performanceService');
      
      // Create municipality but no tasks
      await Municipio.create({
        nombre: 'Municipio Test',
        codigo: 'MT01'
      });

      const result = await getMonthlyPerformance(2024, 1);

      expect(result.mes).toBe('2024-01');
      expect(result.municipios).toHaveLength(1);
      expect(result.municipios[0].totalTareasAsignadas).toBe(0);
      expect(result.municipios[0].totalTareasCompletadas).toBe(0);
      expect(result.municipios[0].porcentajeTotal).toBe(0);
    });

    it('should calculate correct monthly percentage with all tasks completed', async () => {
      const { getMonthlyPerformance } = await import('../performanceService');
      
      // Create municipality
      const municipio = await Municipio.create({
        nombre: 'Municipio A',
        codigo: 'MA01'
      });

      // Create tasks in January 2024
      const tarea1 = await Tarea.create({
        nombre: 'Tarea Enero 1',
        divisionId: 1,
        fechaInicio: new Date('2024-01-05'),
        fechaCulminacion: new Date('2024-01-15'),
        estado: 'en_proceso'
      });

      const tarea2 = await Tarea.create({
        nombre: 'Tarea Enero 2',
        divisionId: 1,
        fechaInicio: new Date('2024-01-10'),
        fechaCulminacion: new Date('2024-01-20'),
        estado: 'en_proceso'
      });

      // Create deliveries for all tasks
      await Entrega.create({
        tareaId: tarea1.id,
        municipioId: municipio.id,
        fechaHoraEntrega: new Date('2024-01-14T10:00:00')
      });

      await Entrega.create({
        tareaId: tarea2.id,
        municipioId: municipio.id,
        fechaHoraEntrega: new Date('2024-01-19T10:00:00')
      });

      const result = await getMonthlyPerformance(2024, 1);

      expect(result.mes).toBe('2024-01');
      expect(result.municipios).toHaveLength(1);
      expect(result.municipios[0].municipioNombre).toBe('Municipio A');
      expect(result.municipios[0].totalTareasAsignadas).toBe(2);
      expect(result.municipios[0].totalTareasCompletadas).toBe(2);
      expect(result.municipios[0].porcentajeTotal).toBe(100);
    });

    it('should calculate correct monthly percentage with partial completion', async () => {
      const { getMonthlyPerformance } = await import('../performanceService');
      
      // Create municipality
      const municipio = await Municipio.create({
        nombre: 'Municipio B',
        codigo: 'MB01'
      });

      // Create 4 tasks in February 2024
      const tareas = [];
      for (let i = 1; i <= 4; i++) {
        const tarea = await Tarea.create({
          nombre: `Tarea Feb ${i}`,
          divisionId: 1,
          fechaInicio: new Date(`2024-02-0${i}`),
          fechaCulminacion: new Date(`2024-02-${10 + i}`),
          estado: 'en_proceso'
        });
        tareas.push(tarea);
      }

      // Create deliveries for only 2 tasks (50%)
      await Entrega.create({
        tareaId: tareas[0].id,
        municipioId: municipio.id,
        fechaHoraEntrega: new Date('2024-02-10T10:00:00')
      });

      await Entrega.create({
        tareaId: tareas[2].id,
        municipioId: municipio.id,
        fechaHoraEntrega: new Date('2024-02-15T10:00:00')
      });

      const result = await getMonthlyPerformance(2024, 2);

      expect(result.municipios).toHaveLength(1);
      expect(result.municipios[0].totalTareasAsignadas).toBe(4);
      expect(result.municipios[0].totalTareasCompletadas).toBe(2);
      expect(result.municipios[0].porcentajeTotal).toBe(50);
    });

    it('should only include tasks from specified month', async () => {
      const { getMonthlyPerformance } = await import('../performanceService');
      
      // Create municipality
      const municipio = await Municipio.create({
        nombre: 'Municipio C',
        codigo: 'MC01'
      });

      // Create tasks in March 2024
      const tareaMarzo = await Tarea.create({
        nombre: 'Tarea Marzo',
        divisionId: 1,
        fechaInicio: new Date('2024-03-05'),
        fechaCulminacion: new Date('2024-03-15'),
        estado: 'en_proceso'
      });

      // Create tasks in April 2024 (should not be counted)
      await Tarea.create({
        nombre: 'Tarea Abril',
        divisionId: 1,
        fechaInicio: new Date('2024-04-05'),
        fechaCulminacion: new Date('2024-04-15'),
        estado: 'en_proceso'
      });

      // Create delivery for March task
      await Entrega.create({
        tareaId: tareaMarzo.id,
        municipioId: municipio.id,
        fechaHoraEntrega: new Date('2024-03-10T10:00:00')
      });

      const result = await getMonthlyPerformance(2024, 3);

      expect(result.municipios).toHaveLength(1);
      expect(result.municipios[0].totalTareasAsignadas).toBe(1);
      expect(result.municipios[0].totalTareasCompletadas).toBe(1);
      expect(result.municipios[0].porcentajeTotal).toBe(100);
    });

    it('should handle multiple municipalities correctly', async () => {
      const { getMonthlyPerformance } = await import('../performanceService');
      
      // Create municipalities
      const municipio1 = await Municipio.create({
        nombre: 'Municipio 1',
        codigo: 'M1'
      });

      const municipio2 = await Municipio.create({
        nombre: 'Municipio 2',
        codigo: 'M2'
      });

      // Create tasks in May 2024
      const tarea1 = await Tarea.create({
        nombre: 'Tarea Mayo 1',
        divisionId: 1,
        fechaInicio: new Date('2024-05-01'),
        fechaCulminacion: new Date('2024-05-10'),
        estado: 'en_proceso'
      });

      const tarea2 = await Tarea.create({
        nombre: 'Tarea Mayo 2',
        divisionId: 1,
        fechaInicio: new Date('2024-05-05'),
        fechaCulminacion: new Date('2024-05-15'),
        estado: 'en_proceso'
      });

      // Municipio 1 completes both tasks
      await Entrega.create({
        tareaId: tarea1.id,
        municipioId: municipio1.id,
        fechaHoraEntrega: new Date('2024-05-09T10:00:00')
      });

      await Entrega.create({
        tareaId: tarea2.id,
        municipioId: municipio1.id,
        fechaHoraEntrega: new Date('2024-05-14T10:00:00')
      });

      // Municipio 2 completes only one task
      await Entrega.create({
        tareaId: tarea1.id,
        municipioId: municipio2.id,
        fechaHoraEntrega: new Date('2024-05-09T11:00:00')
      });

      const result = await getMonthlyPerformance(2024, 5);

      expect(result.municipios).toHaveLength(2);
      
      // Check municipio 1
      const mun1Data = result.municipios.find(m => m.municipioNombre === 'Municipio 1');
      expect(mun1Data).toBeDefined();
      expect(mun1Data!.totalTareasAsignadas).toBe(2);
      expect(mun1Data!.totalTareasCompletadas).toBe(2);
      expect(mun1Data!.porcentajeTotal).toBe(100);

      // Check municipio 2
      const mun2Data = result.municipios.find(m => m.municipioNombre === 'Municipio 2');
      expect(mun2Data).toBeDefined();
      expect(mun2Data!.totalTareasAsignadas).toBe(2);
      expect(mun2Data!.totalTareasCompletadas).toBe(1);
      expect(mun2Data!.porcentajeTotal).toBe(50);
    });

    it('should format month string correctly', async () => {
      const { getMonthlyPerformance } = await import('../performanceService');
      
      await Municipio.create({
        nombre: 'Test',
        codigo: 'T'
      });

      // Test single-digit month
      const result1 = await getMonthlyPerformance(2024, 1);
      expect(result1.mes).toBe('2024-01');

      // Test double-digit month
      const result2 = await getMonthlyPerformance(2024, 12);
      expect(result2.mes).toBe('2024-12');
    });
  });
});
