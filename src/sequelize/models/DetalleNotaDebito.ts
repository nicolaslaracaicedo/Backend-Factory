import { DataTypes, Model } from 'sequelize';
import sequelize from '../../config/sequelize';

interface DetalleNotaDebitoAttributes {
  id: number;
  id_nota_debito: number;
  id_empresa: number;
  razon: string;
  valor: number;
  orden: number;
}

export class DetalleNotaDebito extends Model<DetalleNotaDebitoAttributes> implements DetalleNotaDebitoAttributes {
  declare id: number;
  declare id_nota_debito: number;
  declare id_empresa: number;
  declare razon: string;
  declare valor: number;
  declare orden: number;
}

DetalleNotaDebito.init(
  {
    id:             { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_nota_debito: { type: DataTypes.INTEGER, allowNull: false },
    id_empresa:     { type: DataTypes.INTEGER, allowNull: false },
    razon:          { type: DataTypes.STRING(300), allowNull: false },
    valor:          { type: DataTypes.DECIMAL(12, 4), defaultValue: 0 },
    orden:          { type: DataTypes.INTEGER, defaultValue: 1 },
  },
  { sequelize, tableName: 'detalle_notas_debito' }
);
