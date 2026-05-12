import pool from '../config/database';
import { cacheGet, cacheSet, cacheDel, TTL } from '../utils/cache';

const key = (id: number) => `cli:${id}`;

export interface TipoIdentificacion {
  id: string;
  nombre: string;
}

export interface Cliente {
  id: number;
  id_empresa: number;
  tipo_identificacion: string;
  identificacion: string;
  razon_social: string;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  es_recurrente: boolean;
  estado: string;
  created_at: Date;
}

export interface ClienteCreate {
  id_empresa: number;
  tipo_identificacion: string;
  identificacion: string;
  razon_social: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  es_recurrente?: boolean;
}

export interface ClienteUpdate {
  razon_social?: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  es_recurrente?: boolean;
}

export interface ClienteFiltros {
  estado?: string;
  tipo_identificacion?: string;
  search?: string;
}

export const ClienteModel = {
  async findAllByEmpresa(empresaId: number, filtros: ClienteFiltros): Promise<Cliente[]> {
    const condiciones: string[] = ['id_empresa = $1'];
    const params: unknown[] = [empresaId];
    let idx = 2;

    if (filtros.estado && filtros.estado !== 'TODOS') {
      condiciones.push(`estado = $${idx++}`);
      params.push(filtros.estado);
    }
    if (filtros.tipo_identificacion) {
      condiciones.push(`tipo_identificacion = $${idx++}`);
      params.push(filtros.tipo_identificacion);
    }
    if (filtros.search) {
      condiciones.push(`(razon_social ILIKE $${idx} OR identificacion ILIKE $${idx})`);
      params.push(`%${filtros.search}%`);
      idx++;
    }

    const where = condiciones.join(' AND ');
    const result = await pool.query<Cliente>(
      `SELECT id, tipo_identificacion, identificacion, razon_social, direccion,
              telefono, email, es_recurrente, estado, created_at
       FROM clientes WHERE ${where} ORDER BY razon_social`,
      params
    );
    return result.rows;
  },

  async findById(id: number): Promise<Cliente | null> {
    const cached = await cacheGet<Cliente>(key(id));
    if (cached) return cached;

    const result = await pool.query<Cliente>(
      'SELECT * FROM clientes WHERE id = $1',
      [id]
    );
    const cliente = result.rows[0] ?? null;
    if (cliente) await cacheSet(key(id), cliente, TTL.CLIENTE);
    return cliente;
  },

  async findByIdentificacion(empresaId: number, identificacion: string): Promise<Cliente | null> {
    const result = await pool.query<Cliente>(
      'SELECT * FROM clientes WHERE id_empresa = $1 AND identificacion = $2',
      [empresaId, identificacion]
    );
    return result.rows[0] ?? null;
  },

  async create(data: ClienteCreate): Promise<Cliente> {
    const result = await pool.query<Cliente>(
      `INSERT INTO clientes
         (id_empresa, tipo_identificacion, identificacion, razon_social, direccion, telefono, email, es_recurrente)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        data.id_empresa,
        data.tipo_identificacion,
        data.identificacion,
        data.razon_social,
        data.direccion ?? null,
        data.telefono ?? null,
        data.email ?? null,
        data.es_recurrente ?? false,
      ]
    );
    return result.rows[0]!;
  },

  async update(id: number, data: ClienteUpdate): Promise<Cliente | null> {
    const campos = Object.keys(data) as (keyof ClienteUpdate)[];
    if (campos.length === 0) return null;

    const sets = campos.map((campo, i) => `${campo} = $${i + 1}`).join(', ');
    const valores = campos.map((campo) => data[campo]);

    const result = await pool.query<Cliente>(
      `UPDATE clientes SET ${sets} WHERE id = $${campos.length + 1} RETURNING *`,
      [...valores, id]
    );
    await cacheDel(key(id));
    return result.rows[0] ?? null;
  },

  async cambiarEstado(id: number, estado: string): Promise<Cliente | null> {
    const result = await pool.query<Cliente>(
      'UPDATE clientes SET estado = $1 WHERE id = $2 RETURNING *',
      [estado, id]
    );
    await cacheDel(key(id));
    return result.rows[0] ?? null;
  },

  async findAllTiposIdentificacion(): Promise<TipoIdentificacion[]> {
    const result = await pool.query<TipoIdentificacion>(
      'SELECT id, nombre FROM tipos_identificacion ORDER BY id'
    );
    return result.rows;
  },

  async findTipoIdentificacion(id: string): Promise<TipoIdentificacion | null> {
    const result = await pool.query<TipoIdentificacion>(
      'SELECT id, nombre FROM tipos_identificacion WHERE id = $1',
      [id]
    );
    return result.rows[0] ?? null;
  },
};
