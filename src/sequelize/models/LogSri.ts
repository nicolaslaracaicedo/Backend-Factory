import { DataTypes, Model } from 'sequelize';
import sequelize from '../../config/sequelize';

interface LogSriAttributes {
  id: number;
  id_empresa: number;
  tipo_documento: string;
  id_documento: number;
  clave_acceso: string | null;
  accion: string;
  ambiente: string;
  estado: string | null;
  request_xml: string | null;
  response_xml: string | null;
  mensaje: string | null;
  created_at: Date;
}

export class LogSri extends Model<LogSriAttributes> implements LogSriAttributes {
  declare id: number;
  declare id_empresa: number;
  declare tipo_documento: string;
  declare id_documento: number;
  declare clave_acceso: string | null;
  declare accion: string;
  declare ambiente: string;
  declare estado: string | null;
  declare request_xml: string | null;
  declare response_xml: string | null;
  declare mensaje: string | null;
  declare created_at: Date;
}

LogSri.init(
  {
    id:             { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_empresa:     { type: DataTypes.INTEGER, allowNull: false },
    tipo_documento: { type: DataTypes.STRING(5), allowNull: false },
    id_documento:   { type: DataTypes.INTEGER, allowNull: false },
    clave_acceso:   { type: DataTypes.STRING(49), allowNull: true },
    accion:         { type: DataTypes.STRING(30), allowNull: false },
    ambiente:       { type: DataTypes.STRING(10), defaultValue: 'PRUEBAS' },
    estado:         { type: DataTypes.STRING(20), allowNull: true },
    request_xml:    { type: DataTypes.TEXT, allowNull: true },
    response_xml:   { type: DataTypes.TEXT, allowNull: true },
    mensaje:        { type: DataTypes.TEXT, allowNull: true },
    created_at:     { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { sequelize, tableName: 'log_sri' }
);
