import { DataTypes, Model } from 'sequelize';
import sequelize from '../../config/sequelize';

interface FacturaAttributes {
  id: number;
  id_empresa: number;
  id_usuario: number;
  id_cliente: number | null;
  id_punto_emision: number;
  id_ambiente: number;
  cod_establecimiento: string;
  cod_punto_emision: string;
  secuencial: string;
  numero_comprobante: string | null;
  clave_acceso: string | null;
  numero_autorizacion: string | null;
  estado: string;
  fecha_emision: string;
  fecha_autorizacion: Date | null;
  cli_identificacion: string | null;
  cli_razon_social: string | null;
  cli_direccion: string | null;
  cli_telefono: string | null;
  cli_email: string | null;
  forma_pago: string;
  tipo_pago: string;
  dias_plazo: number;
  regimen: string | null;
  subtotal_sin_impuesto: number;
  subtotal_0: number;
  subtotal_iva: number;
  subtotal_no_objeto_iva: number;
  subtotal_exento_iva: number;
  descuento_total: number;
  valor_ice: number;
  valor_irbpnr: number;
  iva_porcentaje: number;
  iva_total: number;
  total: number;
  xml_generado: string | null;
  xml_autorizado: string | null;
  pdf_url: string | null;
  respuesta_sri: string | null;
  motivo_rechazo: string | null;
  observacion: string | null;
  monto_recibido: number | null;
  vuelto: number | null;
  created_at: Date;
  updated_at: Date;
}

export class Factura extends Model<FacturaAttributes> implements FacturaAttributes {
  declare id: number;
  declare id_empresa: number;
  declare id_usuario: number;
  declare id_cliente: number | null;
  declare id_punto_emision: number;
  declare id_ambiente: number;
  declare cod_establecimiento: string;
  declare cod_punto_emision: string;
  declare secuencial: string;
  declare numero_comprobante: string | null;
  declare clave_acceso: string | null;
  declare numero_autorizacion: string | null;
  declare estado: string;
  declare fecha_emision: string;
  declare fecha_autorizacion: Date | null;
  declare cli_identificacion: string | null;
  declare cli_razon_social: string | null;
  declare cli_direccion: string | null;
  declare cli_telefono: string | null;
  declare cli_email: string | null;
  declare forma_pago: string;
  declare tipo_pago: string;
  declare dias_plazo: number;
  declare regimen: string | null;
  declare subtotal_sin_impuesto: number;
  declare subtotal_0: number;
  declare subtotal_iva: number;
  declare subtotal_no_objeto_iva: number;
  declare subtotal_exento_iva: number;
  declare descuento_total: number;
  declare valor_ice: number;
  declare valor_irbpnr: number;
  declare iva_porcentaje: number;
  declare iva_total: number;
  declare total: number;
  declare xml_generado: string | null;
  declare xml_autorizado: string | null;
  declare pdf_url: string | null;
  declare respuesta_sri: string | null;
  declare motivo_rechazo: string | null;
  declare observacion: string | null;
  declare monto_recibido: number | null;
  declare vuelto: number | null;
  declare created_at: Date;
  declare updated_at: Date;
}

Factura.init(
  {
    id:                     { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_empresa:             { type: DataTypes.INTEGER, allowNull: false },
    id_usuario:             { type: DataTypes.INTEGER, allowNull: false },
    id_cliente:             { type: DataTypes.INTEGER, allowNull: true },
    id_punto_emision:       { type: DataTypes.INTEGER, allowNull: false },
    id_ambiente:            { type: DataTypes.SMALLINT, allowNull: false },
    cod_establecimiento:    { type: DataTypes.STRING(3), allowNull: false },
    cod_punto_emision:      { type: DataTypes.STRING(3), allowNull: false },
    secuencial:             { type: DataTypes.STRING(9), allowNull: false },
    numero_comprobante:     { type: DataTypes.STRING(17), allowNull: true },
    clave_acceso:           { type: DataTypes.STRING(49), allowNull: true, unique: true },
    numero_autorizacion:    { type: DataTypes.STRING(49), allowNull: true },
    estado:                 { type: DataTypes.STRING(20), defaultValue: 'BORRADOR' },
    fecha_emision:          { type: DataTypes.DATEONLY, allowNull: false },
    fecha_autorizacion:     { type: DataTypes.DATE, allowNull: true },
    cli_identificacion:     { type: DataTypes.STRING(20), allowNull: true },
    cli_razon_social:       { type: DataTypes.STRING(300), allowNull: true },
    cli_direccion:          { type: DataTypes.STRING(500), allowNull: true },
    cli_telefono:           { type: DataTypes.STRING(20), allowNull: true },
    cli_email:              { type: DataTypes.STRING(150), allowNull: true },
    forma_pago:             { type: DataTypes.STRING(5), defaultValue: '01' },
    tipo_pago:              { type: DataTypes.STRING(10), defaultValue: 'CONTADO' },
    dias_plazo:             { type: DataTypes.INTEGER, defaultValue: 0 },
    regimen:                { type: DataTypes.STRING(20), allowNull: true },
    subtotal_sin_impuesto:  { type: DataTypes.DECIMAL(12, 4), defaultValue: 0 },
    subtotal_0:             { type: DataTypes.DECIMAL(12, 4), defaultValue: 0 },
    subtotal_iva:           { type: DataTypes.DECIMAL(12, 4), defaultValue: 0 },
    subtotal_no_objeto_iva: { type: DataTypes.DECIMAL(12, 4), defaultValue: 0 },
    subtotal_exento_iva:    { type: DataTypes.DECIMAL(12, 4), defaultValue: 0 },
    descuento_total:        { type: DataTypes.DECIMAL(12, 4), defaultValue: 0 },
    valor_ice:              { type: DataTypes.DECIMAL(12, 4), defaultValue: 0 },
    valor_irbpnr:           { type: DataTypes.DECIMAL(12, 4), defaultValue: 0 },
    iva_porcentaje:         { type: DataTypes.DECIMAL(5, 2), defaultValue: 15.00 },
    iva_total:              { type: DataTypes.DECIMAL(12, 4), defaultValue: 0 },
    total:                  { type: DataTypes.DECIMAL(12, 4), defaultValue: 0 },
    xml_generado:           { type: DataTypes.TEXT, allowNull: true },
    xml_autorizado:         { type: DataTypes.TEXT, allowNull: true },
    pdf_url:                { type: DataTypes.TEXT, allowNull: true },
    respuesta_sri:          { type: DataTypes.TEXT, allowNull: true },
    motivo_rechazo:         { type: DataTypes.TEXT, allowNull: true },
    observacion:            { type: DataTypes.TEXT, allowNull: true },
    monto_recibido:         { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    vuelto:                 { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    created_at:             { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at:             { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { sequelize, tableName: 'facturas' }
);
