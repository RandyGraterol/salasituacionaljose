/**
 * Property-Based Tests for DeliveryService
 * 
 * Feature: mejoras-ui-funcionales-cdce
 * 
 * These tests use fast-check to verify universal properties that should hold
 * across all valid inputs, complementing the unit tests with randomized testing.
 */

import * as fc from 'fast-check';
import deliveryService from '../deliveryService';
import { Entrega, Municipio, Tarea, Division, sequelize } from '../../models';

/**
 * Test database setup and teardown
 */
let testDivision: Division;

beforeAll(async () => {
  // Don't sync - assume database is already set up
  // await sequelize.sync({ alter: true });
});

beforeEach(async () => {
  // Clean database before each test
  await Entrega.destroy({ where: {}, force: true });
  await Tarea.destroy({ where: {}, force: true });
  await Municipio.destroy({ where: {}, force: true });
  await Division.destroy({ where: {}, force: true });
  
  // Create a fresh division for each test
  testDivision = await Division.create({
    nombre: 'Test Division',
    descripcion: 'Division for testing'
  });
});

afterAll(async () => {
  // Don't close the connection - let Jest handle it
  // await sequelize.close();
});

/**
 * Property 1: Unique Municipality Delivery Counting
 * 
 * **Validates: Requirements 3.1, 3.2**
 * 
 * For any task with deliveries, the displayed delivery count should equal 
 * the number of distinct municipalities that have submitted at least one delivery,
 * regardless of how many times each municipality submitted.
 */
describe('Property 1: Unique Municipality Delivery Counting', () => {
  test('count should equal number of distinct municipality IDs regardless of duplicate deliveries', async () => {
    // Property-based test with reduced iterations for faster execution
    await fc.assert(
      fc.asyncProperty(
        // Generate an array of delivery records with potential duplicates
        fc.array(
          fc.record({
            municipioId: fc.integer({ min: 1, max: 10 }), // 10 possible municipalities
            fechaHoraEntrega: fc.date({
              min: new Date('2024-01-01'),
              max: new Date('2024-12-31')
            })
          }),
          { minLength: 0, maxLength: 15 } // 0 to 15 deliveries
        ),
        async (deliveryRecords) => {

          // Setup: Create a task
          const tarea = await Tarea.create({
            nombre: 'Test Task',
            divisionId: testDivision.id,
            fechaInicio: new Date('2024-01-01'),
            fechaCulminacion: new Date('2024-12-31'),
            estado: 'en_proceso'
          });

          // Create all unique municipalities that appear in the delivery records
          const uniqueMunicipioIds = [...new Set(deliveryRecords.map(d => d.municipioId))];
          const municipioMap = new Map<number, Municipio>();
          
          for (const municipioId of uniqueMunicipioIds) {
            const municipio = await Municipio.create({
              nombre: `Municipio ${municipioId}`,
              codigo: `M${municipioId}`
            });
            municipioMap.set(municipioId, municipio);
          }

          // Create deliveries (including potential duplicates from same municipality)
          for (const record of deliveryRecords) {
            const municipio = municipioMap.get(record.municipioId);
            if (municipio) {
              await Entrega.create({
                tareaId: tarea.id,
                municipioId: municipio.id,
                fechaHoraEntrega: record.fechaHoraEntrega
              });
            }
          }

          // Execute: Count unique municipalities
          const result = await deliveryService.countUniqueMunicipalitiesForTask(tarea.id);

          // Calculate expected count: number of distinct municipality IDs
          const expectedCount = uniqueMunicipioIds.length;

          // Verify: Count matches number of distinct municipalities
          expect(result.totalMunicipalities).toBe(expectedCount);

          // Additional invariant: totalMunicipalities should equal length of uniqueMunicipalityIds array
          expect(result.totalMunicipalities).toBe(result.uniqueMunicipalityIds.length);

          // Additional invariant: all IDs in uniqueMunicipalityIds should be unique
          const uniqueCheck = new Set(result.uniqueMunicipalityIds);
          expect(uniqueCheck.size).toBe(result.uniqueMunicipalityIds.length);
        }
      ),
      { numRuns: 5 } // Reduced for faster execution
    );
  }, 15000); // 15 second timeout

  test('count should be zero when no deliveries exist', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant(null), // No input needed
        async () => {

          const tarea = await Tarea.create({
            nombre: 'Empty Task',
            divisionId: testDivision.id,
            fechaInicio: new Date('2024-01-01'),
            fechaCulminacion: new Date('2024-12-31'),
            estado: 'en_proceso'
          });

          const result = await deliveryService.countUniqueMunicipalitiesForTask(tarea.id);

          expect(result.totalMunicipalities).toBe(0);
          expect(result.uniqueMunicipalityIds).toEqual([]);
        }
      ),
      { numRuns: 3 }
    );
  }, 10000);

  test('count should be one when only one municipality has delivered', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10 }), // Number of deliveries
        async (deliveryCount) => {

          const tarea = await Tarea.create({
            nombre: 'Test Task',
            divisionId: testDivision.id,
            fechaInicio: new Date('2024-01-01'),
            fechaCulminacion: new Date('2024-12-31'),
            estado: 'en_proceso'
          });

          const municipio = await Municipio.create({
            nombre: 'Single Municipio',
            codigo: 'SM1'
          });

          for (let i = 0; i < deliveryCount; i++) {
            await Entrega.create({
              tareaId: tarea.id,
              municipioId: municipio.id,
              fechaHoraEntrega: new Date(2024, 0, i + 1, 10, 0, 0)
            });
          }

          const result = await deliveryService.countUniqueMunicipalitiesForTask(tarea.id);

          expect(result.totalMunicipalities).toBe(1);
          expect(result.uniqueMunicipalityIds).toEqual([municipio.id]);
        }
      ),
      { numRuns: 5 }
    );
  }, 15000);

  test('count should handle multiple municipalities delivering multiple times', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5 }), // Number of municipalities
        fc.integer({ min: 2, max: 3 }), // Deliveries per municipality
        async (numMunicipalities, deliveriesPerMunicipality) => {

          const tarea = await Tarea.create({
            nombre: 'Test Task',
            divisionId: testDivision.id,
            fechaInicio: new Date('2024-01-01'),
            fechaCulminacion: new Date('2024-12-31'),
            estado: 'en_proceso'
          });

          const municipios: Municipio[] = [];
          for (let i = 0; i < numMunicipalities; i++) {
            const municipio = await Municipio.create({
              nombre: `Municipio ${i}`,
              codigo: `M${i}`
            });
            municipios.push(municipio);
          }

          for (const municipio of municipios) {
            for (let i = 0; i < deliveriesPerMunicipality; i++) {
              await Entrega.create({
                tareaId: tarea.id,
                municipioId: municipio.id,
                fechaHoraEntrega: new Date(2024, 0, i + 1, municipio.id % 24, 0, 0)
              });
            }
          }

          const result = await deliveryService.countUniqueMunicipalitiesForTask(tarea.id);

          expect(result.totalMunicipalities).toBe(numMunicipalities);
          
          const expectedIds = municipios.map(m => m.id).sort((a, b) => a - b);
          const actualIds = result.uniqueMunicipalityIds.sort((a, b) => a - b);
          expect(actualIds).toEqual(expectedIds);
        }
      ),
      { numRuns: 5 }
    );
  }, 20000);
});

/**
 * Property 2: Chronological Delivery Sorting
 * 
 * **Validates: Requirements 4.1, 4.4**
 * 
 * For any task with multiple deliveries, when the deliveries are displayed,
 * they should be sorted by their fechaHoraEntrega timestamp in ascending order
 * (earliest first), considering both date and time components.
 */
describe('Property 2: Chronological Delivery Sorting', () => {
  test('deliveries should be sorted by timestamp in ascending order', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            municipioId: fc.integer({ min: 1, max: 10 }),
            fechaHoraEntrega: fc.date({
              min: new Date('2024-01-01T00:00:00'),
              max: new Date('2024-12-31T23:59:59')
            }).filter(d => !isNaN(d.getTime()))
          }),
          { minLength: 2, maxLength: 15 }
        ),
        async (deliveryRecords) => {

          const tarea = await Tarea.create({
            nombre: 'Test Task for Sorting',
            divisionId: testDivision.id,
            fechaInicio: new Date('2024-01-01'),
            fechaCulminacion: new Date('2024-12-31'),
            estado: 'en_proceso'
          });

          const uniqueMunicipioIds = [...new Set(deliveryRecords.map(d => d.municipioId))];
          const municipioMap = new Map<number, Municipio>();
          
          for (const municipioId of uniqueMunicipioIds) {
            const municipio = await Municipio.create({
              nombre: `Municipio ${municipioId}`,
              codigo: `M${municipioId}`
            });
            municipioMap.set(municipioId, municipio);
          }

          for (const record of deliveryRecords) {
            const municipio = municipioMap.get(record.municipioId);
            if (municipio) {
              await Entrega.create({
                tareaId: tarea.id,
                municipioId: municipio.id,
                fechaHoraEntrega: record.fechaHoraEntrega
              });
            }
          }

          const sortedDeliveries = await deliveryService.getSortedDeliveriesForTask(tarea.id);

          for (let i = 0; i < sortedDeliveries.length - 1; i++) {
            const currentTimestamp = new Date(sortedDeliveries[i].fechaHoraEntrega).getTime();
            const nextTimestamp = new Date(sortedDeliveries[i + 1].fechaHoraEntrega).getTime();
            expect(currentTimestamp).toBeLessThanOrEqual(nextTimestamp);
          }

          expect(sortedDeliveries.length).toBe(deliveryRecords.length);
        }
      ),
      { numRuns: 5 }
    );
  }, 15000);

  test('should handle edge case: same date, different times', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 23 }),
        fc.integer({ min: 0, max: 23 }),
        fc.integer({ min: 0, max: 59 }),
        fc.integer({ min: 0, max: 59 }),
        async (hour1, hour2, minute1, minute2) => {

          const tarea = await Tarea.create({
            nombre: 'Test Task Same Date',
            divisionId: testDivision.id,
            fechaInicio: new Date('2024-01-01'),
            fechaCulminacion: new Date('2024-12-31'),
            estado: 'en_proceso'
          });

          const municipio1 = await Municipio.create({
            nombre: 'Municipio 1',
            codigo: 'M1'
          });

          const municipio2 = await Municipio.create({
            nombre: 'Municipio 2',
            codigo: 'M2'
          });

          const baseDate = new Date('2024-06-15');
          const delivery1Time = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), hour1, minute1, 0);
          const delivery2Time = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), hour2, minute2, 0);

          await Entrega.create({
            tareaId: tarea.id,
            municipioId: municipio1.id,
            fechaHoraEntrega: delivery1Time
          });

          await Entrega.create({
            tareaId: tarea.id,
            municipioId: municipio2.id,
            fechaHoraEntrega: delivery2Time
          });

          const sortedDeliveries = await deliveryService.getSortedDeliveriesForTask(tarea.id);

          expect(sortedDeliveries.length).toBe(2);
          
          const firstTimestamp = new Date(sortedDeliveries[0].fechaHoraEntrega).getTime();
          const secondTimestamp = new Date(sortedDeliveries[1].fechaHoraEntrega).getTime();
          
          expect(firstTimestamp).toBeLessThanOrEqual(secondTimestamp);
          
          if (delivery1Time.getTime() !== delivery2Time.getTime()) {
            const earlierTime = Math.min(delivery1Time.getTime(), delivery2Time.getTime());
            expect(firstTimestamp).toBe(earlierTime);
          }
        }
      ),
      { numRuns: 5 }
    );
  }, 15000);

  test('should maintain chronological order with duplicate timestamps', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.date({
          min: new Date('2024-01-01T00:00:00'),
          max: new Date('2024-12-31T23:59:59')
        }).filter(d => !isNaN(d.getTime())),
        fc.integer({ min: 2, max: 4 }),
        async (timestamp, numDeliveries) => {

          const tarea = await Tarea.create({
            nombre: 'Test Task Duplicate Timestamps',
            divisionId: testDivision.id,
            fechaInicio: new Date('2024-01-01'),
            fechaCulminacion: new Date('2024-12-31'),
            estado: 'en_proceso'
          });

          for (let i = 0; i < numDeliveries; i++) {
            const municipio = await Municipio.create({
              nombre: `Municipio ${i}`,
              codigo: `M${i}`
            });

            await Entrega.create({
              tareaId: tarea.id,
              municipioId: municipio.id,
              fechaHoraEntrega: timestamp
            });
          }

          const sortedDeliveries = await deliveryService.getSortedDeliveriesForTask(tarea.id);

          expect(sortedDeliveries.length).toBe(numDeliveries);

          for (let i = 0; i < sortedDeliveries.length - 1; i++) {
            const currentTimestamp = new Date(sortedDeliveries[i].fechaHoraEntrega).getTime();
            const nextTimestamp = new Date(sortedDeliveries[i + 1].fechaHoraEntrega).getTime();
            expect(currentTimestamp).toBeLessThanOrEqual(nextTimestamp);
          }
        }
      ),
      { numRuns: 5 }
    );
  }, 15000);

  test('should sort correctly with wide range of timestamps', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant(null),
        async () => {

          const tarea = await Tarea.create({
            nombre: 'Test Task Wide Range',
            divisionId: testDivision.id,
            fechaInicio: new Date('2024-01-01'),
            fechaCulminacion: new Date('2024-12-31'),
            estado: 'en_proceso'
          });

          const timestamps = [
            new Date('2024-12-31T23:59:59'),
            new Date('2024-01-01T00:00:00'),
            new Date('2024-06-15T12:30:45'),
            new Date('2024-03-20T08:15:30'),
            new Date('2024-09-10T18:45:20')
          ];

          for (let i = 0; i < timestamps.length; i++) {
            const municipio = await Municipio.create({
              nombre: `Municipio ${i}`,
              codigo: `M${i}`
            });

            await Entrega.create({
              tareaId: tarea.id,
              municipioId: municipio.id,
              fechaHoraEntrega: timestamps[i]
            });
          }

          const sortedDeliveries = await deliveryService.getSortedDeliveriesForTask(tarea.id);

          expect(sortedDeliveries.length).toBe(timestamps.length);
          
          const expectedOrder = [...timestamps].sort((a, b) => a.getTime() - b.getTime());
          
          for (let i = 0; i < sortedDeliveries.length; i++) {
            const actualTimestamp = new Date(sortedDeliveries[i].fechaHoraEntrega).getTime();
            const expectedTimestamp = expectedOrder[i].getTime();
            expect(actualTimestamp).toBe(expectedTimestamp);
          }
        }
      ),
      { numRuns: 3 }
    );
  }, 10000);
});
