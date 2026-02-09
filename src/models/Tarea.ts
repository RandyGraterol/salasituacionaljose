import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

// Interfaz de atributos de Tarea
export interface TareaAttributes {
  id: number;
  nombre: string;
  divisionId: number;
  fechaInicio: Date;
  fechaCulminacion: Date;
  estado: 'en_proceso' | 'finalizada';
  createdAt?: Date;
  updatedAt?: Date;
}

// Atributos opcionales para creación
interface TareaCreationAttributes extends Optional<TareaAttributes, 'id' | 'estado'> {}

// Clase del modelo Tarea
class Tarea extends Model<TareaAttributes, TareaCreationAttributes> implements TareaAttributes {
  public id!: number;
  public nombre!: string;
  public divisionId!: number;
  public fechaInicio!: Date;
  public fechaCulminacion!: Date;
  public estado!: 'en_proceso' | 'finalizada';
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

// Definir el modelo
Tarea.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    nombre: {
      type: DataTypes.STRING(300),
      allowNull: false
    },
    divisionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'divisiones',
        key: 'id'
      }
    },
    fechaInicio: {
      type: DataTypes.DATE,
      allowNull: false
    },
    fechaCulminacion: {
      type: DataTypes.DATE,
      allowNull: false,
      validate: {
        isAfterOrEqualStart(value: Date) {
          if (this.fechaInicio && value < this.fechaInicio) {
            throw new Error('La fecha de culminación debe ser posterior o igual a la fecha de inicio');
          }
        }
      }
    },
    estado: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'en_proceso',
      validate: {
        isIn: [['en_proceso', 'finalizada']]
      }
    }
  },
  {
    sequelize,
    tableName: 'tareas',
    timestamps: true
  }
);

export default Tarea;
