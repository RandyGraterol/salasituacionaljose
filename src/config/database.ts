import { Sequelize } from 'sequelize';
import path from 'path';

// Configurar Sequelize con SQLite3
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '../../database.sqlite'),
  logging: false, // Cambiar a console.log para ver queries SQL
  define: {
    timestamps: true,
    underscored: false
  }
});

// Función para probar la conexión
export const testConnection = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    console.log('✓ Conexión a la base de datos establecida correctamente');
  } catch (error) {
    console.error('✗ Error al conectar con la base de datos:', error);
    throw error;
  }
};

export default sequelize;
