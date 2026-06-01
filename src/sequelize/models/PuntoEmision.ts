import { DataTypes, Model } from 'sequelize';
import sequelize from '../../config/sequelize';

interface PuntoEmisionAttributes {
  id: number;
  id_empresa: number;
  id_establecimiento: number;
  codigo: string;
  descripcion: string | null;
  estado: string;
  created_at: Date;
}

export class PuntoEmision extends Model<PuntoEmisionAttributes> implements PuntoEmisionAttributes {
  declare id: number;
  declare id_empresa: number;
  declare id_establecimiento: number;
  declare codigo: string;
  declare descripcion: string | null;
  declare estado: string;
  declare created_at: Date;
}

PuntoEmision.init(
  {
    id:                 { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_empresa:         { type: DataTypes.INTEGER, allowNull: false },
    id_establecimiento: { type: DataTypes.INTEGER, allowNull: false },
    codigo:             { type: DataTypes.STRING(3), allowNull: false },
    descripcion:        { type: DataTypes.STRING(200), allowNull: true },
    estado:             { type: DataTypes.STRING(20), defaultValue: 'ACTIVO' },
    created_at:         { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { sequelize, tableName: 'puntos_emision' }
);
