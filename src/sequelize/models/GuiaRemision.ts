import { DataTypes, Model } from 'sequelize';
import sequelize from '../../config/sequelize';

interface GuiaRemisionAttributes {
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
  ruc_transportista: string;
  razon_social_transportista: string;
  placa: string;
  fecha_ini_transporte: string;
  fecha_fin_transporte: string;
  ruta: string | null;
  id_cliente: number | null;
  dest_identificacion: string | null;
  dest_razon_social: string | null;
  direccion_destino: string | null;
  motivo_traslado: string | null;
  xml_generado: string | null;
  xml_autorizado: string | null;
  pdf_url: string | null;
  respuesta_sri: string | null;
  motivo_rechazo: string | null;
  created_at: Date;
  updated_at: Date;
}

export class GuiaRemision extends Model<GuiaRemisionAttributes> implements GuiaRemisionAttributes {
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
  declare ruc_transportista: string;
  declare razon_social_transportista: string;
  declare placa: string;
  declare fecha_ini_transporte: string;
  declare fecha_fin_transporte: string;
  declare ruta: string | null;
  declare id_cliente: number | null;
  declare dest_identificacion: string | null;
  declare dest_razon_social: string | null;
  declare direccion_destino: string | null;
  declare motivo_traslado: string | null;
  declare xml_generado: string | null;
  declare xml_autorizado: string | null;
  declare pdf_url: string | null;
  declare respuesta_sri: string | null;
  declare motivo_rechazo: string | null;
  declare created_at: Date;
  declare updated_at: Date;
}

GuiaRemision.init(
  {
    id:                         { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_empresa:                 { type: DataTypes.INTEGER, allowNull: false },
    id_usuario:                 { type: DataTypes.INTEGER, allowNull: false },
    id_punto_emision:           { type: DataTypes.INTEGER, allowNull: false },
    cod_establecimiento:        { type: DataTypes.STRING(3), allowNull: false },
    cod_punto_emision:          { type: DataTypes.STRING(3), allowNull: false },
    secuencial:                 { type: DataTypes.STRING(9), allowNull: false },
    numero_comprobante:         { type: DataTypes.STRING(17), allowNull: true },
    clave_acceso:               { type: DataTypes.STRING(49), allowNull: true, unique: true },
    numero_autorizacion:        { type: DataTypes.STRING(49), allowNull: true },
    estado:                     { type: DataTypes.STRING(20), defaultValue: 'BORRADOR' },
    fecha_emision:              { type: DataTypes.DATEONLY, allowNull: false },
    fecha_autorizacion:         { type: DataTypes.DATE, allowNull: true },
    ruc_transportista:          { type: DataTypes.STRING(13), allowNull: false },
    razon_social_transportista: { type: DataTypes.STRING(300), allowNull: false },
    placa:                      { type: DataTypes.STRING(10), allowNull: false },
    fecha_ini_transporte:       { type: DataTypes.DATEONLY, allowNull: false },
    fecha_fin_transporte:       { type: DataTypes.DATEONLY, allowNull: false },
    ruta:                       { type: DataTypes.STRING(300), allowNull: true },
    id_cliente:                 { type: DataTypes.INTEGER, allowNull: true },
    dest_identificacion:        { type: DataTypes.STRING(20), allowNull: true },
    dest_razon_social:          { type: DataTypes.STRING(300), allowNull: true },
    direccion_destino:          { type: DataTypes.STRING(500), allowNull: true },
    motivo_traslado:            { type: DataTypes.STRING(300), allowNull: true },
    xml_generado:               { type: DataTypes.TEXT, allowNull: true },
    xml_autorizado:             { type: DataTypes.TEXT, allowNull: true },
    pdf_url:                    { type: DataTypes.TEXT, allowNull: true },
    respuesta_sri:              { type: DataTypes.TEXT, allowNull: true },
    motivo_rechazo:             { type: DataTypes.TEXT, allowNull: true },
    created_at:                 { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at:                 { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { sequelize, tableName: 'guias_remision' }
);
