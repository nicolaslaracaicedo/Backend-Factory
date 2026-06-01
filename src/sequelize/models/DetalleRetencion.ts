import { DataTypes, Model } from 'sequelize';
import sequelize from '../../config/sequelize';

interface DetalleRetencionAttributes {
  id: number;
  id_retencion: number;
  id_empresa: number;
  tipo: string;
  codigo: string;
  descripcion: string;
  base_imponible: number;
  porcentaje: number;
  valor_retenido: number;
  orden: number;
}

export class DetalleRetencion extends Model<DetalleRetencionAttributes> implements DetalleRetencionAttributes {
  declare id: number;
  declare id_retencion: number;
  declare id_empresa: number;
  declare tipo: string;
  declare codigo: string;
  declare descripcion: string;
  declare base_imponible: number;
  declare porcentaje: number;
  declare valor_retenido: number;
  declare orden: number;
}

DetalleRetencion.init(
  {
    id:             { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_retencion:   { type: DataTypes.INTEGER, allowNull: false },
    id_empresa:     { type: DataTypes.INTEGER, allowNull: false },
    tipo:           { type: DataTypes.STRING(10), allowNull: false },
    codigo:         { type: DataTypes.STRING(5), allowNull: false },
    descripcion:    { type: DataTypes.STRING(300), allowNull: false },
    base_imponible: { type: DataTypes.DECIMAL(12, 4), defaultValue: 0 },
    porcentaje:     { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
    valor_retenido: { type: DataTypes.DECIMAL(12, 4), defaultValue: 0 },
    orden:          { type: DataTypes.INTEGER, defaultValue: 1 },
  },
  { sequelize, tableName: 'detalle_retenciones' }
);
