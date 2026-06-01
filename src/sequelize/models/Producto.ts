import { DataTypes, Model } from 'sequelize';
import sequelize from '../../config/sequelize';

interface ProductoAttributes {
  id: number;
  id_empresa: number;
  id_grupo: number | null;
  id_iva: number;
  tipo: string;
  codigo: string;
  codigo_ice: string | null;
  descripcion: string;
  unidad_medida: string;
  precio: number;
  porcentaje_iva: number;
  tiene_ice: boolean;
  tiene_irbpnr: boolean;
  valor_unitario_irbpnr: number;
  porcentaje_ice: number;
  estado: string;
  created_at: Date;
}

export class Producto extends Model<ProductoAttributes> implements ProductoAttributes {
  declare id: number;
  declare id_empresa: number;
  declare id_grupo: number | null;
  declare id_iva: number;
  declare tipo: string;
  declare codigo: string;
  declare codigo_ice: string | null;
  declare descripcion: string;
  declare unidad_medida: string;
  declare precio: number;
  declare porcentaje_iva: number;
  declare tiene_ice: boolean;
  declare tiene_irbpnr: boolean;
  declare valor_unitario_irbpnr: number;
  declare porcentaje_ice: number;
  declare estado: string;
  declare created_at: Date;
}

Producto.init(
  {
    id:                    { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_empresa:            { type: DataTypes.INTEGER, allowNull: false },
    id_grupo:              { type: DataTypes.INTEGER, allowNull: true },
    id_iva:                { type: DataTypes.INTEGER, allowNull: false },
    tipo:                  { type: DataTypes.STRING(20), defaultValue: 'PRODUCTO' },
    codigo:                { type: DataTypes.STRING(50), allowNull: false },
    codigo_ice:            { type: DataTypes.STRING(10), allowNull: true },
    descripcion:           { type: DataTypes.STRING(500), allowNull: false },
    unidad_medida:         { type: DataTypes.STRING(30), defaultValue: 'UNIDAD' },
    precio:                { type: DataTypes.DECIMAL(12, 4), allowNull: false, defaultValue: 0 },
    porcentaje_iva:        { type: DataTypes.DECIMAL(5, 2), allowNull: false },
    tiene_ice:             { type: DataTypes.BOOLEAN, defaultValue: false },
    tiene_irbpnr:          { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    valor_unitario_irbpnr: { type: DataTypes.DECIMAL(12, 4), allowNull: false, defaultValue: 0 },
    porcentaje_ice:        { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
    estado:                { type: DataTypes.STRING(20), defaultValue: 'ACTIVO' },
    created_at:            { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { sequelize, tableName: 'productos' }
);
