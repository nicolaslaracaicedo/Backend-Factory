import { DataTypes, Model } from 'sequelize';
import sequelize from '../../config/sequelize';

interface TipoDocumentoAttributes {
  codigo: string;
  nombre: string;
}

export class TipoDocumento extends Model<TipoDocumentoAttributes> implements TipoDocumentoAttributes {
  declare codigo: string;
  declare nombre: string;
}

TipoDocumento.init(
  {
    codigo: { type: DataTypes.STRING(5), primaryKey: true },
    nombre: { type: DataTypes.STRING(100), allowNull: false },
  },
  { sequelize, tableName: 'tipos_documento' }
);
