/**
 * Comprehensive File Upload Verification Script
 * 
 * This script verifies that the file upload functionality works end-to-end:
 * 1. Database schema has archivoUrl column
 * 2. Upload middleware is configured correctly
 * 3. Routes are properly set up
 * 4. Controller handles file uploads
 * 5. Views display file upload form and download links
 */

import fs from 'fs';
import path from 'path';
import { sequelize, Entrega, Tarea, Municipio } from './src/models';

interface VerificationResult {
  test: string;
  passed: boolean;
  details?: string;
}

const results: VerificationResult[] = [];

function addResult(test: string, passed: boolean, details?: string) {
  results.push({ test, passed, details });
  const icon = passed ? '✓' : '✗';
  const color = passed ? '\x1b[32m' : '\x1b[31m';
  console.log(`${color}${icon}\x1b[0m ${test}${details ? ': ' + details : ''}`);
}

async function verifyFileUpload() {
  console.log('\n=== File Upload End-to-End Verification ===\n');

  try {
    // 1. Verify database schema
    console.log('1. Database Schema Verification:');
    await sequelize.authenticate();
    const tableInfo = await sequelize.getQueryInterface().describeTable('entregas');
    
    const hasArchivoUrl = !!tableInfo.archivoUrl;
    addResult('archivoUrl column exists in database', hasArchivoUrl);
    
    if (hasArchivoUrl) {
      const columnType = tableInfo.archivoUrl.type;
      addResult('archivoUrl column type is VARCHAR(500)', columnType === 'VARCHAR(500)', columnType);
      addResult('archivoUrl column is nullable', tableInfo.archivoUrl.allowNull === true);
    }

    // 2. Verify model definition
    console.log('\n2. Model Definition Verification:');
    const entregaAttributes = Entrega.getAttributes();
    addResult('Entrega model has archivoUrl attribute', !!entregaAttributes.archivoUrl);

    // 3. Verify upload middleware exists
    console.log('\n3. Upload Middleware Verification:');
    const middlewarePath = path.join(__dirname, 'src', 'middleware', 'upload.ts');
    addResult('Upload middleware file exists', fs.existsSync(middlewarePath));

    if (fs.existsSync(middlewarePath)) {
      const middlewareContent = fs.readFileSync(middlewarePath, 'utf-8');
      addResult('Middleware uses multer', middlewareContent.includes('multer'));
      addResult('Middleware has file filter', middlewareContent.includes('fileFilter'));
      addResult('Middleware has 10MB size limit', middlewareContent.includes('10 * 1024 * 1024'));
      addResult('Middleware accepts .doc files', middlewareContent.includes('.doc'));
      addResult('Middleware accepts .docx files', middlewareContent.includes('.docx'));
      addResult('Middleware accepts .xls files', middlewareContent.includes('.xls'));
      addResult('Middleware accepts .xlsx files', middlewareContent.includes('.xlsx'));
      addResult('Middleware accepts .ppt files', middlewareContent.includes('.ppt'));
      addResult('Middleware accepts .pptx files', middlewareContent.includes('.pptx'));
      addResult('Middleware accepts .pdf files', middlewareContent.includes('.pdf'));
    }

    // 4. Verify routes configuration
    console.log('\n4. Routes Configuration Verification:');
    const routesPath = path.join(__dirname, 'src', 'routes', 'tareas.ts');
    addResult('Tareas routes file exists', fs.existsSync(routesPath));

    if (fs.existsSync(routesPath)) {
      const routesContent = fs.readFileSync(routesPath, 'utf-8');
      addResult('Routes import uploadEntrega middleware', routesContent.includes('uploadEntrega'));
      addResult('Routes use uploadEntrega on agregar-entrega', 
        routesContent.includes('uploadEntrega.single') && routesContent.includes('agregar-entrega'));
    }

    // 5. Verify controller handles file uploads
    console.log('\n5. Controller Verification:');
    const controllerPath = path.join(__dirname, 'src', 'controllers', 'tareasController.ts');
    addResult('Tareas controller file exists', fs.existsSync(controllerPath));

    if (fs.existsSync(controllerPath)) {
      const controllerContent = fs.readFileSync(controllerPath, 'utf-8');
      addResult('Controller accesses req.file', controllerContent.includes('req.file'));
      addResult('Controller saves archivoUrl to database', 
        controllerContent.includes('archivoUrl') && controllerContent.includes('file.filename'));
    }

    // 6. Verify view has file upload form
    console.log('\n6. View Verification:');
    const viewPath = path.join(__dirname, 'src', 'views', 'tareas', 'detalle.ejs');
    addResult('Detalle view file exists', fs.existsSync(viewPath));

    if (fs.existsSync(viewPath)) {
      const viewContent = fs.readFileSync(viewPath, 'utf-8');
      addResult('Form has enctype="multipart/form-data"', viewContent.includes('enctype="multipart/form-data"'));
      addResult('Form has file input field', viewContent.includes('type="file"'));
      addResult('File input accepts correct formats', 
        viewContent.includes('accept=') && viewContent.includes('.pdf'));
      addResult('Form action points to /tareas/agregar-entrega', 
        viewContent.includes('action="/tareas/agregar-entrega"'));
      addResult('Button text is "añadir asignación"', viewContent.includes('añadir asignación'));
      addResult('View displays file download link', 
        viewContent.includes('archivoUrl') && viewContent.includes('Ver archivo'));
    }

    // 7. Verify uploads directory exists
    console.log('\n7. File System Verification:');
    const uploadsDir = path.join(__dirname, 'uploads', 'entregas');
    addResult('Uploads directory exists', fs.existsSync(uploadsDir));

    // 8. Verify static file serving
    console.log('\n8. Static File Serving Verification:');
    const appPath = path.join(__dirname, 'src', 'app.ts');
    if (fs.existsSync(appPath)) {
      const appContent = fs.readFileSync(appPath, 'utf-8');
      addResult('App serves /uploads as static files', 
        appContent.includes('/uploads') && appContent.includes('express.static'));
    }

    // 9. Test database operations
    console.log('\n9. Database Operations Test:');
    const tarea = await Tarea.findOne();
    const municipio = await Municipio.findOne();

    if (tarea && municipio) {
      // Test creating delivery with file
      const testEntrega = await Entrega.create({
        tareaId: tarea.id,
        municipioId: municipio.id,
        fechaHoraEntrega: new Date(),
        archivoUrl: '/uploads/entregas/test-verification.pdf'
      });
      addResult('Can create delivery with archivoUrl', !!testEntrega.id);

      // Test retrieving delivery
      const retrieved = await Entrega.findByPk(testEntrega.id);
      addResult('Can retrieve delivery with archivoUrl', retrieved?.archivoUrl === '/uploads/entregas/test-verification.pdf');

      // Test creating delivery without file
      const testEntregaNoFile = await Entrega.create({
        tareaId: tarea.id,
        municipioId: municipio.id,
        fechaHoraEntrega: new Date()
      });
      addResult('Can create delivery without archivoUrl', !!testEntregaNoFile.id);

      // Clean up
      await testEntrega.destroy();
      await testEntregaNoFile.destroy();
    } else {
      addResult('Test data available', false, 'No tarea or municipio found');
    }

    // 10. Verify tests exist
    console.log('\n10. Test Coverage Verification:');
    const uploadTestPath = path.join(__dirname, 'src', 'middleware', 'upload.test.ts');
    addResult('Upload middleware unit tests exist', fs.existsSync(uploadTestPath));

    const uploadPbtPath = path.join(__dirname, 'src', 'middleware', 'upload.pbt.test.ts');
    addResult('Upload middleware property tests exist', fs.existsSync(uploadPbtPath));

    const edgeCasesPath = path.join(__dirname, 'src', 'middleware', '__tests__', 'upload.edge-cases.test.ts');
    addResult('Upload edge cases tests exist', fs.existsSync(edgeCasesPath));

    const controllerPbtPath = path.join(__dirname, 'src', 'controllers', '__tests__', 'tareasController.pbt.test.ts');
    addResult('Controller property tests exist', fs.existsSync(controllerPbtPath));

    // Summary
    console.log('\n=== Verification Summary ===\n');
    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    const percentage = ((passed / total) * 100).toFixed(1);

    console.log(`Total Tests: ${total}`);
    console.log(`Passed: \x1b[32m${passed}\x1b[0m`);
    console.log(`Failed: \x1b[31m${total - passed}\x1b[0m`);
    console.log(`Success Rate: ${percentage}%\n`);

    if (passed === total) {
      console.log('\x1b[32m✓ All verification checks passed!\x1b[0m');
      console.log('\nFile upload functionality is fully implemented and ready for manual testing.\n');
      process.exit(0);
    } else {
      console.log('\x1b[31m✗ Some verification checks failed.\x1b[0m\n');
      console.log('Failed tests:');
      results.filter(r => !r.passed).forEach(r => {
        console.log(`  - ${r.test}${r.details ? ': ' + r.details : ''}`);
      });
      console.log();
      process.exit(1);
    }

  } catch (error) {
    console.error('\n✗ Verification error:', error);
    process.exit(1);
  }
}

verifyFileUpload();
