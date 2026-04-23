import pool from '../config/database';

export interface Ambiente {
  id: number;
  nombre: string;
}

export const AmbienteModel = {
  async findAll(): Promise<Ambiente[]> {
    const result = await pool.query<Ambiente>('SELECT id, nombre FROM ambiente ORDER BY id');
    return result.rows;
  },
};
