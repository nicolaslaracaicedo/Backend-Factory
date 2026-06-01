import { DataTypes, Model } from 'sequelize';
import sequelize from '../../config/sequelize';

interface EmpresaAttributes {
  id: number;
  ruc: string;
  razon_social: string | null;
  nombre_comercial: string | null;
  direccion_matriz: string | null;
  telefono: string | null;
  email: string | null;
  logo_url: string | null;
  color_primario: string | null;
  color_secundario: string | null;
  color_acento: string | null;
  fuente_principal: string | null;
  contribuyente_especial: boolean;
  nro_contribuyente_esp: string | null;
  obligado_contabilidad: boolean;
  agente_retencion: boolean;
  rimpe: boolean;
  regimen: string | null;
  ambiente: number | null;
  estado: string | null;
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_user: string | null;
  smtp_password_enc: string | null;
  smtp_from_name: string | null;
  smtp_secure: boolean;
  created_at: Date;
  updated_at: Date;
}

export class Empresa extends Model<EmpresaAttributes> implements EmpresaAttributes {
  declare id: number;
  declare ruc: string;
  declare razon_social: string | null;
  declare nombre_comercial: string | null;
  declare direccion_matriz: string | null;
  declare telefono: string | null;
  declare email: string | null;
  declare logo_url: string | null;
  declare color_primario: string | null;
  declare color_secundario: string | null;
  declare color_acento: string | null;
  declare fuente_principal: string | null;
  declare contribuyente_especial: boolean;
  declare nro_contribuyente_esp: string | null;
  declare obligado_contabilidad: boolean;
  declare agente_retencion: boolean;
  declare rimpe: boolean;
  declare regimen: string | null;
  declare ambiente: number | null;
  declare estado: string | null;
  declare smtp_host: string | null;
  declare smtp_port: number | null;
  declare smtp_user: string | null;
  declare smtp_password_enc: string | null;
  declare smtp_from_name: string | null;
  declare smtp_secure: boolean;
  declare created_at: Date;
  declare updated_at: Date;
}

Empresa.init(
  {
    id:                     { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    ruc:                    { type: DataTypes.STRING(13), allowNull: false, unique: true },
    razon_social:           { type: DataTypes.STRING(300), allowNull: true },
    nombre_comercial:       { type: DataTypes.STRING(300), allowNull: true },
    direccion_matriz:       { type: DataTypes.STRING(500), allowNull: true },
    telefono:               { type: DataTypes.STRING(20), allowNull: true },
    email:                  { type: DataTypes.STRING(150), allowNull: true },
    logo_url:               { type: DataTypes.TEXT, allowNull: true },
    color_primario:         { type: DataTypes.STRING(7), defaultValue: '#1976D2' },
    color_secundario:       { type: DataTypes.STRING(7), defaultValue: '#424242' },
    color_acento:           { type: DataTypes.STRING(7), defaultValue: '#FF6F00' },
    fuente_principal:       { type: DataTypes.STRING(50), defaultValue: 'Roboto' },
    contribuyente_especial: { type: DataTypes.BOOLEAN, defaultValue: false },
    nro_contribuyente_esp:  { type: DataTypes.STRING(20), allowNull: true },
    obligado_contabilidad:  { type: DataTypes.BOOLEAN, defaultValue: false },
    agente_retencion:       { type: DataTypes.BOOLEAN, defaultValue: false },
    rimpe:                  { type: DataTypes.BOOLEAN, defaultValue: false },
    regimen:                { type: DataTypes.STRING(30), defaultValue: 'GENERAL' },
    ambiente:               { type: DataTypes.SMALLINT, allowNull: true },
    estado:                 { type: DataTypes.STRING(20), defaultValue: 'ACTIVO' },
    smtp_host:              { type: DataTypes.STRING(255), allowNull: true },
    smtp_port:              { type: DataTypes.INTEGER, defaultValue: 587 },
    smtp_user:              { type: DataTypes.STRING(255), allowNull: true },
    smtp_password_enc:      { type: DataTypes.TEXT, allowNull: true },
    smtp_from_name:         { type: DataTypes.STRING(255), allowNull: true },
    smtp_secure:            { type: DataTypes.BOOLEAN, defaultValue: false },
    created_at:             { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at:             { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { sequelize, tableName: 'empresas' }
);
