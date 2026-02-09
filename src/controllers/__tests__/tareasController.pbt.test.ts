/**
 * Property-Based Tests for Tareas Controller - File Upload
 * Feature: mejoras-ui-funcionales-cdce
 * Property 5: File Association with Delivery
 * Validates: Requirements 5.7
 */

import * as fc from 'fast-check';
import { Entrega, Municipio, Tarea, Division, sequelize } from '../../models';
import path from 'path';

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
 * Property 5: File Association with Delivery
 * 
 * **Validates: Requirements 5.7**
 * 
 * For any successfully uploaded file during delivery creation, querying the delivery 
 * record from the database should return a non-null archivoUrl field containing 
 * the path to the uploaded file.
 */
describe('Property 5: File Association with Delivery', () => {
  test('delivery with file upload should have non-null archivoUrl with valid path', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random file information
        fc.record({
          filename: fc.string({ minLength: 5, maxLength: 30 })
            .filter(s => s.trim().length > 0)
            .map(s => s.replace(/[\/\\:*?"<>|]/g, '_')), // Remove invalid filename chars
          extension: fc.constantFrom('.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.pdf'),
          fechaHoraEntrega: fc.date({
            min: new Date('2024-01-01'),
            max: new Date('2024-12-31')
          })
        }),
        async (fileInfo) => {
          // Setup: Create task and municipality
          const tarea = await Tarea.create({
            nombre: 'Test Task with File',
            divisionId: testDivision.id,
            fechaInicio: new Date('2024-01-01'),
            fechaCulminacion: new Date('2024-12-31'),
            estado: 'en_proceso'
          });

          const municipio = await Municipio.create({
            nombre: 'Test Municipio',
            codigo: 'TM1'
          });

          // Simulate file upload by creating a file path
          const uploadedFilename = `${Date.now()}-${fileInfo.filename}${fileInfo.extension}`;
          const archivoUrl = `/uploads/entregas/${uploadedFilename}`;

          // Create delivery with file URL (simulating successful file upload)
          const entrega = await Entrega.create({
            tareaId: tarea.id,
            municipioId: municipio.id,
            fechaHoraEntrega: fileInfo.fechaHoraEntrega,
            archivoUrl: archivoUrl
          });

          // Execute: Query the delivery from database
          const queriedEntrega = await Entrega.findByPk(entrega.id);

          // Verify: archivoUrl field is not null
          expect(queriedEntrega).not.toBeNull();
          expect(queriedEntrega!.archivoUrl).not.toBeNull();
          expect(queriedEntrega!.archivoUrl).toBeDefined();

          // Verify: archivoUrl contains a valid path
          expect(queriedEntrega!.archivoUrl).toContain('/uploads/entregas/');
          expect(queriedEntrega!.archivoUrl).toContain(fileInfo.extension);

          // Verify: archivoUrl matches what was stored
          expect(queriedEntrega!.archivoUrl).toBe(archivoUrl);

          // Additional invariant: archivoUrl should be a non-empty string
          expect(typeof queriedEntrega!.archivoUrl).toBe('string');
          expect(queriedEntrega!.archivoUrl!.length).toBeGreaterThan(0);

          // Additional invariant: archivoUrl should start with /uploads/entregas/
          expect(queriedEntrega!.archivoUrl).toMatch(/^\/uploads\/entregas\/.+/);
        }
      ),
      { numRuns: 5 }
    );
  }, 30000); // 30 second timeout

  test('delivery without file upload should have null or undefined archivoUrl', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.date({
          min: new Date('2024-01-01'),
          max: new Date('2024-12-31')
        }),
        async (fechaHoraEntrega) => {
          // Setup: Create task and municipality
          const tarea = await Tarea.create({
            nombre: 'Test Task without File',
            divisionId: testDivision.id,
            fechaInicio: new Date('2024-01-01'),
            fechaCulminacion: new Date('2024-12-31'),
            estado: 'en_proceso'
          });

          const municipio = await Municipio.create({
            nombre: 'Test Municipio',
            codigo: 'TM2'
          });

          // Create delivery without file URL (no file uploaded)
          const entrega = await Entrega.create({
            tareaId: tarea.id,
            municipioId: municipio.id,
            fechaHoraEntrega: fechaHoraEntrega
            // archivoUrl is intentionally omitted
          });

          // Execute: Query the delivery from database
          const queriedEntrega = await Entrega.findByPk(entrega.id);

          // Verify: archivoUrl field is null or undefined (optional field)
          expect(queriedEntrega).not.toBeNull();
          // Sequelize returns null for optional fields that are not set
          expect(queriedEntrega!.archivoUrl).toBeNull();
        }
      ),
      { numRuns: 5 }
    );
  }, 30000);

  test('multiple deliveries with files should each have unique archivoUrl', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate array of file information for multiple deliveries
        fc.array(
          fc.record({
            filename: fc.string({ minLength: 5, maxLength: 20 })
              .filter(s => s.trim().length > 0)
              .map(s => s.replace(/[\/\\:*?"<>|]/g, '_')),
            extension: fc.constantFrom('.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.pdf'),
            fechaHoraEntrega: fc.date({
              min: new Date('2024-01-01'),
              max: new Date('2024-12-31')
            })
          }),
          { minLength: 2, maxLength: 5 } // 2 to 5 deliveries
        ),
        async (fileInfos) => {
          // Setup: Create task
          const tarea = await Tarea.create({
            nombre: 'Test Task Multiple Files',
            divisionId: testDivision.id,
            fechaInicio: new Date('2024-01-01'),
            fechaCulminacion: new Date('2024-12-31'),
            estado: 'en_proceso'
          });

          // Create deliveries with files
          const createdEntregas: Entrega[] = [];
          for (let i = 0; i < fileInfos.length; i++) {
            const fileInfo = fileInfos[i];
            
            // Create unique municipality for each delivery
            const municipio = await Municipio.create({
              nombre: `Test Municipio ${i}`,
              codigo: `TM${i}`
            });

            // Create unique file path for each delivery
            const uploadedFilename = `${Date.now()}-${i}-${fileInfo.filename}${fileInfo.extension}`;
            const archivoUrl = `/uploads/entregas/${uploadedFilename}`;

            // Create delivery with file URL
            const entrega = await Entrega.create({
              tareaId: tarea.id,
              municipioId: municipio.id,
              fechaHoraEntrega: fileInfo.fechaHoraEntrega,
              archivoUrl: archivoUrl
            });

            createdEntregas.push(entrega);
          }

          // Execute: Query all deliveries from database
          const queriedEntregas = await Entrega.findAll({
            where: { tareaId: tarea.id }
          });

          // Verify: All deliveries have non-null archivoUrl
          expect(queriedEntregas.length).toBe(fileInfos.length);
          for (const entrega of queriedEntregas) {
            expect(entrega.archivoUrl).not.toBeNull();
            expect(entrega.archivoUrl).toBeDefined();
            expect(entrega.archivoUrl).toContain('/uploads/entregas/');
          }

          // Verify: All archivoUrl values are unique
          const archivoUrls = queriedEntregas.map(e => e.archivoUrl);
          const uniqueUrls = new Set(archivoUrls);
          expect(uniqueUrls.size).toBe(archivoUrls.length);

          // Verify: Each archivoUrl matches the expected pattern
          for (const entrega of queriedEntregas) {
            expect(entrega.archivoUrl).toMatch(/^\/uploads\/entregas\/.+\.(doc|docx|xls|xlsx|ppt|pptx|pdf)$/);
          }
        }
      ),
      { numRuns: 3 } // Reduced runs due to multiple database operations
    );
  }, 45000); // 45 second timeout

  test('archivoUrl should persist correctly across database queries', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          filename: fc.string({ minLength: 5, maxLength: 30 })
            .filter(s => s.trim().length > 0)
            .map(s => s.replace(/[\/\\:*?"<>|]/g, '_')),
          extension: fc.constantFrom('.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.pdf'),
          fechaHoraEntrega: fc.date({
            min: new Date('2024-01-01'),
            max: new Date('2024-12-31')
          })
        }),
        async (fileInfo) => {
          // Setup: Create task and municipality
          const tarea = await Tarea.create({
            nombre: 'Test Task Persistence',
            divisionId: testDivision.id,
            fechaInicio: new Date('2024-01-01'),
            fechaCulminacion: new Date('2024-12-31'),
            estado: 'en_proceso'
          });

          const municipio = await Municipio.create({
            nombre: 'Test Municipio',
            codigo: 'TMP'
          });

          // Create file path
          const uploadedFilename = `${Date.now()}-${fileInfo.filename}${fileInfo.extension}`;
          const archivoUrl = `/uploads/entregas/${uploadedFilename}`;

          // Create delivery with file URL
          const entrega = await Entrega.create({
            tareaId: tarea.id,
            municipioId: municipio.id,
            fechaHoraEntrega: fileInfo.fechaHoraEntrega,
            archivoUrl: archivoUrl
          });

          // Execute: Query the delivery multiple times using different methods
          const queriedById = await Entrega.findByPk(entrega.id);
          const queriedByTask = await Entrega.findOne({
            where: { tareaId: tarea.id }
          });
          const queriedByMunicipio = await Entrega.findOne({
            where: { municipioId: municipio.id }
          });

          // Verify: All queries return the same archivoUrl
          expect(queriedById!.archivoUrl).toBe(archivoUrl);
          expect(queriedByTask!.archivoUrl).toBe(archivoUrl);
          expect(queriedByMunicipio!.archivoUrl).toBe(archivoUrl);

          // Verify: archivoUrl is consistent across all query methods
          expect(queriedById!.archivoUrl).toBe(queriedByTask!.archivoUrl);
          expect(queriedByTask!.archivoUrl).toBe(queriedByMunicipio!.archivoUrl);
        }
      ),
      { numRuns: 5 }
    );
  }, 30000);

  test('archivoUrl should handle various valid file path formats', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate various valid filename patterns
        fc.record({
          basename: fc.oneof(
            fc.string({ minLength: 1, maxLength: 20 }).map(s => s.replace(/[\/\\:*?"<>|]/g, '_')),
            fc.constant('file'),
            fc.constant('document-2024'),
            fc.constant('report_final'),
            fc.constant('entrega.municipio')
          ).filter(s => s.length > 0),
          extension: fc.constantFrom('.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.pdf'),
          timestamp: fc.integer({ min: 1000000000000, max: 9999999999999 }),
          fechaHoraEntrega: fc.date({
            min: new Date('2024-01-01'),
            max: new Date('2024-12-31')
          })
        }),
        async (fileInfo) => {
          // Setup: Create task and municipality
          const tarea = await Tarea.create({
            nombre: 'Test Task Path Formats',
            divisionId: testDivision.id,
            fechaInicio: new Date('2024-01-01'),
            fechaCulminacion: new Date('2024-12-31'),
            estado: 'en_proceso'
          });

          const municipio = await Municipio.create({
            nombre: 'Test Municipio',
            codigo: 'TMF'
          });

          // Create file path with various formats
          const uploadedFilename = `${fileInfo.timestamp}-${fileInfo.basename}${fileInfo.extension}`;
          const archivoUrl = `/uploads/entregas/${uploadedFilename}`;

          // Create delivery with file URL
          const entrega = await Entrega.create({
            tareaId: tarea.id,
            municipioId: municipio.id,
            fechaHoraEntrega: fileInfo.fechaHoraEntrega,
            archivoUrl: archivoUrl
          });

          // Execute: Query the delivery
          const queriedEntrega = await Entrega.findByPk(entrega.id);

          // Verify: archivoUrl is stored and retrieved correctly
          expect(queriedEntrega!.archivoUrl).toBe(archivoUrl);
          expect(queriedEntrega!.archivoUrl).toContain('/uploads/entregas/');
          expect(queriedEntrega!.archivoUrl).toContain(fileInfo.extension);
          expect(queriedEntrega!.archivoUrl).toContain(fileInfo.timestamp.toString());

          // Verify: Path format is valid
          expect(queriedEntrega!.archivoUrl).toMatch(/^\/uploads\/entregas\/\d+-.*\.(doc|docx|xls|xlsx|ppt|pptx|pdf)$/);
        }
      ),
      { numRuns: 5 }
    );
  }, 30000);

  test('archivoUrl should be retrievable when querying delivery with associations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          filename: fc.string({ minLength: 5, maxLength: 30 })
            .filter(s => s.trim().length > 0)
            .map(s => s.replace(/[\/\\:*?"<>|]/g, '_')),
          extension: fc.constantFrom('.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.pdf'),
          fechaHoraEntrega: fc.date({
            min: new Date('2024-01-01'),
            max: new Date('2024-12-31')
          })
        }),
        async (fileInfo) => {
          // Setup: Create task and municipality
          const tarea = await Tarea.create({
            nombre: 'Test Task with Associations',
            divisionId: testDivision.id,
            fechaInicio: new Date('2024-01-01'),
            fechaCulminacion: new Date('2024-12-31'),
            estado: 'en_proceso'
          });

          const municipio = await Municipio.create({
            nombre: 'Test Municipio',
            codigo: 'TMA'
          });

          // Create file path
          const uploadedFilename = `${Date.now()}-${fileInfo.filename}${fileInfo.extension}`;
          const archivoUrl = `/uploads/entregas/${uploadedFilename}`;

          // Create delivery with file URL
          await Entrega.create({
            tareaId: tarea.id,
            municipioId: municipio.id,
            fechaHoraEntrega: fileInfo.fechaHoraEntrega,
            archivoUrl: archivoUrl
          });

          // Execute: Query delivery with associations (as done in the controller)
          const tareaWithEntregas = await Tarea.findByPk(tarea.id, {
            include: [{
              model: Entrega,
              as: 'entregas',
              include: [{
                model: Municipio,
                as: 'municipio'
              }]
            }]
          });

          // Verify: archivoUrl is accessible through associations
          expect(tareaWithEntregas).not.toBeNull();
          const entregas = (tareaWithEntregas as any).entregas;
          expect(entregas).toBeDefined();
          expect(entregas.length).toBe(1);
          expect(entregas[0].archivoUrl).toBe(archivoUrl);
          expect(entregas[0].archivoUrl).toContain('/uploads/entregas/');
          expect(entregas[0].archivoUrl).toContain(fileInfo.extension);
        }
      ),
      { numRuns: 5 }
    );
  }, 30000);
});
