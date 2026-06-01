import { DataTypes, Model } from 'sequelize';
import sequelize from '../../config/sequelize';

interface SecuencialAttributes {
  id: number;
  id_empresa: number;
  id_punto_emision: number;
  tipo_documento: string;
  ambiente: number;
  secuencial_actual: number;
  estado: string;
  updated_at: Date;
}

export class Secuencial extends Model<SecuencialAttributes> implements SecuencialAttributes {
  declare id: number;
  declare id_empresa: number;
  declare id_punto_emision: number;
  declare tipo_documento: string;
  declare ambiente: number;
  declare secuencial_actual: number;
  declare estado: string;
  declare updated_at: Date;
}

Secuencial.init(
  {
    id:                { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_empresa:        { type: DataTypes.INTEGER, allowNull: false },
    id_punto_emision:  { type: DataTypes.INTEGER, allowNull: false },
    tipo_documento:    { type: DataTypes.STRING(5), allowNull: false },
    ambiente:          { type: DataTypes.SMALLINT, allowNull: false },
    secuencial_actual: { type: DataTypes.BIGINT, defaultValue: 0 },
    estado:            { type: DataTypes.STRING(20), defaultValue: 'ACTIVO' },
    updated_at:        { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { sequelize, tableName: 'secuenciales' }
);
