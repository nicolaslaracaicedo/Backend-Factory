import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  timezone: 'America/Guayaquil',
  logging: false,
  define: {
    underscored: true,
    timestamps: false,
    freezeTableName: true,
  },
});

export default sequelize;
