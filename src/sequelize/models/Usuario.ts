import { DataTypes, Model } from 'sequelize';
import sequelize from '../../config/sequelize';

interface UsuarioAttributes {
  id: number;
  id_empresa: number;
  id_rol: number;
  tipo_identificacion: string;
  identificacion: string | null;
  nombre: string;
  apellido: string;
  telefono: string | null;
  direccion: string | null;
  email: string;
  password: string;
  email_verificado: boolean;
  estado: string;
  ultimo_login: Date | null;
  id_punto_emision_default: number | null;
  created_at: Date;
  updated_at: Date;
}

export class Usuario extends Model<UsuarioAttributes> implements UsuarioAttributes {
  declare id: number;
  declare id_empresa: number;
  declare id_rol: number;
  declare tipo_identificacion: string;
  declare identificacion: string | null;
  declare nombre: string;
  declare apellido: string;
  declare telefono: string | null;
  declare direccion: string | null;
  declare email: string;
  declare password: string;
  declare email_verificado: boolean;
  declare estado: string;
  declare ultimo_login: Date | null;
  declare id_punto_emision_default: number | null;
  declare created_at: Date;
  declare updated_at: Date;
}

Usuario.init(
  {
    id:                       { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_empresa:               { type: DataTypes.INTEGER, allowNull: false },
    id_rol:                   { type: DataTypes.INTEGER, allowNull: false },
    tipo_identificacion:      { type: DataTypes.STRING(2), defaultValue: '05' },
    identificacion:           { type: DataTypes.STRING(13), allowNull: true },
    nombre:                   { type: DataTypes.STRING(100), allowNull: false },
    apellido:                 { type: DataTypes.STRING(100), allowNull: false },
    telefono:                 { type: DataTypes.STRING(20), allowNull: true },
    direccion:                { type: DataTypes.STRING(500), allowNull: true },
    email:                    { type: DataTypes.STRING(150), allowNull: false },
    password:                 { type: DataTypes.TEXT, allowNull: false },
    email_verificado:         { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    estado:                   { type: DataTypes.STRING(20), defaultValue: 'ACTIVO' },
    ultimo_login:             { type: DataTypes.DATE, allowNull: true },
    id_punto_emision_default: { type: DataTypes.INTEGER, allowNull: true },
    created_at:               { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at:               { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { sequelize, tableName: 'usuarios' }
);
