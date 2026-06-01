import { DataTypes, Model } from 'sequelize';
import sequelize from '../../config/sequelize';

interface ClienteAttributes {
  id: number;
  id_empresa: number;
  tipo_identificacion: string;
  identificacion: string;
  razon_social: string;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  es_recurrente: boolean;
  estado: string;
  created_at: Date;
}

export class Cliente extends Model<ClienteAttributes> implements ClienteAttributes {
  declare id: number;
  declare id_empresa: number;
  declare tipo_identificacion: string;
  declare identificacion: string;
  declare razon_social: string;
  declare direccion: string | null;
  declare telefono: string | null;
  declare email: string | null;
  declare es_recurrente: boolean;
  declare estado: string;
  declare created_at: Date;
}

Cliente.init(
  {
    id:                  { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_empresa:          { type: DataTypes.INTEGER, allowNull: false },
    tipo_identificacion: { type: DataTypes.STRING(2), defaultValue: '05' },
    identificacion:      { type: DataTypes.STRING(20), allowNull: false },
    razon_social:        { type: DataTypes.STRING(300), allowNull: false },
    direccion:           { type: DataTypes.STRING(500), allowNull: true },
    telefono:            { type: DataTypes.STRING(20), allowNull: true },
    email:               { type: DataTypes.STRING(150), allowNull: true },
    es_recurrente:       { type: DataTypes.BOOLEAN, defaultValue: false },
    estado:              { type: DataTypes.STRING(20), defaultValue: 'ACTIVO' },
    created_at:          { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { sequelize, tableName: 'clientes' }
);
