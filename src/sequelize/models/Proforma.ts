import { DataTypes, Model } from 'sequelize';
import sequelize from '../../config/sequelize';

interface ProformaAttributes {
  id: number;
  id_empresa: number;
  id_usuario: number;
  id_cliente: number | null;
  id_punto_emision: number;
  numero: string;
  fecha_emision: string;
  fecha_vencimiento: string | null;
  cli_identificacion: string | null;
  cli_razon_social: string | null;
  subtotal_sin_impuesto: number;
  subtotal_0: number;
  subtotal_iva: number;
  descuento_total: number;
  iva_total: number;
  total: number;
  estado: string;
  id_factura: number | null;
  observaciones: string | null;
  pdf_url: string | null;
  created_at: Date;
  updated_at: Date;
}

export class Proforma extends Model<ProformaAttributes> implements ProformaAttributes {
  declare id: number;
  declare id_empresa: number;
  declare id_usuario: number;
  declare id_cliente: number | null;
  declare id_punto_emision: number;
  declare numero: string;
  declare fecha_emision: string;
  declare fecha_vencimiento: string | null;
  declare cli_identificacion: string | null;
  declare cli_razon_social: string | null;
  declare subtotal_sin_impuesto: number;
  declare subtotal_0: number;
  declare subtotal_iva: number;
  declare descuento_total: number;
  declare iva_total: number;
  declare total: number;
  declare estado: string;
  declare id_factura: number | null;
  declare observaciones: string | null;
  declare pdf_url: string | null;
  declare created_at: Date;
  declare updated_at: Date;
}

Proforma.init(
  {
    id:                    { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_empresa:            { type: DataTypes.INTEGER, allowNull: false },
    id_usuario:            { type: DataTypes.INTEGER, allowNull: false },
    id_cliente:            { type: DataTypes.INTEGER, allowNull: true },
    id_punto_emision:      { type: DataTypes.INTEGER, allowNull: false },
    numero:                { type: DataTypes.STRING(20), allowNull: false },
    fecha_emision:         { type: DataTypes.DATEONLY, allowNull: false },
    fecha_vencimiento:     { type: DataTypes.DATEONLY, allowNull: true },
    cli_identificacion:    { type: DataTypes.STRING(20), allowNull: true },
    cli_razon_social:      { type: DataTypes.STRING(300), allowNull: true },
    subtotal_sin_impuesto: { type: DataTypes.DECIMAL(12, 4), defaultValue: 0 },
    subtotal_0:            { type: DataTypes.DECIMAL(12, 4), defaultValue: 0 },
    subtotal_iva:          { type: DataTypes.DECIMAL(12, 4), defaultValue: 0 },
    descuento_total:       { type: DataTypes.DECIMAL(12, 4), defaultValue: 0 },
    iva_total:             { type: DataTypes.DECIMAL(12, 4), defaultValue: 0 },
    total:                 { type: DataTypes.DECIMAL(12, 4), defaultValue: 0 },
    estado:                { type: DataTypes.STRING(20), defaultValue: 'PENDIENTE' },
    id_factura:            { type: DataTypes.INTEGER, allowNull: true },
    observaciones:         { type: DataTypes.TEXT, allowNull: true },
    pdf_url:               { type: DataTypes.TEXT, allowNull: true },
    created_at:            { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at:            { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { sequelize, tableName: 'proformas' }
);
