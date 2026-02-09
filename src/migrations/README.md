# Database Migrations

This directory contains database migration files for the CDCE system.

## Overview

Migrations are used to modify the database schema in a controlled and versioned way. Each migration file contains:
- An `up()` function to apply the changes
- A `down()` function to rollback the changes

## Running Migrations

### Apply all pending migrations
```bash
npm run migrate
```

### Rollback the last migration
```bash
npm run migrate:down
```

### Verify migration was applied
```bash
npx ts-node src/utils/verifyMigration.ts
```

## Migration Files

### 001-add-archivoUrl-to-entregas.ts
- **Purpose**: Add file upload support to municipality deliveries
- **Changes**: Adds `archivoUrl` column (VARCHAR(500), nullable) to `entregas` table
- **Requirements**: 5.7
- **Date**: 2024

## Creating New Migrations

1. Create a new file in this directory with format: `XXX-description.ts`
2. Implement `up()` and `down()` functions
3. Add the migration to the `migrations` array in `src/utils/runMigrations.ts`
4. Test the migration with `npm run migrate`
5. Test the rollback with `npm run migrate:down`

## Migration Template

```typescript
import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  console.log('Running migration: Description');
  
  try {
    // Check if change already exists
    const tableDescription = await queryInterface.describeTable('table_name');
    
    if (tableDescription.column_name) {
      console.log('Change already exists, skipping migration');
      return;
    }
    
    // Apply changes
    await queryInterface.addColumn('table_name', 'column_name', {
      type: DataTypes.STRING(255),
      allowNull: true
    });
    
    console.log('✓ Migration completed successfully');
  } catch (error) {
    console.error('✗ Error running migration:', error);
    throw error;
  }
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  console.log('Rolling back migration: Description');
  
  try {
    // Check if change exists
    const tableDescription = await queryInterface.describeTable('table_name');
    
    if (!tableDescription.column_name) {
      console.log('Change does not exist, skipping rollback');
      return;
    }
    
    // Rollback changes
    await queryInterface.removeColumn('table_name', 'column_name');
    
    console.log('✓ Rollback completed successfully');
  } catch (error) {
    console.error('✗ Error rolling back migration:', error);
    throw error;
  }
}
```

## Best Practices

1. **Always check if changes already exist** before applying them
2. **Test both up and down migrations** before committing
3. **Use descriptive migration names** that explain what they do
4. **Never modify existing migrations** that have been deployed
5. **Keep migrations small and focused** on a single change
6. **Document the purpose** and requirements in comments
7. **Handle errors gracefully** with try-catch blocks

## Troubleshooting

### Migration fails with "column already exists"
The migration includes checks to skip if the column already exists. If you see this error, the migration was likely run before.

### Need to rollback multiple migrations
Currently, only the last migration can be rolled back. To rollback multiple migrations, run `npm run migrate:down` multiple times.

### Database is out of sync
If the database schema doesn't match the models, you can:
1. Backup your data
2. Delete the database file
3. Run the application to recreate tables
4. Run migrations to apply schema changes
5. Restore your data
