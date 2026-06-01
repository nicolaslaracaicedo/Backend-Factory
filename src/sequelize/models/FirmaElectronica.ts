import { DataTypes, Model } from 'sequelize';
import sequelize from '../../config/sequelize';

interface FirmaElectronicaAttributes {
  id: number;
  id_empresa: number;
  nombre: string | null;
  archivo_p12: string;
  password: string;
  fecha_vencimiento: string;
  activo: boolean;
  created_at: Date;
}

export class FirmaElectronica extends Model<FirmaElectronicaAttributes> implements FirmaElectronicaAttributes {
  declare id: number;
  declare id_empresa: number;
  declare nombre: string | null;
  declare archivo_p12: string;
  declare password: string;
  declare fecha_vencimiento: string;
  declare activo: boolean;
  declare created_at: Date;
}

FirmaElectronica.init(
  {
    id:                { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_empresa:        { type: DataTypes.INTEGER, allowNull: false },
    nombre:            { type: DataTypes.STRING(200), allowNull: true },
    archivo_p12:       { type: DataTypes.TEXT, allowNull: false },
    password:          { type: DataTypes.TEXT, allowNull: false },
    fecha_vencimiento: { type: DataTypes.DATEONLY, allowNull: false },
    activo:            { type: DataTypes.BOOLEAN, defaultValue: true },
    created_at:        { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { sequelize, tableName: 'firmas_electronicas' }
);
