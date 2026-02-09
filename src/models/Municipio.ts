import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

// Interfaz de atributos de Municipio
export interface MunicipioAttributes {
  id: number;
  nombre: string;
  codigo?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Atributos opcionales para creación
interface MunicipioCreationAttributes extends Optional<MunicipioAttributes, 'id' | 'codigo'> {}

// Clase del modelo Municipio
class Municipio extends Model<MunicipioAttributes, MunicipioCreationAttributes> implements MunicipioAttributes {
  public id!: number;
  public nombre!: string;
  public codigo?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

// Definir el modelo
Municipio.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    nombre: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    codigo: {
      type: DataTypes.STRING(50),
      allowNull: true
    }
  },
  {
    sequelize,
    tableName: 'municipios',
    timestamps: true
  }
);

export default Municipio;
