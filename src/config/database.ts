import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Retorna DATE como string YYYY-MM-DD en lugar de objeto Date
pg.types.setTypeParser(1082, (val: string) => val);

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  options: '-c timezone=America/Guayaquil',
});

export const connectDB = async (): Promise<void> => {
  await pool.query('SELECT 1');
  console.log('Conexión a la base de datos establecida correctamente.');
};

export default pool;