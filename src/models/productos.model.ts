import pool from '../config/database';
import { cacheGet, cacheSet, cacheDel, TTL } from '../utils/cache';

const key = (id: number) => `prod:${id}`;

export interface Producto {
  id: number;
  id_empresa: number;
  id_grupo: number | null;
  id_iva: number;
  tipo: string;
  codigo: string;
  descripcion: string;
  unidad_medida: string;
  precio: number;
  porcentaje_iva: number;
  tiene_ice: boolean;
  porcentaje_ice: number;
  codigo_ice: string | null;
  tiene_irbpnr: boolean;
  valor_unitario_irbpnr: number;
  estado: string;
  created_at: Date;
}

export interface ProductoCreate {
  id_empresa: number;
  id_grupo?: number;
  id_iva: number;
  tipo?: string;
  codigo: string;
  descripcion: string;
  unidad_medida?: string;
  precio: number;
  porcentaje_iva: number;
  tiene_ice?: boolean;
  porcentaje_ice?: number;
  codigo_ice?: string | null;
  tiene_irbpnr?: boolean;
  valor_unitario_irbpnr?: number;
}

export interface ProductoUpdate {
  id_grupo?: number | null;
  id_iva?: number;
  tipo?: string;
  descripcion?: string;
  unidad_medida?: string;
  precio?: number;
  porcentaje_iva?: number;
  tiene_ice?: boolean;
  porcentaje_ice?: number;
  codigo_ice?: string | null;
  tiene_irbpnr?: boolean;
  valor_unitario_irbpnr?: number;
}

export interface ProductoFiltros {
  estado?: string;
  tipo?: string;
  id_grupo?: number;
  id_iva?: number;
  search?: string;
}

export const ProductoModel = {
  async findAllByEmpresa(empresaId: number, filtros: ProductoFiltros): Promise<Producto[]> {
    const condiciones: string[] = ['p.id_empresa = $1'];
    const params: unknown[] = [empresaId];
    let idx = 2;

    if (filtros.estado && filtros.estado !== 'TODOS') {
      condiciones.push(`p.estado = $${idx++}`);
      params.push(filtros.estado);
    }
    if (filtros.tipo) {
      condiciones.push(`p.tipo = $${idx++}`);
      params.push(filtros.tipo);
    }
    if (filtros.id_grupo !== undefined) {
      condiciones.push(`p.id_grupo = $${idx++}`);
      params.push(filtros.id_grupo);
    }
    if (filtros.id_iva !== undefined) {
      condiciones.push(`p.id_iva = $${idx++}`);
      params.push(filtros.id_iva);
    }
    if (filtros.search) {
      condiciones.push(`(p.descripcion ILIKE $${idx} OR p.codigo ILIKE $${idx})`);
      params.push(`%${filtros.search}%`);
      idx++;
    }

    const where = condiciones.join(' AND ');
    const result = await pool.query(
      `SELECT p.id, p.id_empresa, p.id_grupo, g.nombre AS grupo_nombre,
              p.id_iva, iv.codigo AS iva_codigo, iv.nombre AS iva_nombre,
              p.tipo, p.codigo, p.descripcion, p.unidad_medida,
              p.precio, p.porcentaje_iva, p.tiene_ice, p.porcentaje_ice, p.codigo_ice,
              p.tiene_irbpnr, p.valor_unitario_irbpnr,
              p.estado, p.created_at
       FROM productos p
       LEFT JOIN grupos_productos g  ON g.id  = p.id_grupo AND g.id_empresa  = p.id_empresa
       LEFT JOIN codigos_iva     iv  ON iv.id = p.id_iva   AND iv.id_empresa = p.id_empresa
       WHERE ${where}
       ORDER BY p.descripcion`,
      params
    );
    return result.rows;
  },

  async findById(id: number): Promise<Producto | null> {
    const cached = await cacheGet<Producto>(key(id));
    if (cached) return cached;

    const result = await pool.query(
      `SELECT p.*, g.nombre AS grupo_nombre,
              iv.codigo AS iva_codigo, iv.nombre AS iva_nombre, iv.porcentaje AS iva_porcentaje
       FROM productos p
       LEFT JOIN grupos_productos g  ON g.id  = p.id_grupo AND g.id_empresa  = p.id_empresa
       LEFT JOIN codigos_iva     iv  ON iv.id = p.id_iva   AND iv.id_empresa = p.id_empresa
       WHERE p.id = $1`,
      [id]
    );
    const producto = result.rows[0] ?? null;
    if (producto) await cacheSet(key(id), producto, TTL.PRODUCTO);
    return producto;
  },

  async findByCodigo(empresaId: number, codigo: string): Promise<Producto | null> {
    const result = await pool.query<Producto>(
      'SELECT * FROM productos WHERE id_empresa = $1 AND codigo = $2',
      [empresaId, codigo]
    );
    return result.rows[0] ?? null;
  },

  async create(data: ProductoCreate): Promise<Producto> {
    const result = await pool.query<Producto>(
      `INSERT INTO productos
         (id_empresa, id_grupo, id_iva, tipo, codigo, descripcion,
          unidad_medida, precio, porcentaje_iva, tiene_ice, porcentaje_ice, codigo_ice,
          tiene_irbpnr, valor_unitario_irbpnr)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [
        data.id_empresa,
        data.id_grupo ?? null,
        data.id_iva,
        data.tipo ?? 'PRODUCTO',
        data.codigo,
        data.descripcion,
        data.unidad_medida ?? 'UNIDAD',
        data.precio,
        data.porcentaje_iva,
        data.tiene_ice ?? false,
        data.porcentaje_ice ?? 0,
        data.codigo_ice ?? null,
        data.tiene_irbpnr ?? false,
        data.valor_unitario_irbpnr ?? 0,
      ]
    );
    return result.rows[0]!;
  },

  async update(id: number, data: ProductoUpdate): Promise<Producto | null> {
    const campos = Object.keys(data) as (keyof ProductoUpdate)[];
    if (campos.length === 0) return null;

    const sets = campos.map((campo, i) => `${campo} = $${i + 1}`).join(', ');
    const valores = campos.map((campo) => data[campo]);

    const result = await pool.query<Producto>(
      `UPDATE productos SET ${sets} WHERE id = $${campos.length + 1} RETURNING *`,
      [...valores, id]
    );
    await cacheDel(key(id));
    return result.rows[0] ?? null;
  },

  async cambiarEstado(id: number, estado: string): Promise<Producto | null> {
    const result = await pool.query<Producto>(
      'UPDATE productos SET estado = $1 WHERE id = $2 RETURNING *',
      [estado, id]
    );
    await cacheDel(key(id));
    return result.rows[0] ?? null;
  },
};
