import sequelize from '../config/database';
import { QueryInterface } from 'sequelize';
import * as migration001 from '../migrations/001-add-archivoUrl-to-entregas';

/**
 * Migration Runner
 * 
 * This script runs database migrations to update the schema.
 * It can be executed manually or as part of the deployment process.
 */

interface Migration {
  name: string;
  up: (queryInterface: QueryInterface) => Promise<void>;
  down: (queryInterface: QueryInterface) => Promise<void>;
}

// List of migrations to run in order
const migrations: Migration[] = [
  {
    name: '001-add-archivoUrl-to-entregas',
    up: migration001.up,
    down: migration001.down
  }
];

/**
 * Run all pending migrations
 */
export async function runMigrations(): Promise<void> {
  console.log('Starting database migrations...');
  
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('✓ Database connection established');
    
    const queryInterface = sequelize.getQueryInterface();
    
    // Run each migration
    for (const migration of migrations) {
      console.log(`\nRunning migration: ${migration.name}`);
      await migration.up(queryInterface);
    }
    
    console.log('\n✓ All migrations completed successfully');
  } catch (error) {
    console.error('\n✗ Migration failed:', error);
    throw error;
  }
}

/**
 * Rollback the last migration
 */
export async function rollbackMigration(): Promise<void> {
  console.log('Rolling back last migration...');
  
  try {
    await sequelize.authenticate();
    console.log('✓ Database connection established');
    
    const queryInterface = sequelize.getQueryInterface();
    
    // Rollback the last migration
    const lastMigration = migrations[migrations.length - 1];
    console.log(`\nRolling back migration: ${lastMigration.name}`);
    await lastMigration.down(queryInterface);
    
    console.log('\n✓ Migration rolled back successfully');
  } catch (error) {
    console.error('\n✗ Rollback failed:', error);
    throw error;
  }
}

// Run migrations if this script is executed directly
if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'down') {
    rollbackMigration()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  } else {
    runMigrations()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  }
}
