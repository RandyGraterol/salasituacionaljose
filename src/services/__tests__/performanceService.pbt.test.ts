/**
 * Property-Based Tests for Performance Service
 * 
 * Feature: mejoras-ui-funcionales-cdce
 * 
 * These tests use fast-check to verify universal properties that should hold
 * across all valid inputs for municipality performance chart data.
 */

import * as fc from 'fast-check';
import { getMunicipalityPerformanceData, MunicipalityPerformance } from '../performanceService';
import { Municipio, Tarea, Entrega, Division, sequelize } from '../../models';
import { generateColor } from '../../utils/colorGenerator';

/**
 * Test database setup and teardown
 */
let testDivision: Division;

beforeAll(async () => {
  // Don't sync - assume database is already set up
  // await sequelize.sync({ alter: true });
});

beforeEach(async () => {
  // Clean database before each test - use truncate to reset auto-increment
  await Entrega.destroy({ where: {}, truncate: true, cascade: true });
  await Tarea.destroy({ where: {}, truncate: true, cascade: true });
  await Municipio.destroy({ where: {}, truncate: true, cascade: true });
  await Division.destroy({ where: {}, truncate: true, cascade: true });
  
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
 * Property 6: Municipality Performance Chart Data Accuracy
 * 
 * **Validates: Requirements 6.3, 6.4, 6.5**
 * 
 * For any municipality in the performance chart, the displayed completion percentage 
 * should equal (number of tasks with deliveries from that municipality / total number of tasks) × 100,
 * and the chart should list all tasks that the municipality completed.
 */
describe('Property 6: Municipality Performance Chart Data Accuracy', () => {
  test('completion percentage should match formula: (completed tasks / total tasks) × 100', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random number of municipalities (1-10)
        fc.integer({ min: 1, max: 10 }),
        // Generate random number of tasks (1-20)
        fc.integer({ min: 1, max: 20 }),
        // Generate random delivery assignments (which municipalities complete which tasks)
        fc.array(
          fc.record({
            municipioIndex: fc.integer({ min: 0, max: 9 }), // Index into municipalities array
            tareaIndex: fc.integer({ min: 0, max: 19 }), // Index into tasks array
          }),
          { minLength: 0, maxLength: 30 }
        ),
        async (numMunicipalities, numTasks, deliveryAssignments) => {
          // Clean database for this iteration
          await Entrega.destroy({ where: {}, truncate: true, cascade: true });
          await Tarea.destroy({ where: {}, truncate: true, cascade: true });
          await Municipio.destroy({ where: {}, truncate: true, cascade: true });
          
          // Setup: Create municipalities
          const municipios: Municipio[] = [];
          for (let i = 0; i < numMunicipalities; i++) {
            const municipio = await Municipio.create({
              nombre: `Municipio ${i}`,
              codigo: `M${String(i).padStart(3, '0')}`
            });
            municipios.push(municipio);
          }

          // Setup: Create tasks
          const tareas: Tarea[] = [];
          for (let i = 0; i < numTasks; i++) {
            const tarea = await Tarea.create({
              nombre: `Tarea ${i}`,
              divisionId: testDivision.id,
              fechaInicio: new Date('2024-01-01'),
              fechaCulminacion: new Date('2024-12-31'),
              estado: 'en_proceso'
            });
            tareas.push(tarea);
          }

          // Setup: Create deliveries based on random assignments
          // Track which municipality completed which tasks for verification
          const completedTasksByMunicipio = new Map<number, Set<number>>();
          
          for (const assignment of deliveryAssignments) {
            // Only create delivery if indices are valid
            if (assignment.municipioIndex < numMunicipalities && assignment.tareaIndex < numTasks) {
              const municipio = municipios[assignment.municipioIndex];
              const tarea = tareas[assignment.tareaIndex];
              
              // Track completion
              if (!completedTasksByMunicipio.has(municipio.id)) {
                completedTasksByMunicipio.set(municipio.id, new Set());
              }
              completedTasksByMunicipio.get(municipio.id)!.add(tarea.id);
              
              // Create delivery (only if not already created to avoid duplicates)
              const existingDelivery = await Entrega.findOne({
                where: {
                  tareaId: tarea.id,
                  municipioId: municipio.id
                }
              });
              
              if (!existingDelivery) {
                await Entrega.create({
                  tareaId: tarea.id,
                  municipioId: municipio.id,
                  fechaHoraEntrega: new Date(2024, 0, 1 + assignment.tareaIndex, 10, 0, 0)
                });
              }
            }
          }

          // Execute: Get performance data
          const performanceData = await getMunicipalityPerformanceData();

          // Verify: Check each municipality's data
          expect(performanceData.length).toBe(numMunicipalities);

          for (const municipioPerformance of performanceData) {
            const municipio = municipios.find(m => m.id === municipioPerformance.municipioId);
            expect(municipio).toBeDefined();

            // Verify total tasks count
            expect(municipioPerformance.totalTareas).toBe(numTasks);

            // Calculate expected completed tasks
            const completedTasks = completedTasksByMunicipio.get(municipioPerformance.municipioId) || new Set();
            const expectedCompletedCount = completedTasks.size;

            // Verify completed tasks count
            expect(municipioPerformance.tareasCompletadas).toBe(expectedCompletedCount);

            // Verify percentage calculation
            const expectedPercentage = numTasks > 0 
              ? Math.round((expectedCompletedCount / numTasks) * 10000) / 100 
              : 0;
            expect(municipioPerformance.porcentajeCompletado).toBe(expectedPercentage);

            // Verify percentage is between 0 and 100
            expect(municipioPerformance.porcentajeCompletado).toBeGreaterThanOrEqual(0);
            expect(municipioPerformance.porcentajeCompletado).toBeLessThanOrEqual(100);

            // Verify completed activities list length matches count
            expect(municipioPerformance.actividadesCompletadas.length).toBe(expectedCompletedCount);

            // Verify all completed task names are in the list
            for (const tareaId of completedTasks) {
              const tarea = tareas.find(t => t.id === tareaId);
              expect(tarea).toBeDefined();
              expect(municipioPerformance.actividadesCompletadas).toContain(tarea!.nombre);
            }
          }
        }
      ),
      { numRuns: 5 } // Reduced for faster execution
    );
  }, 30000); // 30 second timeout

  test('completed tasks list should contain only unique task names', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5 }), // Number of tasks
        fc.integer({ min: 2, max: 5 }), // Number of deliveries per task (duplicates)
        async (numTasks, deliveriesPerTask) => {
          // Clean database for this iteration
          await Entrega.destroy({ where: {}, truncate: true, cascade: true });
          await Tarea.destroy({ where: {}, truncate: true, cascade: true });
          await Municipio.destroy({ where: {}, truncate: true, cascade: true });
          
          // Create one municipality
          const municipio = await Municipio.create({
            nombre: 'Test Municipio',
            codigo: 'TM01'
          });

          // Create tasks
          const tareas: Tarea[] = [];
          for (let i = 0; i < numTasks; i++) {
            const tarea = await Tarea.create({
              nombre: `Tarea ${i}`,
              divisionId: testDivision.id,
              fechaInicio: new Date('2024-01-01'),
              fechaCulminacion: new Date('2024-12-31'),
              estado: 'en_proceso'
            });
            tareas.push(tarea);

            // Create multiple deliveries for the same task
            for (let j = 0; j < deliveriesPerTask; j++) {
              await Entrega.create({
                tareaId: tarea.id,
                municipioId: municipio.id,
                fechaHoraEntrega: new Date(2024, 0, 1 + j, 10, 0, 0)
              });
            }
          }

          const performanceData = await getMunicipalityPerformanceData();

          expect(performanceData.length).toBe(1);
          
          const municipioPerformance = performanceData[0];
          
          // Verify each task appears only once in completed activities
          const uniqueActivities = new Set(municipioPerformance.actividadesCompletadas);
          expect(uniqueActivities.size).toBe(municipioPerformance.actividadesCompletadas.length);
          
          // Verify count matches number of tasks
          expect(municipioPerformance.tareasCompletadas).toBe(numTasks);
          expect(municipioPerformance.actividadesCompletadas.length).toBe(numTasks);
        }
      ),
      { numRuns: 5 }
    );
  }, 20000);

  test('percentage should be 0 when no tasks are completed', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5 }), // Number of municipalities
        fc.integer({ min: 1, max: 10 }), // Number of tasks
        async (numMunicipalities, numTasks) => {
          // Clean database for this iteration
          await Entrega.destroy({ where: {}, truncate: true, cascade: true });
          await Tarea.destroy({ where: {}, truncate: true, cascade: true });
          await Municipio.destroy({ where: {}, truncate: true, cascade: true });
          
          // Create municipalities
          for (let i = 0; i < numMunicipalities; i++) {
            await Municipio.create({
              nombre: `Municipio ${i}`,
              codigo: `M${i}`
            });
          }

          // Create tasks but no deliveries
          for (let i = 0; i < numTasks; i++) {
            await Tarea.create({
              nombre: `Tarea ${i}`,
              divisionId: testDivision.id,
              fechaInicio: new Date('2024-01-01'),
              fechaCulminacion: new Date('2024-12-31'),
              estado: 'en_proceso'
            });
          }

          const performanceData = await getMunicipalityPerformanceData();

          expect(performanceData.length).toBe(numMunicipalities);

          for (const municipioPerformance of performanceData) {
            expect(municipioPerformance.porcentajeCompletado).toBe(0);
            expect(municipioPerformance.tareasCompletadas).toBe(0);
            expect(municipioPerformance.actividadesCompletadas).toEqual([]);
          }
        }
      ),
      { numRuns: 5 }
    );
  }, 20000);

  test('percentage should be 100 when all tasks are completed', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5 }), // Number of municipalities
        fc.integer({ min: 1, max: 10 }), // Number of tasks
        async (numMunicipalities, numTasks) => {
          // Clean database for this iteration
          await Entrega.destroy({ where: {}, truncate: true, cascade: true });
          await Tarea.destroy({ where: {}, truncate: true, cascade: true });
          await Municipio.destroy({ where: {}, truncate: true, cascade: true });
          
          // Create municipalities
          const municipios: Municipio[] = [];
          for (let i = 0; i < numMunicipalities; i++) {
            const municipio = await Municipio.create({
              nombre: `Municipio ${i}`,
              codigo: `M${i}`
            });
            municipios.push(municipio);
          }

          // Create tasks
          const tareas: Tarea[] = [];
          for (let i = 0; i < numTasks; i++) {
            const tarea = await Tarea.create({
              nombre: `Tarea ${i}`,
              divisionId: testDivision.id,
              fechaInicio: new Date('2024-01-01'),
              fechaCulminacion: new Date('2024-12-31'),
              estado: 'en_proceso'
            });
            tareas.push(tarea);
          }

          // Create deliveries for all tasks for all municipalities
          for (const municipio of municipios) {
            for (const tarea of tareas) {
              await Entrega.create({
                tareaId: tarea.id,
                municipioId: municipio.id,
                fechaHoraEntrega: new Date(2024, 0, 1, 10, 0, 0)
              });
            }
          }

          const performanceData = await getMunicipalityPerformanceData();

          expect(performanceData.length).toBe(numMunicipalities);

          for (const municipioPerformance of performanceData) {
            expect(municipioPerformance.porcentajeCompletado).toBe(100);
            expect(municipioPerformance.tareasCompletadas).toBe(numTasks);
            expect(municipioPerformance.actividadesCompletadas.length).toBe(numTasks);
          }
        }
      ),
      { numRuns: 5 }
    );
  }, 20000);

  test('percentage calculation should handle edge case with 0 total tasks', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5 }), // Number of municipalities
        async (numMunicipalities) => {
          // Clean database for this iteration
          await Entrega.destroy({ where: {}, truncate: true, cascade: true });
          await Tarea.destroy({ where: {}, truncate: true, cascade: true });
          await Municipio.destroy({ where: {}, truncate: true, cascade: true });
          
          // Create municipalities but no tasks
          for (let i = 0; i < numMunicipalities; i++) {
            await Municipio.create({
              nombre: `Municipio ${i}`,
              codigo: `M${i}`
            });
          }

          const performanceData = await getMunicipalityPerformanceData();

          expect(performanceData.length).toBe(numMunicipalities);

          for (const municipioPerformance of performanceData) {
            expect(municipioPerformance.totalTareas).toBe(0);
            expect(municipioPerformance.tareasCompletadas).toBe(0);
            expect(municipioPerformance.porcentajeCompletado).toBe(0);
            expect(municipioPerformance.actividadesCompletadas).toEqual([]);
          }
        }
      ),
      { numRuns: 3 }
    );
  }, 15000);
});

/**
 * Property 7: Municipality Performance Chart Completeness
 * 
 * **Validates: Requirement 6.2**
 * 
 * For any system state, the performance bar chart should contain exactly one bar 
 * for each municipality in the database, and each bar should have a unique color.
 */
describe('Property 7: Municipality Performance Chart Completeness', () => {
  test('chart should contain exactly one bar per municipality', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 15 }), // Number of municipalities
        async (numMunicipalities) => {
          // Clean database for this iteration
          await Entrega.destroy({ where: {}, truncate: true, cascade: true });
          await Tarea.destroy({ where: {}, truncate: true, cascade: true });
          await Municipio.destroy({ where: {}, truncate: true, cascade: true });
          
          // Create municipalities
          const municipios: Municipio[] = [];
          for (let i = 0; i < numMunicipalities; i++) {
            const municipio = await Municipio.create({
              nombre: `Municipio ${i}`,
              codigo: `M${String(i).padStart(3, '0')}`
            });
            municipios.push(municipio);
          }

          // Get performance data
          const performanceData = await getMunicipalityPerformanceData();

          // Verify: One entry per municipality
          expect(performanceData.length).toBe(numMunicipalities);

          // Verify: All municipality IDs are present and unique
          const municipioIds = performanceData.map(p => p.municipioId);
          const uniqueIds = new Set(municipioIds);
          expect(uniqueIds.size).toBe(numMunicipalities);

          // Verify: Each municipality from database is in the performance data
          for (const municipio of municipios) {
            const found = performanceData.find(p => p.municipioId === municipio.id);
            expect(found).toBeDefined();
            expect(found!.municipioNombre).toBe(municipio.nombre);
          }
        }
      ),
      { numRuns: 5 }
    );
  }, 20000);

  test('each bar should have a unique color', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 15 }), // At least 2 municipalities to test uniqueness
        async (numMunicipalities) => {
          // Clean database for this iteration
          await Entrega.destroy({ where: {}, truncate: true, cascade: true });
          await Tarea.destroy({ where: {}, truncate: true, cascade: true });
          await Municipio.destroy({ where: {}, truncate: true, cascade: true });
          
          // Create municipalities
          for (let i = 0; i < numMunicipalities; i++) {
            await Municipio.create({
              nombre: `Municipio ${i}`,
              codigo: `M${i}`
            });
          }

          // Get performance data
          const performanceData = await getMunicipalityPerformanceData();

          // Verify: All colors are defined
          for (const municipioPerformance of performanceData) {
            expect(municipioPerformance.color).toBeDefined();
            expect(typeof municipioPerformance.color).toBe('string');
            expect(municipioPerformance.color).toMatch(/^#[0-9A-F]{6}$/i);
          }

          // Verify: Colors follow the expected pattern from generateColor
          for (let i = 0; i < performanceData.length; i++) {
            const expectedColor = generateColor(i);
            expect(performanceData[i].color).toBe(expectedColor);
          }

          // Note: Colors may repeat if there are more municipalities than colors in the palette
          // But within the palette size, they should be unique
          const colors = performanceData.map(p => p.color);
          const paletteSize = 15; // From colorGenerator.ts
          
          if (numMunicipalities <= paletteSize) {
            // All colors should be unique
            const uniqueColors = new Set(colors);
            expect(uniqueColors.size).toBe(numMunicipalities);
          } else {
            // Colors will cycle, but the pattern should be consistent
            for (let i = 0; i < performanceData.length; i++) {
              expect(performanceData[i].color).toBe(generateColor(i));
            }
          }
        }
      ),
      { numRuns: 5 }
    );
  }, 20000);

  test('chart should be empty when no municipalities exist', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant(null),
        async () => {
          // Don't create any municipalities
          const performanceData = await getMunicipalityPerformanceData();

          expect(performanceData).toEqual([]);
        }
      ),
      { numRuns: 3 }
    );
  }, 10000);

  test('chart should maintain municipality order (alphabetically by name)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          // Use simple alphanumeric strings
          fc.stringMatching(/^[A-Za-z0-9]+$/).filter(s => s.length > 0 && s.length <= 20),
          { minLength: 2, maxLength: 10 }
        ),
        async (municipioNames) => {
          // Clean database for this iteration
          await Entrega.destroy({ where: {}, truncate: true, cascade: true });
          await Tarea.destroy({ where: {}, truncate: true, cascade: true });
          await Municipio.destroy({ where: {}, truncate: true, cascade: true });
          
          // Create municipalities with random names
          const uniqueNames = [...new Set(municipioNames)];
          
          for (let i = 0; i < uniqueNames.length; i++) {
            await Municipio.create({
              nombre: uniqueNames[i],
              codigo: `M${i}`
            });
          }

          const performanceData = await getMunicipalityPerformanceData();

          expect(performanceData.length).toBe(uniqueNames.length);

          // Verify that the order matches what we get from querying municipalities directly
          const municipiosFromDb = await Municipio.findAll({
            order: [['nombre', 'ASC']]
          });
          
          for (let i = 0; i < performanceData.length; i++) {
            expect(performanceData[i].municipioNombre).toBe(municipiosFromDb[i].nombre);
          }
        }
      ),
      { numRuns: 5 }
    );
  }, 20000);

  test('chart data should include all required fields for each municipality', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5 }),
        async (numMunicipalities) => {
          // Clean database for this iteration
          await Entrega.destroy({ where: {}, truncate: true, cascade: true });
          await Tarea.destroy({ where: {}, truncate: true, cascade: true });
          await Municipio.destroy({ where: {}, truncate: true, cascade: true });
          
          // Create municipalities
          for (let i = 0; i < numMunicipalities; i++) {
            await Municipio.create({
              nombre: `Municipio ${i}`,
              codigo: `M${i}`
            });
          }

          const performanceData = await getMunicipalityPerformanceData();

          for (const municipioPerformance of performanceData) {
            // Verify all required fields are present
            expect(municipioPerformance).toHaveProperty('municipioId');
            expect(municipioPerformance).toHaveProperty('municipioNombre');
            expect(municipioPerformance).toHaveProperty('totalTareas');
            expect(municipioPerformance).toHaveProperty('tareasCompletadas');
            expect(municipioPerformance).toHaveProperty('porcentajeCompletado');
            expect(municipioPerformance).toHaveProperty('actividadesCompletadas');
            expect(municipioPerformance).toHaveProperty('color');

            // Verify field types
            expect(typeof municipioPerformance.municipioId).toBe('number');
            expect(typeof municipioPerformance.municipioNombre).toBe('string');
            expect(typeof municipioPerformance.totalTareas).toBe('number');
            expect(typeof municipioPerformance.tareasCompletadas).toBe('number');
            expect(typeof municipioPerformance.porcentajeCompletado).toBe('number');
            expect(Array.isArray(municipioPerformance.actividadesCompletadas)).toBe(true);
            expect(typeof municipioPerformance.color).toBe('string');

            // Verify field constraints
            expect(municipioPerformance.municipioId).toBeGreaterThan(0);
            expect(municipioPerformance.municipioNombre.length).toBeGreaterThan(0);
            expect(municipioPerformance.totalTareas).toBeGreaterThanOrEqual(0);
            expect(municipioPerformance.tareasCompletadas).toBeGreaterThanOrEqual(0);
            expect(municipioPerformance.tareasCompletadas).toBeLessThanOrEqual(municipioPerformance.totalTareas);
          }
        }
      ),
      { numRuns: 5 }
    );
  }, 20000);
});

/**
 * Property 8: Monthly Performance Calculation Accuracy
 * 
 * **Validates: Requirements 7.4, 7.5, 7.6**
 * 
 * For any municipality and any selected month, the displayed monthly completion percentage 
 * should equal (tasks completed by that municipality in that month / total tasks assigned in that month) × 100,
 * and the percentage should be between 0 and 100 inclusive.
 */
describe('Property 8: Monthly Performance Calculation Accuracy', () => {
  test('monthly percentage should match formula: (completed tasks in month / total tasks in month) × 100', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2020, max: 2030 }), // Year
        fc.integer({ min: 1, max: 12 }), // Month
        fc.integer({ min: 1, max: 5 }), // Number of municipalities
        fc.integer({ min: 1, max: 10 }), // Number of tasks in month
        fc.array(
          fc.record({
            municipioIndex: fc.integer({ min: 0, max: 4 }),
            tareaIndex: fc.integer({ min: 0, max: 9 })
          }),
          { minLength: 0, maxLength: 20 }
        ),
        async (year, month, numMunicipalities, numTasks, deliveryAssignments) => {
          // Clean database for this iteration
          await Entrega.destroy({ where: {}, truncate: true, cascade: true });
          await Tarea.destroy({ where: {}, truncate: true, cascade: true });
          await Municipio.destroy({ where: {}, truncate: true, cascade: true });
          
          // Create municipalities
          const municipios: Municipio[] = [];
          for (let i = 0; i < numMunicipalities; i++) {
            const municipio = await Municipio.create({
              nombre: `Municipio ${i}`,
              codigo: `M${i}`
            });
            municipios.push(municipio);
          }

          // Create tasks in the specified month
          const tareas: Tarea[] = [];
          for (let i = 0; i < numTasks; i++) {
            const fechaInicio = new Date(year, month - 1, 1 + i);
            const fechaCulminacion = new Date(year, month - 1, 15 + i);
            
            const tarea = await Tarea.create({
              nombre: `Tarea ${i}`,
              divisionId: testDivision.id,
              fechaInicio,
              fechaCulminacion,
              estado: 'en_proceso'
            });
            tareas.push(tarea);
          }

          // Track which municipality completed which tasks
          const completedTasksByMunicipio = new Map<number, Set<number>>();
          
          for (const assignment of deliveryAssignments) {
            if (assignment.municipioIndex < numMunicipalities && assignment.tareaIndex < numTasks) {
              const municipio = municipios[assignment.municipioIndex];
              const tarea = tareas[assignment.tareaIndex];
              
              if (!completedTasksByMunicipio.has(municipio.id)) {
                completedTasksByMunicipio.set(municipio.id, new Set());
              }
              completedTasksByMunicipio.get(municipio.id)!.add(tarea.id);
              
              // Create delivery if not exists
              const existingDelivery = await Entrega.findOne({
                where: {
                  tareaId: tarea.id,
                  municipioId: municipio.id
                }
              });
              
              if (!existingDelivery) {
                await Entrega.create({
                  tareaId: tarea.id,
                  municipioId: municipio.id,
                  fechaHoraEntrega: new Date(year, month - 1, 10, 10, 0, 0)
                });
              }
            }
          }

          // Execute: Get monthly performance data
          const { getMonthlyPerformance } = await import('../performanceService');
          const monthlyData = await getMonthlyPerformance(year, month);

          // Verify: Check each municipality's data
          expect(monthlyData.municipios.length).toBe(numMunicipalities);

          for (const municipioData of monthlyData.municipios) {
            const municipio = municipios.find(m => m.id === municipioData.municipioId);
            expect(municipio).toBeDefined();

            // Calculate expected values
            const completedTasks = completedTasksByMunicipio.get(municipioData.municipioId) || new Set();
            const expectedCompletedCount = completedTasks.size;
            const expectedPercentage = numTasks > 0 
              ? Math.round((expectedCompletedCount / numTasks) * 10000) / 100 
              : 0;

            // Verify total tasks assigned
            expect(municipioData.totalTareasAsignadas).toBe(numTasks);

            // Verify completed tasks count
            expect(municipioData.totalTareasCompletadas).toBe(expectedCompletedCount);

            // Verify percentage calculation
            expect(municipioData.porcentajeTotal).toBe(expectedPercentage);

            // Verify percentage is between 0 and 100
            expect(municipioData.porcentajeTotal).toBeGreaterThanOrEqual(0);
            expect(municipioData.porcentajeTotal).toBeLessThanOrEqual(100);
          }
        }
      ),
      { numRuns: 5 }
    );
  }, 30000);

  test('monthly percentage should be 0 when no tasks are completed in month', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2020, max: 2030 }),
        fc.integer({ min: 1, max: 12 }),
        fc.integer({ min: 1, max: 5 }),
        fc.integer({ min: 1, max: 10 }),
        async (year, month, numMunicipalities, numTasks) => {
          // Clean database
          await Entrega.destroy({ where: {}, truncate: true, cascade: true });
          await Tarea.destroy({ where: {}, truncate: true, cascade: true });
          await Municipio.destroy({ where: {}, truncate: true, cascade: true });
          
          // Create municipalities
          for (let i = 0; i < numMunicipalities; i++) {
            await Municipio.create({
              nombre: `Municipio ${i}`,
              codigo: `M${i}`
            });
          }

          // Create tasks but no deliveries
          for (let i = 0; i < numTasks; i++) {
            await Tarea.create({
              nombre: `Tarea ${i}`,
              divisionId: testDivision.id,
              fechaInicio: new Date(year, month - 1, 1 + i),
              fechaCulminacion: new Date(year, month - 1, 15 + i),
              estado: 'en_proceso'
            });
          }

          const { getMonthlyPerformance } = await import('../performanceService');
          const monthlyData = await getMonthlyPerformance(year, month);

          for (const municipioData of monthlyData.municipios) {
            expect(municipioData.porcentajeTotal).toBe(0);
            expect(municipioData.totalTareasCompletadas).toBe(0);
          }
        }
      ),
      { numRuns: 5 }
    );
  }, 20000);

  test('monthly percentage should be 100 when all tasks are completed in month', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2020, max: 2030 }),
        fc.integer({ min: 1, max: 12 }),
        fc.integer({ min: 1, max: 5 }),
        fc.integer({ min: 1, max: 10 }),
        async (year, month, numMunicipalities, numTasks) => {
          // Clean database
          await Entrega.destroy({ where: {}, truncate: true, cascade: true });
          await Tarea.destroy({ where: {}, truncate: true, cascade: true });
          await Municipio.destroy({ where: {}, truncate: true, cascade: true });
          
          // Create municipalities
          const municipios: Municipio[] = [];
          for (let i = 0; i < numMunicipalities; i++) {
            const municipio = await Municipio.create({
              nombre: `Municipio ${i}`,
              codigo: `M${i}`
            });
            municipios.push(municipio);
          }

          // Create tasks
          const tareas: Tarea[] = [];
          for (let i = 0; i < numTasks; i++) {
            const tarea = await Tarea.create({
              nombre: `Tarea ${i}`,
              divisionId: testDivision.id,
              fechaInicio: new Date(year, month - 1, 1 + i),
              fechaCulminacion: new Date(year, month - 1, 15 + i),
              estado: 'en_proceso'
            });
            tareas.push(tarea);
          }

          // Create deliveries for all tasks for all municipalities
          for (const municipio of municipios) {
            for (const tarea of tareas) {
              await Entrega.create({
                tareaId: tarea.id,
                municipioId: municipio.id,
                fechaHoraEntrega: new Date(year, month - 1, 10, 10, 0, 0)
              });
            }
          }

          const { getMonthlyPerformance } = await import('../performanceService');
          const monthlyData = await getMonthlyPerformance(year, month);

          for (const municipioData of monthlyData.municipios) {
            expect(municipioData.porcentajeTotal).toBe(100);
            expect(municipioData.totalTareasCompletadas).toBe(numTasks);
            expect(municipioData.totalTareasAsignadas).toBe(numTasks);
          }
        }
      ),
      { numRuns: 5 }
    );
  }, 20000);

  test('monthly data should only include tasks from the specified month', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2020, max: 2030 }),
        fc.integer({ min: 1, max: 11 }), // Not December to have a next month
        async (year, month) => {
          // Clean database
          await Entrega.destroy({ where: {}, truncate: true, cascade: true });
          await Tarea.destroy({ where: {}, truncate: true, cascade: true });
          await Municipio.destroy({ where: {}, truncate: true, cascade: true });
          
          // Create one municipality
          const municipio = await Municipio.create({
            nombre: 'Test Municipio',
            codigo: 'TM01'
          });

          // Create tasks in the target month
          const tareasInMonth: Tarea[] = [];
          for (let i = 0; i < 3; i++) {
            const tarea = await Tarea.create({
              nombre: `Tarea en mes ${i}`,
              divisionId: testDivision.id,
              fechaInicio: new Date(year, month - 1, 1 + i),
              fechaCulminacion: new Date(year, month - 1, 15 + i),
              estado: 'en_proceso'
            });
            tareasInMonth.push(tarea);
          }

          // Create tasks in the next month (should not be counted)
          for (let i = 0; i < 2; i++) {
            await Tarea.create({
              nombre: `Tarea fuera de mes ${i}`,
              divisionId: testDivision.id,
              fechaInicio: new Date(year, month, 1 + i), // Next month
              fechaCulminacion: new Date(year, month, 15 + i),
              estado: 'en_proceso'
            });
          }

          // Create deliveries only for tasks in the target month
          for (const tarea of tareasInMonth) {
            await Entrega.create({
              tareaId: tarea.id,
              municipioId: municipio.id,
              fechaHoraEntrega: new Date(year, month - 1, 10, 10, 0, 0)
            });
          }

          const { getMonthlyPerformance } = await import('../performanceService');
          const monthlyData = await getMonthlyPerformance(year, month);

          expect(monthlyData.municipios.length).toBe(1);
          
          const municipioData = monthlyData.municipios[0];
          
          // Should only count tasks from the target month
          expect(municipioData.totalTareasAsignadas).toBe(3);
          expect(municipioData.totalTareasCompletadas).toBe(3);
          expect(municipioData.porcentajeTotal).toBe(100);
        }
      ),
      { numRuns: 5 }
    );
  }, 20000);

  test('division breakdown should sum to total for each municipality', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2020, max: 2030 }),
        fc.integer({ min: 1, max: 12 }),
        fc.integer({ min: 2, max: 4 }), // Number of divisions
        fc.integer({ min: 1, max: 3 }), // Tasks per division
        async (year, month, numDivisions, tasksPerDivision) => {
          // Clean database
          await Entrega.destroy({ where: {}, truncate: true, cascade: true });
          await Tarea.destroy({ where: {}, truncate: true, cascade: true });
          await Municipio.destroy({ where: {}, truncate: true, cascade: true });
          await Division.destroy({ where: {}, truncate: true, cascade: true });
          
          // Create one municipality
          const municipio = await Municipio.create({
            nombre: 'Test Municipio',
            codigo: 'TM01'
          });

          // Create divisions
          const divisiones: Division[] = [];
          for (let i = 0; i < numDivisions; i++) {
            const division = await Division.create({
              nombre: `Division ${i}`,
              descripcion: `Test division ${i}`
            });
            divisiones.push(division);
          }

          // Create tasks for each division
          let totalTasks = 0;
          for (const division of divisiones) {
            for (let i = 0; i < tasksPerDivision; i++) {
              await Tarea.create({
                nombre: `Tarea ${division.nombre} ${i}`,
                divisionId: division.id,
                fechaInicio: new Date(year, month - 1, 1 + i),
                fechaCulminacion: new Date(year, month - 1, 15 + i),
                estado: 'en_proceso'
              });
              totalTasks++;
            }
          }

          const { getMonthlyPerformance } = await import('../performanceService');
          const monthlyData = await getMonthlyPerformance(year, month);

          expect(monthlyData.municipios.length).toBe(1);
          
          const municipioData = monthlyData.municipios[0];
          
          // Sum of division tasks should equal total
          let sumAsignadas = 0;
          let sumCompletadas = 0;
          
          for (const divisionData of municipioData.divisionData) {
            sumAsignadas += divisionData.tareasAsignadas;
            sumCompletadas += divisionData.tareasCompletadas;
          }
          
          expect(sumAsignadas).toBe(municipioData.totalTareasAsignadas);
          expect(sumCompletadas).toBe(municipioData.totalTareasCompletadas);
          expect(sumAsignadas).toBe(totalTasks);
        }
      ),
      { numRuns: 5 }
    );
  }, 25000);
});

