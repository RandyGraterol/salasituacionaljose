import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

// Interfaz de atributos de División
export interface DivisionAttributes {
  id: number;
  nombre: string;
  descripcion?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Atributos opcionales para creación
interface DivisionCreationAttributes extends Optional<DivisionAttributes, 'id' | 'descripcion'> {}

// Clase del modelo Division
class Division extends Model<DivisionAttributes, DivisionCreationAttributes> implements DivisionAttributes {
  public id!: number;
  public nombre!: string;
  public descripcion?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

// Definir el modelo
Division.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    nombre: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  },
  {
    sequelize,
    tableName: 'divisiones',
    timestamps: true
  }
);

export default Division;
