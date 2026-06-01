import { DataTypes, Model } from 'sequelize';
import sequelize from '../../config/sequelize';

interface LiquidacionCompraAttributes {
  id: number;
  id_empresa: number;
  id_usuario: number;
  id_punto_emision: number;
  cod_establecimiento: string;
  cod_punto_emision: string;
  secuencial: string;
  numero_comprobante: string | null;
  clave_acceso: string | null;
  numero_autorizacion: string | null;
  estado: string;
  fecha_emision: string;
  fecha_autorizacion: Date | null;
  tipo_identificacion_prov: string;
  identificacion_prov: string;
  razon_social_prov: string;
  direccion_prov: string | null;
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

export class LiquidacionCompra extends Model<LiquidacionCompraAttributes> implements LiquidacionCompraAttributes {
  declare id: number;
  declare id_empresa: number;
  declare id_usuario: number;
  declare id_punto_emision: number;
  declare cod_establecimiento: string;
  declare cod_punto_emision: string;
  declare secuencial: string;
  declare numero_comprobante: string | null;
  declare clave_acceso: string | null;
  declare numero_autorizacion: string | null;
  declare estado: string;
  declare fecha_emision: string;
  declare fecha_autorizacion: Date | null;
  declare tipo_identificacion_prov: string;
  declare identificacion_prov: string;
  declare razon_social_prov: string;
  declare direccion_prov: string | null;
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

LiquidacionCompra.init(
  {
    id:                       { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_empresa:               { type: DataTypes.INTEGER, allowNull: false },
    id_usuario:               { type: DataTypes.INTEGER, allowNull: false },
    id_punto_emision:         { type: DataTypes.INTEGER, allowNull: false },
    cod_establecimiento:      { type: DataTypes.STRING(3), allowNull: false },
    cod_punto_emision:        { type: DataTypes.STRING(3), allowNull: false },
    secuencial:               { type: DataTypes.STRING(9), allowNull: false },
    numero_comprobante:       { type: DataTypes.STRING(17), allowNull: true },
    clave_acceso:             { type: DataTypes.STRING(49), allowNull: true, unique: true },
    numero_autorizacion:      { type: DataTypes.STRING(49), allowNull: true },
    estado:                   { type: DataTypes.STRING(20), defaultValue: 'BORRADOR' },
    fecha_emision:            { type: DataTypes.DATEONLY, allowNull: false },
    fecha_autorizacion:       { type: DataTypes.DATE, allowNull: true },
    tipo_identificacion_prov: { type: DataTypes.STRING(2), defaultValue: '05' },
    identificacion_prov:      { type: DataTypes.STRING(20), allowNull: false },
    razon_social_prov:        { type: DataTypes.STRING(300), allowNull: false },
    direccion_prov:           { type: DataTypes.STRING(500), allowNull: true },
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
  { sequelize, tableName: 'liquidaciones_compra' }
);
