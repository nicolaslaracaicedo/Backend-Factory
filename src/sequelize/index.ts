import sequelize from '../config/sequelize';

import { Ambiente }                  from './models/Ambiente';
import { Empresa }                   from './models/Empresa';
import { Rol }                       from './models/Rol';
import { TipoIdentificacion }        from './models/TipoIdentificacion';
import { TipoDocumento }             from './models/TipoDocumento';
import { TipoRetencion }             from './models/TipoRetencion';
import { FirmaElectronica }          from './models/FirmaElectronica';
import { Establecimiento }           from './models/Establecimiento';
import { PuntoEmision }              from './models/PuntoEmision';
import { Secuencial }                from './models/Secuencial';
import { Usuario }                   from './models/Usuario';
import { CodigoRecuperacion }        from './models/CodigoRecuperacion';
import { TokenVerificacionEmail }    from './models/TokenVerificacionEmail';
import { Cliente }                   from './models/Cliente';
import { Proveedor }                 from './models/Proveedor';
import { GrupoProducto }             from './models/GrupoProducto';
import { CodigoIva }                 from './models/CodigoIva';
import { Producto }                  from './models/Producto';
import { Factura }                   from './models/Factura';
import { DetalleFactura }            from './models/DetalleFactura';
import { DatoAdicionalFactura }      from './models/DatoAdicionalFactura';
import { NotaCredito }               from './models/NotaCredito';
import { DetalleNotaCredito }        from './models/DetalleNotaCredito';
import { NotaDebito }                from './models/NotaDebito';
import { DetalleNotaDebito }         from './models/DetalleNotaDebito';
import { Retencion }                 from './models/Retencion';
import { DetalleRetencion }          from './models/DetalleRetencion';
import { GuiaRemision }              from './models/GuiaRemision';
import { DetalleGuiaRemision }       from './models/DetalleGuiaRemision';
import { LiquidacionCompra }         from './models/LiquidacionCompra';
import { DetalleLiquidacionCompra }  from './models/DetalleLiquidacionCompra';
import { NotaVenta }                 from './models/NotaVenta';
import { DetalleNotaVenta }          from './models/DetalleNotaVenta';
import { Proforma }                  from './models/Proforma';
import { DetalleProforma }           from './models/DetalleProforma';
import { Recurrente }                from './models/Recurrente';
import { DetalleRecurrente }         from './models/DetalleRecurrente';
import { LogSri }                    from './models/LogSri';

// ── Empresa ──────────────────────────────────────────
Empresa.hasMany(Establecimiento,       { foreignKey: 'id_empresa', as: 'establecimientos' });
Empresa.hasMany(PuntoEmision,          { foreignKey: 'id_empresa', as: 'puntos_emision' });
Empresa.hasMany(Usuario,               { foreignKey: 'id_empresa', as: 'usuarios' });
Empresa.hasMany(FirmaElectronica,      { foreignKey: 'id_empresa', as: 'firmas' });
Empresa.hasMany(Secuencial,            { foreignKey: 'id_empresa', as: 'secuenciales' });
Empresa.hasMany(Cliente,               { foreignKey: 'id_empresa', as: 'clientes' });
Empresa.hasMany(Proveedor,             { foreignKey: 'id_empresa', as: 'proveedores' });
Empresa.hasMany(GrupoProducto,         { foreignKey: 'id_empresa', as: 'grupos_productos' });
Empresa.hasMany(CodigoIva,             { foreignKey: 'id_empresa', as: 'codigos_iva' });
Empresa.hasMany(Producto,              { foreignKey: 'id_empresa', as: 'productos' });
Empresa.hasMany(Factura,               { foreignKey: 'id_empresa', as: 'facturas' });
Empresa.hasMany(NotaCredito,           { foreignKey: 'id_empresa', as: 'notas_credito' });
Empresa.hasMany(NotaDebito,            { foreignKey: 'id_empresa', as: 'notas_debito' });
Empresa.hasMany(Retencion,             { foreignKey: 'id_empresa', as: 'retenciones' });
Empresa.hasMany(GuiaRemision,          { foreignKey: 'id_empresa', as: 'guias_remision' });
Empresa.hasMany(LiquidacionCompra,     { foreignKey: 'id_empresa', as: 'liquidaciones_compra' });
Empresa.hasMany(NotaVenta,             { foreignKey: 'id_empresa', as: 'notas_venta' });
Empresa.hasMany(Proforma,              { foreignKey: 'id_empresa', as: 'proformas' });
Empresa.hasMany(Recurrente,            { foreignKey: 'id_empresa', as: 'recurrentes' });
Empresa.hasMany(LogSri,                { foreignKey: 'id_empresa', as: 'logs_sri' });
Empresa.belongsTo(Ambiente,            { foreignKey: 'ambiente',   as: 'ambiente_ref' });

// ── Establecimiento / PuntoEmision ───────────────────
Establecimiento.belongsTo(Empresa,     { foreignKey: 'id_empresa',         as: 'empresa' });
Establecimiento.hasMany(PuntoEmision,  { foreignKey: 'id_establecimiento',  as: 'puntos_emision' });

PuntoEmision.belongsTo(Empresa,        { foreignKey: 'id_empresa',         as: 'empresa' });
PuntoEmision.belongsTo(Establecimiento,{ foreignKey: 'id_establecimiento',  as: 'establecimiento' });
PuntoEmision.hasMany(Secuencial,       { foreignKey: 'id_punto_emision',    as: 'secuenciales' });

// ── Secuencial ────────────────────────────────────────
Secuencial.belongsTo(Empresa,          { foreignKey: 'id_empresa',        as: 'empresa' });
Secuencial.belongsTo(PuntoEmision,     { foreignKey: 'id_punto_emision',  as: 'punto_emision' });
Secuencial.belongsTo(TipoDocumento,    { foreignKey: 'tipo_documento',    as: 'tipo_documento_ref' });
Secuencial.belongsTo(Ambiente,         { foreignKey: 'ambiente',          as: 'ambiente_ref' });

// ── Usuario ───────────────────────────────────────────
Usuario.belongsTo(Empresa,             { foreignKey: 'id_empresa',               as: 'empresa' });
Usuario.belongsTo(Rol,                 { foreignKey: 'id_rol',                   as: 'rol' });
Usuario.belongsTo(TipoIdentificacion,  { foreignKey: 'tipo_identificacion',      as: 'tipo_id_ref' });
Usuario.belongsTo(PuntoEmision,        { foreignKey: 'id_punto_emision_default', as: 'punto_emision_default' });
Usuario.hasMany(CodigoRecuperacion,    { foreignKey: 'id_usuario',               as: 'codigos_recuperacion' });
Usuario.hasMany(TokenVerificacionEmail,{ foreignKey: 'id_usuario',               as: 'tokens_verificacion' });

CodigoRecuperacion.belongsTo(Usuario,     { foreignKey: 'id_usuario', as: 'usuario' });
TokenVerificacionEmail.belongsTo(Usuario, { foreignKey: 'id_usuario', as: 'usuario' });

// ── Firma ─────────────────────────────────────────────
FirmaElectronica.belongsTo(Empresa,   { foreignKey: 'id_empresa', as: 'empresa' });

// ── Cliente / Proveedor ───────────────────────────────
Cliente.belongsTo(Empresa,            { foreignKey: 'id_empresa',         as: 'empresa' });
Cliente.belongsTo(TipoIdentificacion, { foreignKey: 'tipo_identificacion',as: 'tipo_id_ref' });
Proveedor.belongsTo(Empresa,          { foreignKey: 'id_empresa',         as: 'empresa' });
Proveedor.belongsTo(TipoIdentificacion,{ foreignKey: 'tipo_identificacion',as: 'tipo_id_ref' });

// ── GrupoProducto / CodigoIva / Producto ─────────────
GrupoProducto.belongsTo(Empresa,      { foreignKey: 'id_empresa', as: 'empresa' });
GrupoProducto.hasMany(Producto,       { foreignKey: 'id_grupo',   as: 'productos' });

CodigoIva.belongsTo(Empresa,          { foreignKey: 'id_empresa', as: 'empresa' });
CodigoIva.hasMany(Producto,           { foreignKey: 'id_iva',     as: 'productos' });

Producto.belongsTo(Empresa,           { foreignKey: 'id_empresa', as: 'empresa' });
Producto.belongsTo(GrupoProducto,     { foreignKey: 'id_grupo',   as: 'grupo' });
Producto.belongsTo(CodigoIva,         { foreignKey: 'id_iva',     as: 'codigo_iva_ref' });

// ── Factura ───────────────────────────────────────────
Factura.belongsTo(Empresa,            { foreignKey: 'id_empresa',       as: 'empresa' });
Factura.belongsTo(Usuario,            { foreignKey: 'id_usuario',       as: 'usuario' });
Factura.belongsTo(Cliente,            { foreignKey: 'id_cliente',       as: 'cliente' });
Factura.belongsTo(PuntoEmision,       { foreignKey: 'id_punto_emision', as: 'punto_emision' });
Factura.belongsTo(Ambiente,           { foreignKey: 'id_ambiente',      as: 'ambiente_ref' });
Factura.hasMany(DetalleFactura,       { foreignKey: 'id_factura',       as: 'detalle', onDelete: 'CASCADE' });
Factura.hasMany(DatoAdicionalFactura, { foreignKey: 'id_factura',       as: 'datos_adicionales', onDelete: 'CASCADE' });

DetalleFactura.belongsTo(Factura,     { foreignKey: 'id_factura',   as: 'factura' });
DetalleFactura.belongsTo(Producto,    { foreignKey: 'id_producto',  as: 'producto' });
DatoAdicionalFactura.belongsTo(Factura,{ foreignKey: 'id_factura',  as: 'factura' });

// ── NotaCredito ───────────────────────────────────────
NotaCredito.belongsTo(Empresa,        { foreignKey: 'id_empresa',       as: 'empresa' });
NotaCredito.belongsTo(Usuario,        { foreignKey: 'id_usuario',       as: 'usuario' });
NotaCredito.belongsTo(Factura,        { foreignKey: 'id_factura_ref',   as: 'factura_ref' });
NotaCredito.belongsTo(PuntoEmision,   { foreignKey: 'id_punto_emision', as: 'punto_emision' });
NotaCredito.belongsTo(Cliente,        { foreignKey: 'id_cliente',       as: 'cliente' });
NotaCredito.hasMany(DetalleNotaCredito,{ foreignKey: 'id_nota_credito', as: 'detalle', onDelete: 'CASCADE' });

DetalleNotaCredito.belongsTo(NotaCredito,{ foreignKey: 'id_nota_credito', as: 'nota_credito' });
DetalleNotaCredito.belongsTo(Producto,   { foreignKey: 'id_producto',     as: 'producto' });

// ── NotaDebito ────────────────────────────────────────
NotaDebito.belongsTo(Empresa,         { foreignKey: 'id_empresa',       as: 'empresa' });
NotaDebito.belongsTo(Usuario,         { foreignKey: 'id_usuario',       as: 'usuario' });
NotaDebito.belongsTo(Factura,         { foreignKey: 'id_factura_ref',   as: 'factura_ref' });
NotaDebito.belongsTo(PuntoEmision,    { foreignKey: 'id_punto_emision', as: 'punto_emision' });
NotaDebito.belongsTo(Cliente,         { foreignKey: 'id_cliente',       as: 'cliente' });
NotaDebito.hasMany(DetalleNotaDebito, { foreignKey: 'id_nota_debito',   as: 'detalle', onDelete: 'CASCADE' });

DetalleNotaDebito.belongsTo(NotaDebito,{ foreignKey: 'id_nota_debito', as: 'nota_debito' });

// ── Retencion ─────────────────────────────────────────
Retencion.belongsTo(Empresa,          { foreignKey: 'id_empresa',       as: 'empresa' });
Retencion.belongsTo(Usuario,          { foreignKey: 'id_usuario',       as: 'usuario' });
Retencion.belongsTo(Factura,          { foreignKey: 'id_factura_ref',   as: 'factura_ref' });
Retencion.belongsTo(PuntoEmision,     { foreignKey: 'id_punto_emision', as: 'punto_emision' });
Retencion.belongsTo(Proveedor,        { foreignKey: 'id_proveedor',     as: 'proveedor' });
Retencion.hasMany(DetalleRetencion,   { foreignKey: 'id_retencion',     as: 'detalle', onDelete: 'CASCADE' });

DetalleRetencion.belongsTo(Retencion, { foreignKey: 'id_retencion', as: 'retencion' });

// ── GuiaRemision ──────────────────────────────────────
GuiaRemision.belongsTo(Empresa,       { foreignKey: 'id_empresa',       as: 'empresa' });
GuiaRemision.belongsTo(Usuario,       { foreignKey: 'id_usuario',       as: 'usuario' });
GuiaRemision.belongsTo(PuntoEmision,  { foreignKey: 'id_punto_emision', as: 'punto_emision' });
GuiaRemision.belongsTo(Cliente,       { foreignKey: 'id_cliente',       as: 'cliente' });
GuiaRemision.hasMany(DetalleGuiaRemision,{ foreignKey: 'id_guia',       as: 'detalle', onDelete: 'CASCADE' });

DetalleGuiaRemision.belongsTo(GuiaRemision,{ foreignKey: 'id_guia',    as: 'guia' });
DetalleGuiaRemision.belongsTo(Producto,    { foreignKey: 'id_producto', as: 'producto' });

// ── LiquidacionCompra ─────────────────────────────────
LiquidacionCompra.belongsTo(Empresa,  { foreignKey: 'id_empresa',       as: 'empresa' });
LiquidacionCompra.belongsTo(Usuario,  { foreignKey: 'id_usuario',       as: 'usuario' });
LiquidacionCompra.belongsTo(PuntoEmision,{ foreignKey: 'id_punto_emision', as: 'punto_emision' });
LiquidacionCompra.hasMany(DetalleLiquidacionCompra,{ foreignKey: 'id_liquidacion', as: 'detalle', onDelete: 'CASCADE' });

DetalleLiquidacionCompra.belongsTo(LiquidacionCompra,{ foreignKey: 'id_liquidacion', as: 'liquidacion' });

// ── NotaVenta ─────────────────────────────────────────
NotaVenta.belongsTo(Empresa,          { foreignKey: 'id_empresa',       as: 'empresa' });
NotaVenta.belongsTo(Usuario,          { foreignKey: 'id_usuario',       as: 'usuario' });
NotaVenta.belongsTo(Cliente,          { foreignKey: 'id_cliente',       as: 'cliente' });
NotaVenta.belongsTo(PuntoEmision,     { foreignKey: 'id_punto_emision', as: 'punto_emision' });
NotaVenta.hasMany(DetalleNotaVenta,   { foreignKey: 'id_nota_venta',    as: 'detalle', onDelete: 'CASCADE' });

DetalleNotaVenta.belongsTo(NotaVenta, { foreignKey: 'id_nota_venta', as: 'nota_venta' });
DetalleNotaVenta.belongsTo(Producto,  { foreignKey: 'id_producto',   as: 'producto' });

// ── Proforma ──────────────────────────────────────────
Proforma.belongsTo(Empresa,           { foreignKey: 'id_empresa',       as: 'empresa' });
Proforma.belongsTo(Usuario,           { foreignKey: 'id_usuario',       as: 'usuario' });
Proforma.belongsTo(Cliente,           { foreignKey: 'id_cliente',       as: 'cliente' });
Proforma.belongsTo(PuntoEmision,      { foreignKey: 'id_punto_emision', as: 'punto_emision' });
Proforma.belongsTo(Factura,           { foreignKey: 'id_factura',       as: 'factura' });
Proforma.hasMany(DetalleProforma,     { foreignKey: 'id_proforma',      as: 'detalle', onDelete: 'CASCADE' });

DetalleProforma.belongsTo(Proforma,   { foreignKey: 'id_proforma',  as: 'proforma' });
DetalleProforma.belongsTo(Producto,   { foreignKey: 'id_producto',  as: 'producto' });

// ── Recurrente ────────────────────────────────────────
Recurrente.belongsTo(Empresa,         { foreignKey: 'id_empresa',       as: 'empresa' });
Recurrente.belongsTo(Cliente,         { foreignKey: 'id_cliente',       as: 'cliente' });
Recurrente.belongsTo(Usuario,         { foreignKey: 'id_usuario',       as: 'usuario' });
Recurrente.belongsTo(PuntoEmision,    { foreignKey: 'id_punto_emision', as: 'punto_emision' });
Recurrente.hasMany(DetalleRecurrente, { foreignKey: 'id_recurrente',    as: 'detalle', onDelete: 'CASCADE' });

DetalleRecurrente.belongsTo(Recurrente,{ foreignKey: 'id_recurrente', as: 'recurrente' });
DetalleRecurrente.belongsTo(Producto,  { foreignKey: 'id_producto',   as: 'producto' });

// ── LogSri ────────────────────────────────────────────
LogSri.belongsTo(Empresa,             { foreignKey: 'id_empresa', as: 'empresa' });

export {
  sequelize,
  Ambiente,
  Empresa,
  Rol,
  TipoIdentificacion,
  TipoDocumento,
  TipoRetencion,
  FirmaElectronica,
  Establecimiento,
  PuntoEmision,
  Secuencial,
  Usuario,
  CodigoRecuperacion,
  TokenVerificacionEmail,
  Cliente,
  Proveedor,
  GrupoProducto,
  CodigoIva,
  Producto,
  Factura,
  DetalleFactura,
  DatoAdicionalFactura,
  NotaCredito,
  DetalleNotaCredito,
  NotaDebito,
  DetalleNotaDebito,
  Retencion,
  DetalleRetencion,
  GuiaRemision,
  DetalleGuiaRemision,
  LiquidacionCompra,
  DetalleLiquidacionCompra,
  NotaVenta,
  DetalleNotaVenta,
  Proforma,
  DetalleProforma,
  Recurrente,
  DetalleRecurrente,
  LogSri,
};
