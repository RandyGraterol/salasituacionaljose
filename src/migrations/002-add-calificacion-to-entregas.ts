import { QueryInterface, DataTypes } from 'sequelize';

/**
 * Migration: Add calificacion field to entregas table
 * 
 * Adds a quality rating field (0-100) to track delivery quality
 */
export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.addColumn('entregas', 'calificacion', {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 0,
      max: 100
    }
  });
  
  console.log('✓ Campo calificacion agregado a tabla entregas');
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.removeColumn('entregas', 'calificacion');
  console.log('✓ Campo calificacion eliminado de tabla entregas');
}
