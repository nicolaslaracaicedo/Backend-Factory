import { DataTypes, Model } from 'sequelize';
import sequelize from '../../config/sequelize';

interface DetalleFacturaAttributes {
  id: number;
  id_factura: number;
  id_empresa: number;
  id_producto: number | null;
  codigo: string;
  descripcion: string;
  unidad_medida: string;
  cantidad: number;
  precio_unitario: number;
  descuento: number;
  subtotal: number;
  codigo_iva: string;
  codigo_ice: string | null;
  porcentaje_iva: number;
  valor_iva: number;
  valor_ice: number;
  valor_irbpnr: number;
  porcentaje_ice: number;
  total: number;
  orden: number;
}

export class DetalleFactura extends Model<DetalleFacturaAttributes> implements DetalleFacturaAttributes {
  declare id: number;
  declare id_factura: number;
  declare id_empresa: number;
  declare id_producto: number | null;
  declare codigo: string;
  declare descripcion: string;
  declare unidad_medida: string;
  declare cantidad: number;
  declare precio_unitario: number;
  declare descuento: number;
  declare subtotal: number;
  declare codigo_iva: string;
  declare codigo_ice: string | null;
  declare porcentaje_iva: number;
  declare valor_iva: number;
  declare valor_ice: number;
  declare valor_irbpnr: number;
  declare porcentaje_ice: number;
  declare total: number;
  declare orden: number;
}

DetalleFactura.init(
  {
    id:              { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_factura:      { type: DataTypes.INTEGER, allowNull: false },
    id_empresa:      { type: DataTypes.INTEGER, allowNull: false },
    id_producto:     { type: DataTypes.INTEGER, allowNull: true },
    codigo:          { type: DataTypes.STRING(50), allowNull: false },
    descripcion:     { type: DataTypes.STRING(500), allowNull: false },
    unidad_medida:   { type: DataTypes.STRING(30), defaultValue: 'UNIDAD' },
    cantidad:        { type: DataTypes.DECIMAL(12, 4), defaultValue: 1 },
    precio_unitario: { type: DataTypes.DECIMAL(12, 4), defaultValue: 0 },
    descuento:       { type: DataTypes.DECIMAL(12, 4), defaultValue: 0 },
    subtotal:        { type: DataTypes.DECIMAL(12, 4), defaultValue: 0 },
    codigo_iva:      { type: DataTypes.STRING(2), defaultValue: '4' },
    codigo_ice:      { type: DataTypes.STRING(10), allowNull: true },
    porcentaje_iva:  { type: DataTypes.DECIMAL(5, 2), defaultValue: 15.00 },
    valor_iva:       { type: DataTypes.DECIMAL(12, 4), defaultValue: 0 },
    valor_ice:       { type: DataTypes.DECIMAL(12, 4), defaultValue: 0 },
    valor_irbpnr:    { type: DataTypes.DECIMAL(12, 4), defaultValue: 0 },
    porcentaje_ice:  { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
    total:           { type: DataTypes.DECIMAL(12, 4), defaultValue: 0 },
    orden:           { type: DataTypes.INTEGER, defaultValue: 1 },
  },
  { sequelize, tableName: 'detalle_facturas' }
);
