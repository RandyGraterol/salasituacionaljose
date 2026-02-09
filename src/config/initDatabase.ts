import { sequelize, Usuario, Division, Municipio } from '../models';

// Datos iniciales de divisiones
const divisionesIniciales = [
  { nombre: 'Comunidades Educativas', descripcion: 'División encargada de las comunidades educativas' },
  { nombre: 'Deportes y Recreación', descripcion: 'División encargada de actividades deportivas' },
  { nombre: 'Cultura y Patrimonio', descripcion: 'División encargada de actividades culturales' },
  { nombre: 'Desarrollo Social', descripcion: 'División encargada del desarrollo social' }
];

// Municipios del estado Guárico
const municipiosGuarico = [
  { nombre: 'San Juan de los Morros', codigo: '1501' },
  { nombre: 'Roscio', codigo: '1502' },
  { nombre: 'Ortiz', codigo: '1503' },
  { nombre: 'Mellado', codigo: '1504' },
  { nombre: 'Las Mercedes', codigo: '1505' },
  { nombre: 'El Socorro', codigo: '1506' },
  { nombre: 'Camatagua', codigo: '1507' },
  { nombre: 'San Gerónimo de Guayabal', codigo: '1508' },
  { nombre: 'Valle de la Pascua', codigo: '1509' },
  { nombre: 'Infante', codigo: '1510' },
  { nombre: 'Zaraza', codigo: '1511' },
  { nombre: 'Santa María de Ipire', codigo: '1512' },
  { nombre: 'Chaguaramas', codigo: '1513' },
  { nombre: 'Calabozo', codigo: '1514' },
  { nombre: 'San José de Guaribe', codigo: '1515' }
];

// Función para inicializar la base de datos
export const initDatabase = async (): Promise<void> => {
  try {
    console.log('Iniciando sincronización de base de datos...');
    
    // Sincronizar modelos con la base de datos
    await sequelize.sync({ force: false }); // force: true elimina y recrea las tablas
    
    console.log('✓ Modelos sincronizados correctamente');

    // Verificar si ya existen datos
    const usuarioCount = await Usuario.count();
    const divisionCount = await Division.count();
    const municipioCount = await Municipio.count();

    // Crear usuario administrador si no existe
    if (usuarioCount === 0) {
      await Usuario.create({
        usuario: 'admin',
        correo: 'admin@cdce.gob.ve',
        password: 'admin123' // Se hasheará automáticamente por el hook
      });
      console.log('✓ Usuario administrador creado');
    }

    // Crear divisiones si no existen
    if (divisionCount === 0) {
      await Division.bulkCreate(divisionesIniciales);
      console.log('✓ Divisiones iniciales creadas');
    }

    // Crear municipios si no existen
    if (municipioCount === 0) {
      await Municipio.bulkCreate(municipiosGuarico);
      console.log('✓ Municipios del estado Guárico creados');
    }

    console.log('✓ Base de datos inicializada correctamente');
  } catch (error) {
    console.error('✗ Error al inicializar la base de datos:', error);
    throw error;
  }
};
