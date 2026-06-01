import { DataTypes, Model } from 'sequelize';
import sequelize from '../../config/sequelize';

interface DetalleProformaAttributes {
  id: number;
  id_proforma: number;
  id_empresa: number;
  id_producto: number | null;
  porcentaje_ice: number;
  valor_ice: number;
  codigo_ice: string | null;
  valor_irbpnr: number;
  codigo: string;
  descripcion: string;
  unidad_medida: string;
  cantidad: number;
  precio_unitario: number;
  descuento: number;
  subtotal: number;
  codigo_iva: string;
  porcentaje_iva: number;
  valor_iva: number;
  total: number;
  orden: number;
}

export class DetalleProforma extends Model<DetalleProformaAttributes> implements DetalleProformaAttributes {
  declare id: number;
  declare id_proforma: number;
  declare id_empresa: number;
  declare id_producto: number | null;
  declare porcentaje_ice: number;
  declare valor_ice: number;
  declare codigo_ice: string | null;
  declare valor_irbpnr: number;
  declare codigo: string;
  declare descripcion: string;
  declare unidad_medida: string;
  declare cantidad: number;
  declare precio_unitario: number;
  declare descuento: number;
  declare subtotal: number;
  declare codigo_iva: string;
  declare porcentaje_iva: number;
  declare valor_iva: number;
  declare total: number;
  declare orden: number;
}

DetalleProforma.init(
  {
    id:              { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_proforma:     { type: DataTypes.INTEGER, allowNull: false },
    id_empresa:      { type: DataTypes.INTEGER, allowNull: false },
    id_producto:     { type: DataTypes.INTEGER, allowNull: true },
    porcentaje_ice:  { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
    valor_ice:       { type: DataTypes.DECIMAL(12, 4), allowNull: false, defaultValue: 0 },
    codigo_ice:      { type: DataTypes.STRING(10), allowNull: true },
    valor_irbpnr:    { type: DataTypes.DECIMAL(12, 4), allowNull: false, defaultValue: 0 },
    codigo:          { type: DataTypes.STRING(50), allowNull: false },
    descripcion:     { type: DataTypes.STRING(500), allowNull: false },
    unidad_medida:   { type: DataTypes.STRING(30), defaultValue: 'UNIDAD' },
    cantidad:        { type: DataTypes.DECIMAL(12, 4), defaultValue: 1 },
    precio_unitario: { type: DataTypes.DECIMAL(12, 4), defaultValue: 0 },
    descuento:       { type: DataTypes.DECIMAL(12, 4), defaultValue: 0 },
    subtotal:        { type: DataTypes.DECIMAL(12, 4), defaultValue: 0 },
    codigo_iva:      { type: DataTypes.STRING(2), defaultValue: '4' },
    porcentaje_iva:  { type: DataTypes.DECIMAL(5, 2), defaultValue: 15.00 },
    valor_iva:       { type: DataTypes.DECIMAL(12, 4), defaultValue: 0 },
    total:           { type: DataTypes.DECIMAL(12, 4), defaultValue: 0 },
    orden:           { type: DataTypes.INTEGER, defaultValue: 1 },
  },
  { sequelize, tableName: 'detalle_proformas' }
);
