import pool from '../config/database';

export interface EmpresaUpdate {
  razon_social?: string;
  nombre_comercial?: string;
  direccion_matriz?: string;
  telefono?: string;
  email?: string;
  logo_url?: string;
  color_primario?: string;
  color_secundario?: string;
  color_acento?: string;
  fuente_principal?: string;
  contribuyente_especial?: boolean;
  nro_contribuyente_esp?: string;
  obligado_contabilidad?: boolean;
  agente_retencion?: boolean;
  rimpe?: boolean;
  regimen?: string;
  ambiente?: number;
  smtp_host?: string | null;
  smtp_port?: number | null;
  smtp_user?: string | null;
  smtp_password_enc?: string | null;
  smtp_from_name?: string | null;
  smtp_secure?: boolean;
}

export interface Empresa {
  id: number;
  ruc: string;
  razon_social: string | null;
  nombre_comercial: string | null;
  direccion_matriz: string | null;
  telefono: string | null;
  email: string | null;
  logo_url: string | null;
  color_primario: string;
  color_secundario: string;
  color_acento: string;
  fuente_principal: string;
  contribuyente_especial: boolean;
  nro_contribuyente_esp: string | null;
  obligado_contabilidad: boolean;
  agente_retencion: boolean;
  rimpe: boolean;
  regimen: string;
  ambiente: number | null;
  estado: string;
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_user: string | null;
  smtp_password_enc: string | null;
  smtp_from_name: string | null;
  smtp_secure: boolean;
  created_at: Date;
  updated_at: Date;
}

export const EmpresaModel = {
  async findById(id: number): Promise<Empresa | null> {
    const result = await pool.query<Empresa>(
      'SELECT * FROM empresas WHERE id = $1',
      [id]
    );
    return result.rows[0] ?? null;
  },

  async getLogoUrl(id: number): Promise<string | null> {
    const result = await pool.query<{ logo_url: string | null }>(
      'SELECT logo_url FROM empresas WHERE id = $1',
      [id]
    );
    return result.rows[0]?.logo_url ?? null;
  },

  async update(id: number, data: EmpresaUpdate): Promise<Empresa | null> {
    const campos = Object.keys(data) as (keyof EmpresaUpdate)[];
    if (campos.length === 0) return null;

    const sets = campos.map((campo, i) => `${campo} = $${i + 1}`).join(', ');
    const valores = campos.map((campo) => data[campo]);

    const result = await pool.query<Empresa>(
      `UPDATE empresas SET ${sets}, updated_at = NOW() WHERE id = $${campos.length + 1} RETURNING *`,
      [...valores, id]
    );
    return result.rows[0] ?? null;
  },
};
