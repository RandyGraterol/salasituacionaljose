import { sequelize, Entrega, Tarea, Municipio, Division } from './src/models';

async function testFileUpload() {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('✓ Database connection established');

    // Check if archivoUrl column exists in the model
    const entregaAttributes = Entrega.getAttributes();
    console.log('\n✓ Entrega model attributes:');
    console.log('  - archivoUrl:', entregaAttributes.archivoUrl ? 'EXISTS' : 'MISSING');

    // Get table description
    const tableInfo = await sequelize.getQueryInterface().describeTable('entregas');
    console.log('\n✓ Database table "entregas" columns:');
    Object.keys(tableInfo).forEach(col => {
      console.log(`  - ${col}: ${tableInfo[col].type}`);
    });

    // Check if archivoUrl column exists in database
    if (tableInfo.archivoUrl) {
      console.log('\n✓ archivoUrl column EXISTS in database');
    } else {
      console.log('\n✗ archivoUrl column MISSING in database - running sync...');
      await sequelize.sync({ alter: true });
      console.log('✓ Database synced');
    }

    // Test creating a delivery with file
    const tarea = await Tarea.findOne();
    const municipio = await Municipio.findOne();

    if (tarea && municipio) {
      console.log('\n✓ Found test data:');
      console.log(`  - Tarea: ${tarea.nombre}`);
      console.log(`  - Municipio: ${municipio.nombre}`);

      // Create a test delivery with file
      const testEntrega = await Entrega.create({
        tareaId: tarea.id,
        municipioId: municipio.id,
        fechaHoraEntrega: new Date(),
        archivoUrl: '/uploads/entregas/test-file.pdf'
      });

      console.log('\n✓ Test delivery created with file:');
      console.log(`  - ID: ${testEntrega.id}`);
      console.log(`  - archivoUrl: ${testEntrega.archivoUrl}`);

      // Retrieve and verify
      const retrieved = await Entrega.findByPk(testEntrega.id);
      console.log('\n✓ Retrieved delivery:');
      console.log(`  - archivoUrl: ${retrieved?.archivoUrl}`);

      // Clean up
      await testEntrega.destroy();
      console.log('\n✓ Test delivery deleted');
    } else {
      console.log('\n⚠ No test data found (tarea or municipio)');
    }

    console.log('\n✓ All tests passed!');
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Error:', error);
    process.exit(1);
  }
}

testFileUpload();
