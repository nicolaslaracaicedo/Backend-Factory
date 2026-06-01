import { DataTypes, Model } from 'sequelize';
import sequelize from '../../config/sequelize';

interface RetencionAttributes {
  id: number;
  id_empresa: number;
  id_usuario: number;
  id_factura_ref: number | null;
  id_punto_emision: number;
  id_ambiente: number;
  comprobante_ref_numero: string | null;
  comprobante_ref_fecha: string | null;
  cod_establecimiento: string;
  cod_punto_emision: string;
  secuencial: string;
  numero_comprobante: string | null;
  clave_acceso: string | null;
  numero_autorizacion: string | null;
  estado: string;
  fecha_emision: string;
  fecha_autorizacion: Date | null;
  id_proveedor: number | null;
  prov_identificacion: string | null;
  prov_razon_social: string | null;
  total_retenido: number;
  xml_generado: string | null;
  xml_autorizado: string | null;
  pdf_url: string | null;
  respuesta_sri: string | null;
  motivo_rechazo: string | null;
  created_at: Date;
  updated_at: Date;
}

export class Retencion extends Model<RetencionAttributes> implements RetencionAttributes {
  declare id: number;
  declare id_empresa: number;
  declare id_usuario: number;
  declare id_factura_ref: number | null;
  declare id_punto_emision: number;
  declare id_ambiente: number;
  declare comprobante_ref_numero: string | null;
  declare comprobante_ref_fecha: string | null;
  declare cod_establecimiento: string;
  declare cod_punto_emision: string;
  declare secuencial: string;
  declare numero_comprobante: string | null;
  declare clave_acceso: string | null;
  declare numero_autorizacion: string | null;
  declare estado: string;
  declare fecha_emision: string;
  declare fecha_autorizacion: Date | null;
  declare id_proveedor: number | null;
  declare prov_identificacion: string | null;
  declare prov_razon_social: string | null;
  declare total_retenido: number;
  declare xml_generado: string | null;
  declare xml_autorizado: string | null;
  declare pdf_url: string | null;
  declare respuesta_sri: string | null;
  declare motivo_rechazo: string | null;
  declare created_at: Date;
  declare updated_at: Date;
}

Retencion.init(
  {
    id:                     { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_empresa:             { type: DataTypes.INTEGER, allowNull: false },
    id_usuario:             { type: DataTypes.INTEGER, allowNull: false },
    id_factura_ref:         { type: DataTypes.INTEGER, allowNull: true },
    id_punto_emision:       { type: DataTypes.INTEGER, allowNull: false },
    id_ambiente:            { type: DataTypes.SMALLINT, allowNull: false },
    comprobante_ref_numero: { type: DataTypes.STRING(17), allowNull: true },
    comprobante_ref_fecha:  { type: DataTypes.DATEONLY, allowNull: true },
    cod_establecimiento:    { type: DataTypes.STRING(3), allowNull: false },
    cod_punto_emision:      { type: DataTypes.STRING(3), allowNull: false },
    secuencial:             { type: DataTypes.STRING(9), allowNull: false },
    numero_comprobante:     { type: DataTypes.STRING(17), allowNull: true },
    clave_acceso:           { type: DataTypes.STRING(49), allowNull: true, unique: true },
    numero_autorizacion:    { type: DataTypes.STRING(49), allowNull: true },
    estado:                 { type: DataTypes.STRING(20), defaultValue: 'BORRADOR' },
    fecha_emision:          { type: DataTypes.DATEONLY, allowNull: false },
    fecha_autorizacion:     { type: DataTypes.DATE, allowNull: true },
    id_proveedor:           { type: DataTypes.INTEGER, allowNull: true },
    prov_identificacion:    { type: DataTypes.STRING(20), allowNull: true },
    prov_razon_social:      { type: DataTypes.STRING(300), allowNull: true },
    total_retenido:         { type: DataTypes.DECIMAL(12, 4), defaultValue: 0 },
    xml_generado:           { type: DataTypes.TEXT, allowNull: true },
    xml_autorizado:         { type: DataTypes.TEXT, allowNull: true },
    pdf_url:                { type: DataTypes.TEXT, allowNull: true },
    respuesta_sri:          { type: DataTypes.TEXT, allowNull: true },
    motivo_rechazo:         { type: DataTypes.TEXT, allowNull: true },
    created_at:             { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at:             { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { sequelize, tableName: 'retenciones' }
);
