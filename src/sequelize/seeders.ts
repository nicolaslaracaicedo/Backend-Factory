import { Ambiente, Rol, TipoIdentificacion, TipoDocumento, TipoRetencion } from './index';

export async function runSeeders(): Promise<void> {
  await Promise.all([
    // Ambientes
    Ambiente.findOrCreate({ where: { id: 1 }, defaults: { id: 1, nombre: 'PRUEBAS' } }),
    Ambiente.findOrCreate({ where: { id: 2 }, defaults: { id: 2, nombre: 'PRODUCCION' } }),

    // Tipos de identificación
    TipoIdentificacion.findOrCreate({ where: { id: '04' }, defaults: { id: '04', nombre: 'RUC' } }),
    TipoIdentificacion.findOrCreate({ where: { id: '05' }, defaults: { id: '05', nombre: 'Cédula' } }),
    TipoIdentificacion.findOrCreate({ where: { id: '06' }, defaults: { id: '06', nombre: 'Pasaporte' } }),
    TipoIdentificacion.findOrCreate({ where: { id: '07' }, defaults: { id: '07', nombre: 'Consumidor Final' } }),

    // Tipos de documento
    TipoDocumento.findOrCreate({ where: { codigo: '01' }, defaults: { codigo: '01', nombre: 'Factura' } }),
    TipoDocumento.findOrCreate({ where: { codigo: '02' }, defaults: { codigo: '02', nombre: 'Nota de Venta' } }),
    TipoDocumento.findOrCreate({ where: { codigo: '03' }, defaults: { codigo: '03', nombre: 'Liquidación de Compra' } }),
    TipoDocumento.findOrCreate({ where: { codigo: '04' }, defaults: { codigo: '04', nombre: 'Nota de Crédito' } }),
    TipoDocumento.findOrCreate({ where: { codigo: '05' }, defaults: { codigo: '05', nombre: 'Nota de Débito' } }),
    TipoDocumento.findOrCreate({ where: { codigo: '06' }, defaults: { codigo: '06', nombre: 'Guía de Remisión' } }),
    TipoDocumento.findOrCreate({ where: { codigo: '07' }, defaults: { codigo: '07', nombre: 'Comprobante de Retención' } }),

    // Tipos de retención
    TipoRetencion.findOrCreate({ where: { codigo: '1' }, defaults: { codigo: '1', nombre: 'Retención en la Fuente (Renta)' } }),
    TipoRetencion.findOrCreate({ where: { codigo: '2' }, defaults: { codigo: '2', nombre: 'Retención IVA' } }),
    TipoRetencion.findOrCreate({ where: { codigo: '6' }, defaults: { codigo: '6', nombre: 'Retención ISD' } }),

    // Roles
    Rol.findOrCreate({ where: { nombre: 'ADMIN' },      defaults: { nombre: 'ADMIN',      descripcion: 'Administrador de la empresa. Configura usuarios, firma y establecimientos' } }),
    Rol.findOrCreate({ where: { nombre: 'FACTURADOR' }, defaults: { nombre: 'FACTURADOR', descripcion: 'Crea, revisa y envía documentos electrónicos al SRI' } }),
    Rol.findOrCreate({ where: { nombre: 'CONTADOR' },   defaults: { nombre: 'CONTADOR',   descripcion: 'Solo lectura: reportes y descarga de XMLs' } }),
  ]);

  console.log('Seeders ejecutados correctamente.');
}
