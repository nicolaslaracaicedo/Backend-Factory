import { DataTypes, Model } from 'sequelize';
import sequelize from '../../config/sequelize';

interface NotaCreditoAttributes {
  id: number;
  id_empresa: number;
  id_usuario: number;
  id_factura_ref: number | null;
  id_punto_emision: number;
  id_ambiente: number;
  factura_ref_numero: string | null;
  factura_ref_fecha: string | null;
  factura_ref_autorizacion: string | null;
  cod_establecimiento: string;
  cod_punto_emision: string;
  secuencial: string;
  numero_comprobante: string | null;
  clave_acceso: string | null;
  numero_autorizacion: string | null;
  estado: string;
  fecha_emision: string;
  fecha_autorizacion: Date | null;
  id_cliente: number | null;
  cli_identificacion: string | null;
  cli_razon_social: string | null;
  motivo: string;
  subtotal_sin_impuesto: number;
  subtotal_0: number;
  subtotal_iva: number;
  descuento_total: number;
  iva_total: number;
  total: number;
  xml_generado: string | null;
  xml_autorizado: string | null;
  pdf_url: string | null;
  respuesta_sri: string | null;
  motivo_rechazo: string | null;
  created_at: Date;
  updated_at: Date;
}

export class NotaCredito extends Model<NotaCreditoAttributes> implements NotaCreditoAttributes {
  declare id: number;
  declare id_empresa: number;
  declare id_usuario: number;
  declare id_factura_ref: number | null;
  declare id_punto_emision: number;
  declare id_ambiente: number;
  declare factura_ref_numero: string | null;
  declare factura_ref_fecha: string | null;
  declare factura_ref_autorizacion: string | null;
  declare cod_establecimiento: string;
  declare cod_punto_emision: string;
  declare secuencial: string;
  declare numero_comprobante: string | null;
  declare clave_acceso: string | null;
  declare numero_autorizacion: string | null;
  declare estado: string;
  declare fecha_emision: string;
  declare fecha_autorizacion: Date | null;
  declare id_cliente: number | null;
  declare cli_identificacion: string | null;
  declare cli_razon_social: string | null;
  declare motivo: string;
  declare subtotal_sin_impuesto: number;
  declare subtotal_0: number;
  declare subtotal_iva: number;
  declare descuento_total: number;
  declare iva_total: number;
  declare total: number;
  declare xml_generado: string | null;
  declare xml_autorizado: string | null;
  declare pdf_url: string | null;
  declare respuesta_sri: string | null;
  declare motivo_rechazo: string | null;
  declare created_at: Date;
  declare updated_at: Date;
}

NotaCredito.init(
  {
    id:                       { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_empresa:               { type: DataTypes.INTEGER, allowNull: false },
    id_usuario:               { type: DataTypes.INTEGER, allowNull: false },
    id_factura_ref:           { type: DataTypes.INTEGER, allowNull: true },
    id_punto_emision:         { type: DataTypes.INTEGER, allowNull: false },
    id_ambiente:              { type: DataTypes.SMALLINT, allowNull: false },
    factura_ref_numero:       { type: DataTypes.STRING(17), allowNull: true },
    factura_ref_fecha:        { type: DataTypes.DATEONLY, allowNull: true },
    factura_ref_autorizacion: { type: DataTypes.STRING(49), allowNull: true },
    cod_establecimiento:      { type: DataTypes.STRING(3), allowNull: false },
    cod_punto_emision:        { type: DataTypes.STRING(3), allowNull: false },
    secuencial:               { type: DataTypes.STRING(9), allowNull: false },
    numero_comprobante:       { type: DataTypes.STRING(17), allowNull: true },
    clave_acceso:             { type: DataTypes.STRING(49), allowNull: true, unique: true },
    numero_autorizacion:      { type: DataTypes.STRING(49), allowNull: true },
    estado:                   { type: DataTypes.STRING(20), defaultValue: 'BORRADOR' },
    fecha_emision:            { type: DataTypes.DATEONLY, allowNull: false },
    fecha_autorizacion:       { type: DataTypes.DATE, allowNull: true },
    id_cliente:               { type: DataTypes.INTEGER, allowNull: true },
    cli_identificacion:       { type: DataTypes.STRING(20), allowNull: true },
    cli_razon_social:         { type: DataTypes.STRING(300), allowNull: true },
    motivo:                   { type: DataTypes.STRING(300), allowNull: false },
    subtotal_sin_impuesto:    { type: DataTypes.DECIMAL(12, 4), defaultValue: 0 },
    subtotal_0:               { type: DataTypes.DECIMAL(12, 4), defaultValue: 0 },
    subtotal_iva:             { type: DataTypes.DECIMAL(12, 4), defaultValue: 0 },
    descuento_total:          { type: DataTypes.DECIMAL(12, 4), defaultValue: 0 },
    iva_total:                { type: DataTypes.DECIMAL(12, 4), defaultValue: 0 },
    total:                    { type: DataTypes.DECIMAL(12, 4), defaultValue: 0 },
    xml_generado:             { type: DataTypes.TEXT, allowNull: true },
    xml_autorizado:           { type: DataTypes.TEXT, allowNull: true },
    pdf_url:                  { type: DataTypes.TEXT, allowNull: true },
    respuesta_sri:            { type: DataTypes.TEXT, allowNull: true },
    motivo_rechazo:           { type: DataTypes.TEXT, allowNull: true },
    created_at:               { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at:               { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { sequelize, tableName: 'notas_credito' }
);
