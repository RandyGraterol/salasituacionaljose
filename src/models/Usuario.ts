import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import bcrypt from 'bcrypt';

// Interfaz de atributos del Usuario
export interface UsuarioAttributes {
  id: number;
  usuario: string;
  correo: string;
  password: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Atributos opcionales para creación
interface UsuarioCreationAttributes extends Optional<UsuarioAttributes, 'id'> {}

// Clase del modelo Usuario
class Usuario extends Model<UsuarioAttributes, UsuarioCreationAttributes> implements UsuarioAttributes {
  public id!: number;
  public usuario!: string;
  public correo!: string;
  public password!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Método para comparar contraseñas
  public async comparePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }
}

// Definir el modelo
Usuario.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    usuario: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    correo: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false
    }
  },
  {
    sequelize,
    tableName: 'usuarios',
    timestamps: true,
    hooks: {
      // Hook para hashear la contraseña antes de crear
      beforeCreate: async (usuario: Usuario) => {
        if (usuario.password) {
          const salt = await bcrypt.genSalt(10);
          usuario.password = await bcrypt.hash(usuario.password, salt);
        }
      },
      // Hook para hashear la contraseña antes de actualizar
      beforeUpdate: async (usuario: Usuario) => {
        if (usuario.changed('password')) {
          const salt = await bcrypt.genSalt(10);
          usuario.password = await bcrypt.hash(usuario.password, salt);
        }
      }
    }
  }
);

export default Usuario;
