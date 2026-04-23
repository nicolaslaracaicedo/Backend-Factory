import pool from '../config/database';

export interface TipoIdentificacion {
  id: string;
  nombre: string;
}

export interface Proveedor {
  id: number;
  id_empresa: number;
  tipo_identificacion: string;
  identificacion: string;
  razon_social: string;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  estado: string;
  created_at: Date;
}

export interface ProveedorCreate {
  id_empresa: number;
  tipo_identificacion: string;
  identificacion: string;
  razon_social: string;
  direccion?: string;
  telefono?: string;
  email?: string;
}

export interface ProveedorUpdate {
  razon_social?: string;
  direccion?: string;
  telefono?: string;
  email?: string;
}

export interface ProveedorFiltros {
  estado?: string;
  tipo_identificacion?: string;
  search?: string;
}

export const ProveedorModel = {
  async findAllByEmpresa(empresaId: number, filtros: ProveedorFiltros): Promise<Proveedor[]> {
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
    const result = await pool.query<Proveedor>(
      `SELECT id, tipo_identificacion, identificacion, razon_social, direccion,
              telefono, email, estado, created_at
       FROM proveedores WHERE ${where} ORDER BY razon_social`,
      params
    );
    return result.rows;
  },

  async findById(id: number): Promise<Proveedor | null> {
    const result = await pool.query<Proveedor>(
      'SELECT * FROM proveedores WHERE id = $1',
      [id]
    );
    return result.rows[0] ?? null;
  },

  async findByIdentificacion(empresaId: number, identificacion: string): Promise<Proveedor | null> {
    const result = await pool.query<Proveedor>(
      'SELECT * FROM proveedores WHERE id_empresa = $1 AND identificacion = $2',
      [empresaId, identificacion]
    );
    return result.rows[0] ?? null;
  },

  async create(data: ProveedorCreate): Promise<Proveedor> {
    const result = await pool.query<Proveedor>(
      `INSERT INTO proveedores
         (id_empresa, tipo_identificacion, identificacion, razon_social, direccion, telefono, email)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        data.id_empresa,
        data.tipo_identificacion,
        data.identificacion,
        data.razon_social,
        data.direccion ?? null,
        data.telefono ?? null,
        data.email ?? null,
      ]
    );
    return result.rows[0]!;
  },

  async update(id: number, data: ProveedorUpdate): Promise<Proveedor | null> {
    const campos = Object.keys(data) as (keyof ProveedorUpdate)[];
    if (campos.length === 0) return null;

    const sets = campos.map((campo, i) => `${campo} = $${i + 1}`).join(', ');
    const valores = campos.map((campo) => data[campo]);

    const result = await pool.query<Proveedor>(
      `UPDATE proveedores SET ${sets} WHERE id = $${campos.length + 1} RETURNING *`,
      [...valores, id]
    );
    return result.rows[0] ?? null;
  },

  async cambiarEstado(id: number, estado: string): Promise<Proveedor | null> {
    const result = await pool.query<Proveedor>(
      'UPDATE proveedores SET estado = $1 WHERE id = $2 RETURNING *',
      [estado, id]
    );
    return result.rows[0] ?? null;
  },

  async findTiposIdentificacion(): Promise<TipoIdentificacion[]> {
    const result = await pool.query<TipoIdentificacion>(
      `SELECT id, nombre FROM tipos_identificacion WHERE id != '07' ORDER BY id`
    );
    return result.rows;
  },

  async findTipoIdentificacion(id: string): Promise<TipoIdentificacion | null> {
    const result = await pool.query<TipoIdentificacion>(
      `SELECT id, nombre FROM tipos_identificacion WHERE id = $1 AND id != '07'`,
      [id]
    );
    return result.rows[0] ?? null;
  },
};
