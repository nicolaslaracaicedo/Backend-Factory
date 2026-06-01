import { DataTypes, Model } from 'sequelize';
import sequelize from '../../config/sequelize';

interface DatoAdicionalFacturaAttributes {
  id: number;
  id_factura: number;
  id_empresa: number;
  nombre: string;
  valor: string;
  orden: number;
}

export class DatoAdicionalFactura extends Model<DatoAdicionalFacturaAttributes> implements DatoAdicionalFacturaAttributes {
  declare id: number;
  declare id_factura: number;
  declare id_empresa: number;
  declare nombre: string;
  declare valor: string;
  declare orden: number;
}

DatoAdicionalFactura.init(
  {
    id:         { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_factura: { type: DataTypes.INTEGER, allowNull: false },
    id_empresa: { type: DataTypes.INTEGER, allowNull: false },
    nombre:     { type: DataTypes.STRING(100), allowNull: false },
    valor:      { type: DataTypes.STRING(300), allowNull: false },
    orden:      { type: DataTypes.INTEGER, defaultValue: 1 },
  },
  { sequelize, tableName: 'datos_adicionales_factura' }
);
