import { DataTypes, Model } from 'sequelize';
import sequelize from '../../config/sequelize';

interface TokenVerificacionEmailAttributes {
  id: number;
  id_usuario: number;
  token: string;
  expira_en: Date;
  usado: boolean;
  created_at: Date;
}

export class TokenVerificacionEmail extends Model<TokenVerificacionEmailAttributes> implements TokenVerificacionEmailAttributes {
  declare id: number;
  declare id_usuario: number;
  declare token: string;
  declare expira_en: Date;
  declare usado: boolean;
  declare created_at: Date;
}

TokenVerificacionEmail.init(
  {
    id:         { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_usuario: { type: DataTypes.INTEGER, allowNull: false },
    token:      { type: DataTypes.STRING(6), allowNull: false },
    expira_en:  { type: DataTypes.DATE, allowNull: false },
    usado:      { type: DataTypes.BOOLEAN, defaultValue: false },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { sequelize, tableName: 'tokens_verificacion_email' }
);
