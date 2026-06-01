import { DataTypes, Model } from 'sequelize';
import sequelize from '../../config/sequelize';

interface DetalleGuiaRemisionAttributes {
  id: number;
  id_guia: number;
  id_empresa: number;
  id_producto: number | null;
  codigo: string | null;
  descripcion: string;
  cantidad: number;
  orden: number;
}

export class DetalleGuiaRemision extends Model<DetalleGuiaRemisionAttributes> implements DetalleGuiaRemisionAttributes {
  declare id: number;
  declare id_guia: number;
  declare id_empresa: number;
  declare id_producto: number | null;
  declare codigo: string | null;
  declare descripcion: string;
  declare cantidad: number;
  declare orden: number;
}

DetalleGuiaRemision.init(
  {
    id:          { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_guia:     { type: DataTypes.INTEGER, allowNull: false },
    id_empresa:  { type: DataTypes.INTEGER, allowNull: false },
    id_producto: { type: DataTypes.INTEGER, allowNull: true },
    codigo:      { type: DataTypes.STRING(50), allowNull: true },
    descripcion: { type: DataTypes.STRING(500), allowNull: false },
    cantidad:    { type: DataTypes.DECIMAL(12, 4), defaultValue: 1 },
    orden:       { type: DataTypes.INTEGER, defaultValue: 1 },
  },
  { sequelize, tableName: 'detalle_guias_remision' }
);
