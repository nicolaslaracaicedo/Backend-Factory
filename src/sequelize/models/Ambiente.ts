import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../../config/sequelize';

interface AmbienteAttributes {
  id: number;
  nombre: string | null;
}

export class Ambiente extends Model<AmbienteAttributes> implements AmbienteAttributes {
  declare id: number;
  declare nombre: string | null;
}

Ambiente.init(
  {
    id: { type: DataTypes.SMALLINT, primaryKey: true },
    nombre: { type: DataTypes.STRING(20), allowNull: true },
  },
  { sequelize, tableName: 'ambiente' }
);
