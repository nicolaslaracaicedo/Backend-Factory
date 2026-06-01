import { DataTypes, Model } from 'sequelize';
import sequelize from '../../config/sequelize';

interface GrupoProductoAttributes {
  id: number;
  id_empresa: number;
  nombre: string;
  descripcion: string | null;
  estado: string;
  created_at: Date;
}

export class GrupoProducto extends Model<GrupoProductoAttributes> implements GrupoProductoAttributes {
  declare id: number;
  declare id_empresa: number;
  declare nombre: string;
  declare descripcion: string | null;
  declare estado: string;
  declare created_at: Date;
}

GrupoProducto.init(
  {
    id:          { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_empresa:  { type: DataTypes.INTEGER, allowNull: false },
    nombre:      { type: DataTypes.STRING(200), allowNull: false },
    descripcion: { type: DataTypes.STRING(300), allowNull: true },
    estado:      { type: DataTypes.STRING(20), defaultValue: 'ACTIVO' },
    created_at:  { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { sequelize, tableName: 'grupos_productos' }
);
