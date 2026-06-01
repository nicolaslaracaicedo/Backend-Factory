import { DataTypes, Model } from 'sequelize';
import sequelize from '../../config/sequelize';

interface TipoIdentificacionAttributes {
  id: string;
  nombre: string;
}

export class TipoIdentificacion extends Model<TipoIdentificacionAttributes> implements TipoIdentificacionAttributes {
  declare id: string;
  declare nombre: string;
}

TipoIdentificacion.init(
  {
    id:     { type: DataTypes.STRING(2), primaryKey: true },
    nombre: { type: DataTypes.STRING(50), allowNull: false },
  },
  { sequelize, tableName: 'tipos_identificacion' }
);
