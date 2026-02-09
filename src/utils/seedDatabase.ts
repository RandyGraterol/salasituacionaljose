import sequelize from '../config/database';
import Division from '../models/Division';
import Municipio from '../models/Municipio';
import Usuario from '../models/Usuario';
import Tarea from '../models/Tarea';
import Entrega from '../models/Entrega';

export async function seedDatabase() {
  try {
    console.log('🌱 Iniciando seed de la base de datos...');

    // Limpiar datos existentes
    await Entrega.destroy({ where: {} });
    await Tarea.destroy({ where: {} });
    await Municipio.destroy({ where: {} });
    await Division.destroy({ where: {} });
    await Usuario.destroy({ where: {} });

    console.log('✅ Datos existentes eliminados');

    // Crear Divisiones
    const divisiones = await Division.bulkCreate([
      { nombre: 'División de Salud' },
      { nombre: 'División de Educación' },
      { nombre: 'División de Infraestructura' },
      { nombre: 'División de Seguridad' },
      { nombre: 'División de Desarrollo Social' },
      { nombre: 'División de Medio Ambiente' },
      { nombre: 'División de Cultura y Deporte' },
      { nombre: 'División de Economía' },
    ]);

    console.log(`✅ ${divisiones.length} divisiones creadas`);

    // Crear Municipios del Estado Guárico (Venezuela)
    const municipios = await Municipio.bulkCreate([
      { nombre: 'San Juan de los Morros' },
      { nombre: 'Calabozo' },
      { nombre: 'Valle de la Pascua' },
      { nombre: 'Zaraza' },
      { nombre: 'Altagracia de Orituco' },
      { nombre: 'San José de Guaribe' },
      { nombre: 'Tucupido' },
      { nombre: 'Las Mercedes del Llano' },
      { nombre: 'Santa María de Ipire' },
      { nombre: 'Chaguaramas' },
      { nombre: 'El Socorro' },
      { nombre: 'Ortiz' },
      { nombre: 'San Rafael de Laya' },
      { nombre: 'Camaguan' },
      { nombre: 'Puerto Nutrias' },
      { nombre: 'San Jerónimo de Guayabal' },
      { nombre: 'Parapara' },
      { nombre: 'Barbacoas' },
      { nombre: 'San Francisco de Macaira' },
      { nombre: 'Lezama' },
      { nombre: 'Espino' },
      { nombre: 'Guardatinajas' },
      { nombre: 'Cazorla' },
      { nombre: 'El Sombrero' },
      { nombre: 'Roscio' },
    ]);

    console.log(`✅ ${municipios.length} municipios creados`);

    // Crear Usuarios (uno por uno para activar hooks de hashing)
    console.log('Creando usuarios...');
    const usuariosData = [
      {
        usuario: 'admin',
        correo: 'admin@cdce.gob.ve',
        password: 'admin123',
      },
      {
        usuario: 'coordinador1',
        correo: 'coord1@cdce.gob.ve',
        password: 'coord123',
      },
      {
        usuario: 'coordinador2',
        correo: 'coord2@cdce.gob.ve',
        password: 'coord123',
      },
      {
        usuario: 'operador1',
        correo: 'oper1@cdce.gob.ve',
        password: 'oper123',
      },
      {
        usuario: 'operador2',
        correo: 'oper2@cdce.gob.ve',
        password: 'oper123',
      },
    ];

    // Crear usuarios uno por uno para que se ejecuten los hooks de hashing
    const usuarios = [];
    for (const userData of usuariosData) {
      const usuario = await Usuario.create(userData);
      usuarios.push(usuario);
      console.log(`  ✓ Usuario creado: ${userData.usuario}`);
    }

    console.log(`✅ ${usuarios.length} usuarios creados con contraseñas hasheadas`);

    // Crear Tareas de ejemplo
    const tareas = [];
    const estadosTarea: ('en_proceso' | 'finalizada')[] = ['en_proceso', 'finalizada'];
    
    for (let i = 0; i < 30; i++) {
      const divisionAleatoria = divisiones[Math.floor(Math.random() * divisiones.length)];
      const estadoAleatorio = estadosTarea[Math.floor(Math.random() * estadosTarea.length)];
      const fechaInicio = new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
      const fechaCulminacion = new Date(fechaInicio);
      fechaCulminacion.setDate(fechaCulminacion.getDate() + Math.floor(Math.random() * 30) + 7);

      tareas.push({
        nombre: `Tarea ${i + 1} - ${divisionAleatoria.nombre}`,
        fechaInicio: fechaInicio,
        fechaCulminacion: fechaCulminacion,
        estado: estadoAleatorio,
        divisionId: divisionAleatoria.id,
      });
    }

    const tareasCreadas = await Tarea.bulkCreate(tareas as any);
    console.log(`✅ ${tareasCreadas.length} tareas creadas`);

    // Crear Entregas de ejemplo
    const entregas = [];
    
    for (const tarea of tareasCreadas) {
      // Cada tarea tendrá entre 5 y 15 entregas
      const numEntregas = Math.floor(Math.random() * 11) + 5;
      const municipiosSeleccionados = municipios
        .sort(() => 0.5 - Math.random())
        .slice(0, numEntregas);

      for (const municipio of municipiosSeleccionados) {
        const fechaEntrega = new Date(tarea.fechaInicio);
        fechaEntrega.setDate(
          fechaEntrega.getDate() + Math.floor(Math.random() * 20)
        );

        entregas.push({
          fechaHoraEntrega: fechaEntrega,
          tareaId: tarea.id,
          municipioId: municipio.id,
        });
      }
    }

    const entregasCreadas = await Entrega.bulkCreate(entregas);
    console.log(`✅ ${entregasCreadas.length} entregas creadas`);

    console.log('\n🎉 Seed completado exitosamente!');
    console.log('\n📊 Resumen:');
    console.log(`   - Divisiones: ${divisiones.length}`);
    console.log(`   - Municipios: ${municipios.length}`);
    console.log(`   - Usuarios: ${usuarios.length}`);
    console.log(`   - Tareas: ${tareasCreadas.length}`);
    console.log(`   - Entregas: ${entregasCreadas.length}`);
    console.log('\n👤 Credenciales de acceso:');
    console.log('   Admin: admin / admin123');
    console.log('   Coordinador: coordinador1 / coord123');
    console.log('   Operador: operador1 / oper123');

  } catch (error) {
    console.error('❌ Error al hacer seed de la base de datos:', error);
    throw error;
  }
}

// Ejecutar seed si se llama directamente
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('\n✅ Proceso completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Error:', error);
      process.exit(1);
    });
}
