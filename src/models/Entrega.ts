import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

// Interfaz de atributos de Entrega
export interface EntregaAttributes {
  id: number;
  tareaId: number;
  municipioId: number;
  fechaHoraEntrega: Date;
  archivoUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Atributos opcionales para creación
interface EntregaCreationAttributes extends Optional<EntregaAttributes, 'id'> {}

// Clase del modelo Entrega
class Entrega extends Model<EntregaAttributes, EntregaCreationAttributes> implements EntregaAttributes {
  public id!: number;
  public tareaId!: number;
  public municipioId!: number;
  public fechaHoraEntrega!: Date;
  public archivoUrl?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Associations
  public readonly municipio?: any;
  public readonly tarea?: any;
}
// Definir el modelo
Entrega.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    tareaId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'tareas',
        key: 'id'
      }
    },
    municipioId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'municipios',
        key: 'id'
      }
    },
    fechaHoraEntrega: {
      type: DataTypes.DATE,
      allowNull: false
    },
    archivoUrl: {
      type: DataTypes.STRING(500),
      allowNull: true
    }
  },
  {
    sequelize,
    tableName: 'entregas',
    timestamps: true
  }
);

export default Entrega;
