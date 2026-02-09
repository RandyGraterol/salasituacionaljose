import sequelize from '../config/database';

/**
 * Verify Migration Script
 * 
 * This script verifies that the archivoUrl column was successfully added to the entregas table.
 */

async function verifyMigration(): Promise<void> {
  try {
    console.log('Verifying migration...');
    
    // Connect to database
    await sequelize.authenticate();
    console.log('✓ Database connection established');
    
    // Get table description
    const queryInterface = sequelize.getQueryInterface();
    const tableDescription = await queryInterface.describeTable('entregas');
    
    console.log('\nEntregas table structure:');
    console.log('-------------------------');
    
    Object.entries(tableDescription).forEach(([columnName, columnInfo]) => {
      console.log(`${columnName}:`, {
        type: columnInfo.type,
        allowNull: columnInfo.allowNull,
        defaultValue: columnInfo.defaultValue
      });
    });
    
    // Check if archivoUrl column exists
    if (tableDescription.archivoUrl) {
      console.log('\n✓ SUCCESS: archivoUrl column exists in entregas table');
      console.log('Column details:', {
        type: tableDescription.archivoUrl.type,
        allowNull: tableDescription.archivoUrl.allowNull
      });
    } else {
      console.log('\n✗ ERROR: archivoUrl column NOT found in entregas table');
      process.exit(1);
    }
    
    await sequelize.close();
  } catch (error) {
    console.error('✗ Error verifying migration:', error);
    process.exit(1);
  }
}

verifyMigration();
