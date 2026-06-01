import { DataTypes, Model } from 'sequelize';
import sequelize from '../../config/sequelize';

interface DetalleNotaVentaAttributes {
  id: number;
  id_nota_venta: number;
  id_empresa: number;
  id_producto: number | null;
  codigo: string;
  descripcion: string;
  unidad_medida: string;
  cantidad: number;
  precio_unitario: number;
  descuento: number;
  subtotal: number;
  total: number;
  orden: number;
}

export class DetalleNotaVenta extends Model<DetalleNotaVentaAttributes> implements DetalleNotaVentaAttributes {
  declare id: number;
  declare id_nota_venta: number;
  declare id_empresa: number;
  declare id_producto: number | null;
  declare codigo: string;
  declare descripcion: string;
  declare unidad_medida: string;
  declare cantidad: number;
  declare precio_unitario: number;
  declare descuento: number;
  declare subtotal: number;
  declare total: number;
  declare orden: number;
}

DetalleNotaVenta.init(
  {
    id:              { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_nota_venta:   { type: DataTypes.INTEGER, allowNull: false },
    id_empresa:      { type: DataTypes.INTEGER, allowNull: false },
    id_producto:     { type: DataTypes.INTEGER, allowNull: true },
    codigo:          { type: DataTypes.STRING(50), allowNull: false },
    descripcion:     { type: DataTypes.STRING(500), allowNull: false },
    unidad_medida:   { type: DataTypes.STRING(30), defaultValue: 'UNIDAD' },
    cantidad:        { type: DataTypes.DECIMAL(12, 4), allowNull: false, defaultValue: 1 },
    precio_unitario: { type: DataTypes.DECIMAL(12, 4), allowNull: false, defaultValue: 0 },
    descuento:       { type: DataTypes.DECIMAL(12, 4), defaultValue: 0 },
    subtotal:        { type: DataTypes.DECIMAL(12, 4), defaultValue: 0 },
    total:           { type: DataTypes.DECIMAL(12, 4), defaultValue: 0 },
    orden:           { type: DataTypes.INTEGER, defaultValue: 1 },
  },
  { sequelize, tableName: 'detalle_notas_venta' }
);
