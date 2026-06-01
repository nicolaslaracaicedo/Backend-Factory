import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../../config/sequelize';

interface RolAttributes {
  id: number;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  created_at: Date;
}

type RolCreationAttributes = Optional<RolAttributes, 'id' | 'descripcion' | 'activo' | 'created_at'>;

export class Rol extends Model<RolAttributes, RolCreationAttributes> implements RolAttributes {
  declare id: number;
  declare nombre: string;
  declare descripcion: string | null;
  declare activo: boolean;
  declare created_at: Date;
}

Rol.init(
  {
    id:          { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nombre:      { type: DataTypes.STRING(50), allowNull: false, unique: true },
    descripcion: { type: DataTypes.STRING(200), allowNull: true },
    activo:      { type: DataTypes.BOOLEAN, defaultValue: true },
    created_at:  { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { sequelize, tableName: 'roles' }
);
