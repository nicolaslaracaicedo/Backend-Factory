import { DataTypes, Model } from 'sequelize';
import sequelize from '../../config/sequelize';

interface EstablecimientoAttributes {
  id: number;
  id_empresa: number;
  codigo: string;
  nombre: string;
  direccion: string | null;
  es_matriz: boolean;
  estado: string;
  created_at: Date;
}

export class Establecimiento extends Model<EstablecimientoAttributes> implements EstablecimientoAttributes {
  declare id: number;
  declare id_empresa: number;
  declare codigo: string;
  declare nombre: string;
  declare direccion: string | null;
  declare es_matriz: boolean;
  declare estado: string;
  declare created_at: Date;
}

Establecimiento.init(
  {
    id:         { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_empresa: { type: DataTypes.INTEGER, allowNull: false },
    codigo:     { type: DataTypes.STRING(3), allowNull: false },
    nombre:     { type: DataTypes.STRING(200), allowNull: false },
    direccion:  { type: DataTypes.STRING(500), allowNull: true },
    es_matriz:  { type: DataTypes.BOOLEAN, defaultValue: false },
    estado:     { type: DataTypes.STRING(20), defaultValue: 'ACTIVO' },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { sequelize, tableName: 'establecimientos' }
);
