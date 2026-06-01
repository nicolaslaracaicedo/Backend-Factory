import { DataTypes, Model } from 'sequelize';
import sequelize from '../../config/sequelize';

interface CodigoIvaAttributes {
  id: number;
  id_empresa: number;
  codigo: string;
  nombre: string;
  porcentaje: number;
  activo: boolean;
}

export class CodigoIva extends Model<CodigoIvaAttributes> implements CodigoIvaAttributes {
  declare id: number;
  declare id_empresa: number;
  declare codigo: string;
  declare nombre: string;
  declare porcentaje: number;
  declare activo: boolean;
}

CodigoIva.init(
  {
    id:         { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_empresa: { type: DataTypes.INTEGER, allowNull: false },
    codigo:     { type: DataTypes.STRING(2), allowNull: false },
    nombre:     { type: DataTypes.STRING(100), allowNull: false },
    porcentaje: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
    activo:     { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  { sequelize, tableName: 'codigos_iva' }
);
