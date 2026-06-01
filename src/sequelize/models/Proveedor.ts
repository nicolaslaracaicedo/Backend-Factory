import { DataTypes, Model } from 'sequelize';
import sequelize from '../../config/sequelize';

interface ProveedorAttributes {
  id: number;
  id_empresa: number;
  tipo_identificacion: string;
  identificacion: string;
  razon_social: string;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  estado: string;
  created_at: Date;
}

export class Proveedor extends Model<ProveedorAttributes> implements ProveedorAttributes {
  declare id: number;
  declare id_empresa: number;
  declare tipo_identificacion: string;
  declare identificacion: string;
  declare razon_social: string;
  declare direccion: string | null;
  declare telefono: string | null;
  declare email: string | null;
  declare estado: string;
  declare created_at: Date;
}

Proveedor.init(
  {
    id:                  { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_empresa:          { type: DataTypes.INTEGER, allowNull: false },
    tipo_identificacion: { type: DataTypes.STRING(2), defaultValue: '04' },
    identificacion:      { type: DataTypes.STRING(20), allowNull: false },
    razon_social:        { type: DataTypes.STRING(300), allowNull: false },
    direccion:           { type: DataTypes.STRING(500), allowNull: true },
    telefono:            { type: DataTypes.STRING(20), allowNull: true },
    email:               { type: DataTypes.STRING(150), allowNull: true },
    estado:              { type: DataTypes.STRING(20), defaultValue: 'ACTIVO' },
    created_at:          { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { sequelize, tableName: 'proveedores' }
);
