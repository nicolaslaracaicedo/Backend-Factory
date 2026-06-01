import { DataTypes, Model } from 'sequelize';
import sequelize from '../../config/sequelize';

interface CodigoRecuperacionAttributes {
  id: number;
  id_usuario: number;
  codigo: string;
  expira_en: Date;
  usado: boolean;
  created_at: Date;
}

export class CodigoRecuperacion extends Model<CodigoRecuperacionAttributes> implements CodigoRecuperacionAttributes {
  declare id: number;
  declare id_usuario: number;
  declare codigo: string;
  declare expira_en: Date;
  declare usado: boolean;
  declare created_at: Date;
}

CodigoRecuperacion.init(
  {
    id:         { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_usuario: { type: DataTypes.INTEGER, allowNull: false },
    codigo:     { type: DataTypes.STRING(5), allowNull: false },
    expira_en:  { type: DataTypes.DATE, allowNull: false },
    usado:      { type: DataTypes.BOOLEAN, defaultValue: false },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { sequelize, tableName: 'codigos_recuperacion' }
);
