import { DataTypes, Model } from 'sequelize';
import sequelize from '../../config/sequelize';

interface TipoRetencionAttributes {
  codigo: string;
  nombre: string;
}

export class TipoRetencion extends Model<TipoRetencionAttributes> implements TipoRetencionAttributes {
  declare codigo: string;
  declare nombre: string;
}

TipoRetencion.init(
  {
    codigo: { type: DataTypes.STRING(2), primaryKey: true },
    nombre: { type: DataTypes.STRING(100), allowNull: false },
  },
  { sequelize, tableName: 'tipos_retencion' }
);
