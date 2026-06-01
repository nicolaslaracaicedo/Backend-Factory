import { DataTypes, Model } from 'sequelize';
import sequelize from '../../config/sequelize';

interface RecurrenteAttributes {
  id: number;
  id_empresa: number;
  id_cliente: number;
  id_usuario: number;
  id_punto_emision: number;
  descripcion: string;
  frecuencia: string;
  dia_emision: number;
  proxima_facturacion: string;
  ultima_facturacion: string | null;
  forma_pago: string;
  estado: string;
  created_at: Date;
}

export class Recurrente extends Model<RecurrenteAttributes> implements RecurrenteAttributes {
  declare id: number;
  declare id_empresa: number;
  declare id_cliente: number;
  declare id_usuario: number;
  declare id_punto_emision: number;
  declare descripcion: string;
  declare frecuencia: string;
  declare dia_emision: number;
  declare proxima_facturacion: string;
  declare ultima_facturacion: string | null;
  declare forma_pago: string;
  declare estado: string;
  declare created_at: Date;
}

Recurrente.init(
  {
    id:                  { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_empresa:          { type: DataTypes.INTEGER, allowNull: false },
    id_cliente:          { type: DataTypes.INTEGER, allowNull: false },
    id_usuario:          { type: DataTypes.INTEGER, allowNull: false },
    id_punto_emision:    { type: DataTypes.INTEGER, allowNull: false },
    descripcion:         { type: DataTypes.STRING(300), allowNull: false },
    frecuencia:          { type: DataTypes.STRING(20), defaultValue: 'MENSUAL' },
    dia_emision:         { type: DataTypes.INTEGER, defaultValue: 1 },
    proxima_facturacion: { type: DataTypes.DATEONLY, allowNull: false },
    ultima_facturacion:  { type: DataTypes.DATEONLY, allowNull: true },
    forma_pago:          { type: DataTypes.STRING(5), defaultValue: '01' },
    estado:              { type: DataTypes.STRING(20), defaultValue: 'ACTIVO' },
    created_at:          { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { sequelize, tableName: 'recurrentes' }
);
