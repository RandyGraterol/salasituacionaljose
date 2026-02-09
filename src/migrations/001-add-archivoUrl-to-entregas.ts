import { QueryInterface, DataTypes } from 'sequelize';

/**
 * Migration: Add archivoUrl column to entregas table
 * 
 * This migration adds support for file attachments to municipality deliveries.
 * The archivoUrl column stores the path to uploaded files.
 * 
 * Requirements: 5.7
 */

export async function up(queryInterface: QueryInterface): Promise<void> {
  console.log('Running migration: Add archivoUrl column to entregas table');
  
  try {
    // Check if column already exists
    const tableDescription = await queryInterface.describeTable('entregas');
    
    if (tableDescription.archivoUrl) {
      console.log('Column archivoUrl already exists, skipping migration');
      return;
    }
    
    // Add the archivoUrl column
    await queryInterface.addColumn('entregas', 'archivoUrl', {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'URL or path to the uploaded file for this delivery'
    });
    
    console.log('✓ Successfully added archivoUrl column to entregas table');
  } catch (error) {
    console.error('✗ Error running migration:', error);
    throw error;
  }
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  console.log('Rolling back migration: Remove archivoUrl column from entregas table');
  
  try {
    // Check if column exists before removing
    const tableDescription = await queryInterface.describeTable('entregas');
    
    if (!tableDescription.archivoUrl) {
      console.log('Column archivoUrl does not exist, skipping rollback');
      return;
    }
    
    // Remove the archivoUrl column
    await queryInterface.removeColumn('entregas', 'archivoUrl');
    
    console.log('✓ Successfully removed archivoUrl column from entregas table');
  } catch (error) {
    console.error('✗ Error rolling back migration:', error);
    throw error;
  }
}
