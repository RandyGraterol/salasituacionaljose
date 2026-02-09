import sequelize from '../config/database';
import Usuario from './Usuario';
import Division from './Division';
import Tarea from './Tarea';
import Municipio from './Municipio';
import Entrega from './Entrega';

// Configurar relaciones entre modelos

// Division -> Tareas (1:N)
Division.hasMany(Tarea, {
  foreignKey: 'divisionId',
  as: 'tareas'
});

Tarea.belongsTo(Division, {
  foreignKey: 'divisionId',
  as: 'division'
});

// Tarea -> Entregas (1:N) con cascade delete
Tarea.hasMany(Entrega, {
  foreignKey: 'tareaId',
  as: 'entregas',
  onDelete: 'CASCADE'
});

Entrega.belongsTo(Tarea, {
  foreignKey: 'tareaId',
  as: 'tarea'
});

// Municipio -> Entregas (1:N)
Municipio.hasMany(Entrega, {
  foreignKey: 'municipioId',
  as: 'entregas'
});

Entrega.belongsTo(Municipio, {
  foreignKey: 'municipioId',
  as: 'municipio'
});

// Exportar modelos y sequelize
export {
  sequelize,
  Usuario,
  Division,
  Tarea,
  Municipio,
  Entrega
};
