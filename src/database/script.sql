-- =====================================================
-- SISTEMA DE FACTURACIÓN ELECTRÓNICA - SAAS ECUADOR
-- PostgreSQL | Multitenant por id_empresa
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE ambiente (
  id SMALLINT PRIMARY KEY,
  nombre VARCHAR(20)
);

-- =====================================================
-- 1. EMPRESAS
-- =====================================================
CREATE TABLE empresas (
  id                      SERIAL PRIMARY KEY,
  ruc                     VARCHAR(13) NOT NULL UNIQUE,
  razon_social            VARCHAR(300),
  nombre_comercial        VARCHAR(300),
  direccion_matriz        VARCHAR(500),
  telefono                VARCHAR(20),
  email                   VARCHAR(150),
  logo_url                TEXT,

  color_primario          VARCHAR(7) DEFAULT '#1976D2',
  color_secundario        VARCHAR(7) DEFAULT '#424242',
  color_acento            VARCHAR(7) DEFAULT '#FF6F00',
  fuente_principal        VARCHAR(50) DEFAULT 'Roboto',

  contribuyente_especial  BOOLEAN DEFAULT FALSE,
  nro_contribuyente_esp   VARCHAR(20),
  obligado_contabilidad   BOOLEAN DEFAULT FALSE,
  agente_retencion        BOOLEAN DEFAULT FALSE,
  rimpe                   BOOLEAN DEFAULT FALSE,

  regimen                 VARCHAR(20) DEFAULT 'GENERAL',
  ambiente                SMALLINT REFERENCES ambiente(id),
  estado                  VARCHAR(20) DEFAULT 'ACTIVO',

  smtp_host               VARCHAR(255),
  smtp_port               INTEGER DEFAULT 587,
  smtp_user               VARCHAR(255),
  smtp_password_enc       TEXT,
  smtp_from_name          VARCHAR(255),
  smtp_secure             BOOLEAN DEFAULT FALSE,

  created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 2. ROLES
-- =====================================================
CREATE TABLE roles (
  id          SERIAL PRIMARY KEY,
  nombre      VARCHAR(50) NOT NULL UNIQUE,
  descripcion VARCHAR(200),
  activo      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 3. TIPOS DE IDENTIFICACIÓN
-- =====================================================
CREATE TABLE tipos_identificacion (
  id     VARCHAR(2) PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL
);  

-- =====================================================
-- 4. USUARIOS
-- =====================================================
CREATE TABLE usuarios (
  id                        SERIAL PRIMARY KEY,
  id_empresa                INT NOT NULL REFERENCES empresas(id),
  id_rol                    INT NOT NULL REFERENCES roles(id),
  tipo_identificacion       VARCHAR(2) DEFAULT '05' REFERENCES tipos_identificacion(id),
  identificacion            VARCHAR(13),
  nombre                    VARCHAR(100) NOT NULL,
  apellido                  VARCHAR(100) NOT NULL,
  telefono                  VARCHAR(20),
  direccion                 VARCHAR(500),
  email                     VARCHAR(150) NOT NULL,
  password                  TEXT NOT NULL,
  estado                    VARCHAR(20) DEFAULT 'ACTIVO',
  ultimo_login              TIMESTAMP,
  id_punto_emision_default  INT REFERENCES puntos_emision(id),
  created_at                TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at                TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(id_empresa, email)
);

-- =====================================================
-- 5. FIRMA ELECTRÓNICA
-- =====================================================
CREATE TABLE firmas_electronicas (
  id                SERIAL PRIMARY KEY,
  id_empresa        INT NOT NULL REFERENCES empresas(id),
  nombre            VARCHAR(200),
  archivo_p12       TEXT NOT NULL,
  password          TEXT NOT NULL,
  fecha_vencimiento DATE NOT NULL,
  activo            BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 6. ESTABLECIMIENTOS
-- =====================================================
CREATE TABLE establecimientos (
  id          SERIAL PRIMARY KEY,
  id_empresa  INT NOT NULL REFERENCES empresas(id),
  codigo      VARCHAR(3) NOT NULL,
  nombre      VARCHAR(200) NOT NULL,
  direccion   VARCHAR(500),
  es_matriz   BOOLEAN DEFAULT FALSE,
  estado      VARCHAR(20) DEFAULT 'ACTIVO',
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(id_empresa, codigo)
);

-- =====================================================
-- 7. PUNTOS DE EMISIÓN
-- =====================================================
CREATE TABLE puntos_emision (
  id                 SERIAL PRIMARY KEY,
  id_empresa         INT NOT NULL REFERENCES empresas(id),
  id_establecimiento INT NOT NULL REFERENCES establecimientos(id),
  codigo             VARCHAR(3) NOT NULL,
  descripcion        VARCHAR(200),
  estado             VARCHAR(20) DEFAULT 'ACTIVO',
  created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(id_establecimiento, codigo)
);

-- =====================================================
-- 8. TIPOS DE DOCUMENTO
-- =====================================================
CREATE TABLE tipos_documento (
  codigo VARCHAR(5)  PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL
);

-- =====================================================
-- 9. SECUENCIALES
-- =====================================================
CREATE TABLE secuenciales (
  id                 SERIAL PRIMARY KEY,
  id_empresa         INT NOT NULL REFERENCES empresas(id),
  id_punto_emision   INT NOT NULL REFERENCES puntos_emision(id),
  tipo_documento     VARCHAR(5) NOT NULL REFERENCES tipos_documento(codigo),
  ambiente           SMALLINT NOT NULL REFERENCES ambiente(id),
  secuencial_actual  BIGINT NOT NULL DEFAULT 0,
  estado             VARCHAR(20) DEFAULT 'ACTIVO',
  updated_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE (id_punto_emision, tipo_documento, ambiente)
);

-- =====================================================
-- 9. CLIENTES
-- =====================================================
CREATE TABLE clientes (
  id                  SERIAL PRIMARY KEY,
  id_empresa          INT NOT NULL REFERENCES empresas(id),
  tipo_identificacion VARCHAR(2) NOT NULL DEFAULT '05' REFERENCES tipos_identificacion(id),
  identificacion      VARCHAR(20) NOT NULL,
  razon_social        VARCHAR(300) NOT NULL,
  direccion           VARCHAR(500),
  telefono            VARCHAR(20),
  email               VARCHAR(150),
  es_recurrente       BOOLEAN DEFAULT FALSE,
  estado              VARCHAR(20) DEFAULT 'ACTIVO',
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(id_empresa, identificacion)
);

-- =====================================================
-- 10. PROVEEDORES
-- =====================================================
CREATE TABLE proveedores (
  id                  SERIAL PRIMARY KEY,
  id_empresa          INT NOT NULL REFERENCES empresas(id),
  tipo_identificacion VARCHAR(2) NOT NULL DEFAULT '04' REFERENCES tipos_identificacion(id),
  identificacion      VARCHAR(20) NOT NULL,
  razon_social        VARCHAR(300) NOT NULL,
  direccion           VARCHAR(500),
  telefono            VARCHAR(20),
  email               VARCHAR(150),
  estado              VARCHAR(20) DEFAULT 'ACTIVO',
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(id_empresa, identificacion)
);

-- =====================================================
-- 11. GRUPOS DE PRODUCTOS
-- =====================================================
CREATE TABLE grupos_productos (
  id          SERIAL PRIMARY KEY,
  id_empresa  INT NOT NULL REFERENCES empresas(id),
  nombre      VARCHAR(200) NOT NULL,
  descripcion VARCHAR(300),
  estado      VARCHAR(20) DEFAULT 'ACTIVO',
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(id_empresa, nombre),
  UNIQUE(id, id_empresa)
);

-- =====================================================
-- 12. CÓDIGOS IVA (configurable por empresa)
-- =====================================================
CREATE TABLE codigos_iva (
  id          SERIAL PRIMARY KEY,
  id_empresa  INT NOT NULL REFERENCES empresas(id),
  codigo      VARCHAR(2) NOT NULL,
  nombre      VARCHAR(100) NOT NULL,
  porcentaje  NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (porcentaje >= 0),
  activo      BOOLEAN DEFAULT TRUE,

  UNIQUE(id_empresa, codigo),
  UNIQUE(id, id_empresa)
);

-- =====================================================
-- 13. PRODUCTOS
-- =====================================================
CREATE TABLE productos (
  id              SERIAL PRIMARY KEY,
  id_empresa      INT NOT NULL REFERENCES empresas(id),
  id_grupo        INT,
  id_iva          INT NOT NULL,
  tipo            VARCHAR(20) DEFAULT 'PRODUCTO', -- PRODUCTO | SERVICIO
  codigo          VARCHAR(50) NOT NULL,
  codigo_ice      VARCHAR(10) DEFAULT NULL,
  descripcion     VARCHAR(500) NOT NULL,
  unidad_medida   VARCHAR(30) DEFAULT 'UNIDAD',
  precio          NUMERIC(12,4) NOT NULL DEFAULT 0 CHECK (precio >= 0),
  porcentaje_iva  NUMERIC(5,2) NOT NULL,
  tiene_ice       BOOLEAN DEFAULT FALSE,
tiene_irbpnr          BOOLEAN        NOT NULL DEFAULT FALSE,
valor_unitario_irbpnr NUMERIC(12,4)  NOT NULL DEFAULT 0,
  porcentaje_ice  NUMERIC(5,2) NOT NULL DEFAULT 0,
  estado          VARCHAR(20) DEFAULT 'ACTIVO',
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(id_empresa, codigo),

  FOREIGN KEY (id_grupo, id_empresa)
    REFERENCES grupos_productos(id, id_empresa),

  FOREIGN KEY (id_iva, id_empresa)
    REFERENCES codigos_iva(id, id_empresa)
);
ALTER TABLE productos ADD COLUMN codigo_ice VARCHAR(10) DEFAULT NULL;

-- =====================================================
-- 13. FACTURAS
-- =====================================================
CREATE TABLE facturas (
  id                     SERIAL PRIMARY KEY,
  id_empresa             INT NOT NULL REFERENCES empresas(id),
  id_usuario             INT NOT NULL REFERENCES usuarios(id),
  id_cliente             INT REFERENCES clientes(id),
  id_punto_emision       INT NOT NULL REFERENCES puntos_emision(id),
  id_ambiente            SMALLINT NOT NULL REFERENCES ambiente(id),
  cod_establecimiento    VARCHAR(3) NOT NULL,
  cod_punto_emision      VARCHAR(3) NOT NULL,
  secuencial             VARCHAR(9) NOT NULL,
  numero_comprobante     VARCHAR(17),
  clave_acceso           VARCHAR(49) UNIQUE,
  numero_autorizacion    VARCHAR(49),
  estado                 VARCHAR(20) NOT NULL DEFAULT 'BORRADOR',
  fecha_emision          DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_autorizacion     TIMESTAMP,
  cli_identificacion     VARCHAR(20),
  cli_razon_social       VARCHAR(300),
  cli_direccion          VARCHAR(500),
  cli_telefono           VARCHAR(20),
  cli_email              VARCHAR(150),
  forma_pago             VARCHAR(5) NOT NULL DEFAULT '01',
  tipo_pago              VARCHAR(10) NOT NULL DEFAULT 'CONTADO',
  dias_plazo             INT DEFAULT 0,
  regimen                VARCHAR(20) DEFAULT 'GENERAL',
  subtotal_sin_impuesto  NUMERIC(12,4) DEFAULT 0,
  subtotal_0             NUMERIC(12,4) DEFAULT 0,
  subtotal_iva           NUMERIC(12,4) DEFAULT 0,
  subtotal_no_objeto_iva NUMERIC(12,4) DEFAULT 0,
  subtotal_exento_iva    NUMERIC(12,4) DEFAULT 0,
  descuento_total        NUMERIC(12,4) DEFAULT 0,
  valor_ice              NUMERIC(12,4) DEFAULT 0,
  valor_irbpnr           NUMERIC(12,4) DEFAULT 0,
  iva_porcentaje         NUMERIC(5,2) DEFAULT 15.00,
  iva_total              NUMERIC(12,4) DEFAULT 0,
  total                  NUMERIC(12,4) DEFAULT 0,
  xml_generado           TEXT,
  xml_autorizado         TEXT,
  pdf_url                TEXT,
  respuesta_sri          TEXT,
  motivo_rechazo         TEXT,
  observacion            TEXT,
  monto_recibido         NUMERIC(12,2) DEFAULT NULL,
  vuelto                 NUMERIC(12,2) DEFAULT NULL,
  created_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(id_empresa, cod_establecimiento, cod_punto_emision, secuencial)
);

-- =====================================================
-- 14. DETALLE DE FACTURAS
-- =====================================================
CREATE TABLE detalle_facturas (
  id              SERIAL PRIMARY KEY,
  id_factura      INT NOT NULL REFERENCES facturas(id) ON DELETE CASCADE,
  id_empresa      INT NOT NULL REFERENCES empresas(id),
  id_producto     INT REFERENCES productos(id),
  codigo          VARCHAR(50) NOT NULL,
  descripcion     VARCHAR(500) NOT NULL,
  unidad_medida   VARCHAR(30) DEFAULT 'UNIDAD',
  cantidad        NUMERIC(12,4) NOT NULL DEFAULT 1,
  precio_unitario NUMERIC(12,4) NOT NULL DEFAULT 0,
  descuento       NUMERIC(12,4) DEFAULT 0,
  subtotal        NUMERIC(12,4) DEFAULT 0,
  codigo_iva      VARCHAR(2) NOT NULL DEFAULT '4',
  codigo_ice      VARCHAR(10) DEFAULT NULL,
  porcentaje_iva  NUMERIC(5,2) DEFAULT 15.00,
  valor_iva       NUMERIC(12,4) DEFAULT 0,
  valor_ice       NUMERIC(12,4) DEFAULT 0,
  valor_irbpnr    NUMERIC(12,4) DEFAULT 0,
  porcentaje_ice  NUMERIC(5,2) NOT NULL DEFAULT 0,
  total           NUMERIC(12,4) DEFAULT 0,
  orden           INT DEFAULT 1
);
--ALTER TABLE detalle_facturas ADD COLUMN codigo_ice VARCHAR(10) DEFAULT NULL;

-- =====================================================
-- 15. DATOS ADICIONALES DE FACTURA
-- =====================================================
CREATE TABLE datos_adicionales_factura (
  id         SERIAL PRIMARY KEY,
  id_factura INT NOT NULL REFERENCES facturas(id) ON DELETE CASCADE,
  id_empresa INT NOT NULL REFERENCES empresas(id),
  nombre     VARCHAR(100) NOT NULL,
  valor      VARCHAR(300) NOT NULL,
  orden      INT DEFAULT 1
);

-- =====================================================
-- 16. NOTAS DE CRÉDITO
-- =====================================================
CREATE TABLE notas_credito (
  id                       SERIAL PRIMARY KEY,
  id_empresa               INT NOT NULL REFERENCES empresas(id),
  id_usuario               INT NOT NULL REFERENCES usuarios(id),
  id_factura_ref           INT REFERENCES facturas(id),
  id_punto_emision         INT NOT NULL REFERENCES puntos_emision(id),
  id_ambiente              SMALLINT NOT NULL REFERENCES ambiente(id),
  factura_ref_numero       VARCHAR(17),
  factura_ref_fecha        DATE,
  factura_ref_autorizacion VARCHAR(49),
  cod_establecimiento      VARCHAR(3) NOT NULL,
  cod_punto_emision        VARCHAR(3) NOT NULL,
  secuencial               VARCHAR(9) NOT NULL,
  numero_comprobante       VARCHAR(17),
  clave_acceso             VARCHAR(49) UNIQUE,
  numero_autorizacion      VARCHAR(49),
  estado                   VARCHAR(20) DEFAULT 'BORRADOR',
  fecha_emision            DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_autorizacion       TIMESTAMP,
  id_cliente               INT REFERENCES clientes(id),
  cli_identificacion       VARCHAR(20),
  cli_razon_social         VARCHAR(300),
  motivo                   VARCHAR(300) NOT NULL,
  subtotal_sin_impuesto    NUMERIC(12,4) DEFAULT 0,
  subtotal_0               NUMERIC(12,4) DEFAULT 0,
  subtotal_iva             NUMERIC(12,4) DEFAULT 0,
  descuento_total          NUMERIC(12,4) DEFAULT 0,
  iva_total                NUMERIC(12,4) DEFAULT 0,
  total                    NUMERIC(12,4) DEFAULT 0,
  xml_generado             TEXT,
  xml_autorizado           TEXT,
  pdf_url                  TEXT,
  respuesta_sri            TEXT,
  motivo_rechazo           TEXT,
  created_at               TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at               TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(id_empresa, cod_establecimiento, cod_punto_emision, secuencial)
);

-- =====================================================
-- 17. DETALLE DE NOTAS DE CRÉDITO
-- =====================================================
CREATE TABLE detalle_notas_credito (
  id              SERIAL PRIMARY KEY,
  id_nota_credito INT NOT NULL REFERENCES notas_credito(id) ON DELETE CASCADE,
  id_empresa      INT NOT NULL REFERENCES empresas(id),
  id_producto     INT REFERENCES productos(id),
porcentaje_ice  NUMERIC(5,2)  NOT NULL DEFAULT 0,
valor_ice       NUMERIC(12,4) NOT NULL DEFAULT 0,
codigo_ice      VARCHAR(10)   DEFAULT NULL,
valor_irbpnr    NUMERIC(12,4) NOT NULL DEFAULT 0,
  codigo          VARCHAR(50) NOT NULL,
  descripcion     VARCHAR(500) NOT NULL,
  unidad_medida   VARCHAR(30) DEFAULT 'UNIDAD',
  cantidad        NUMERIC(12,4) DEFAULT 1,
  precio_unitario NUMERIC(12,4) DEFAULT 0,
  descuento       NUMERIC(12,4) DEFAULT 0,
  subtotal        NUMERIC(12,4) DEFAULT 0,
  codigo_iva      VARCHAR(2) DEFAULT '4',
  porcentaje_iva  NUMERIC(5,2) DEFAULT 15.00,
  valor_iva       NUMERIC(12,4) DEFAULT 0,
  total           NUMERIC(12,4) DEFAULT 0,
  orden           INT DEFAULT 1
);

-- =====================================================
-- 18. NOTAS DE DÉBITO
-- =====================================================
CREATE TABLE notas_debito (
  id                       SERIAL PRIMARY KEY,
  id_empresa               INT NOT NULL REFERENCES empresas(id),
  id_usuario               INT NOT NULL REFERENCES usuarios(id),
  id_factura_ref           INT REFERENCES facturas(id),
  id_punto_emision         INT NOT NULL REFERENCES puntos_emision(id),
  id_ambiente              SMALLINT NOT NULL REFERENCES ambiente(id),
  factura_ref_numero       VARCHAR(17),
  factura_ref_fecha        DATE,
  factura_ref_autorizacion VARCHAR(49),
  cod_establecimiento      VARCHAR(3) NOT NULL,
  cod_punto_emision        VARCHAR(3) NOT NULL,
  secuencial               VARCHAR(9) NOT NULL,
  numero_comprobante       VARCHAR(17),
  clave_acceso             VARCHAR(49) UNIQUE,
  numero_autorizacion      VARCHAR(49),
  estado                   VARCHAR(20) DEFAULT 'BORRADOR',
  fecha_emision            DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_autorizacion       TIMESTAMP,
  id_cliente               INT REFERENCES clientes(id),
  cli_identificacion       VARCHAR(20),
  cli_razon_social         VARCHAR(300),
  motivo                   VARCHAR(300) NOT NULL,
  subtotal                 NUMERIC(12,4) DEFAULT 0,
  iva_total                NUMERIC(12,4) DEFAULT 0,
  total                    NUMERIC(12,4) DEFAULT 0,
  xml_generado             TEXT,
  xml_autorizado           TEXT,
  pdf_url                  TEXT,
  respuesta_sri            TEXT,
  motivo_rechazo           TEXT,
  created_at               TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at               TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(id_empresa, cod_establecimiento, cod_punto_emision, secuencial)
);

-- =====================================================
-- 19. DETALLE DE NOTAS DE DÉBITO
-- =====================================================
CREATE TABLE detalle_notas_debito (
  id             SERIAL PRIMARY KEY,
  id_nota_debito INT NOT NULL REFERENCES notas_debito(id) ON DELETE CASCADE,
  id_empresa     INT NOT NULL REFERENCES empresas(id),
  razon          VARCHAR(300) NOT NULL,
  valor          NUMERIC(12,4) DEFAULT 0,
  orden          INT DEFAULT 1
);

-- =====================================================
-- 20. TIPOS DE RETENCIÓN (catálogo fijo SRI)
-- =====================================================
CREATE TABLE tipos_retencion (
  codigo  VARCHAR(2)   PRIMARY KEY,
  nombre  VARCHAR(100) NOT NULL
);

INSERT INTO tipos_retencion (codigo, nombre) VALUES
  ('1', 'Retención en la Fuente (Renta)'),
  ('2', 'Retención IVA'),
  ('6', 'Retención ISD');

-- =====================================================
-- 21. RETENCIONES
-- =====================================================
CREATE TABLE retenciones (
  id                     SERIAL PRIMARY KEY,
  id_empresa             INT NOT NULL REFERENCES empresas(id),
  id_usuario             INT NOT NULL REFERENCES usuarios(id),
  id_factura_ref         INT REFERENCES facturas(id),
  id_punto_emision       INT NOT NULL REFERENCES puntos_emision(id),
  id_ambiente            SMALLINT NOT NULL REFERENCES ambiente(id),
  comprobante_ref_numero VARCHAR(17),
  comprobante_ref_fecha  DATE,
  cod_establecimiento    VARCHAR(3) NOT NULL,
  cod_punto_emision      VARCHAR(3) NOT NULL,
  secuencial             VARCHAR(9) NOT NULL,
  numero_comprobante     VARCHAR(17),
  clave_acceso           VARCHAR(49) UNIQUE,
  numero_autorizacion    VARCHAR(49),
  estado                 VARCHAR(20) DEFAULT 'BORRADOR',
  fecha_emision          DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_autorizacion     TIMESTAMP,
  id_proveedor           INT REFERENCES proveedores(id),
  prov_identificacion    VARCHAR(20),
  prov_razon_social      VARCHAR(300),
  total_retenido         NUMERIC(12,4) DEFAULT 0,
  xml_generado           TEXT,
  xml_autorizado         TEXT,
  pdf_url                TEXT,
  respuesta_sri          TEXT,
  motivo_rechazo         TEXT,
  created_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(id_empresa, cod_establecimiento, cod_punto_emision, secuencial)
);

-- =====================================================
-- 22. DETALLE DE RETENCIONES
-- =====================================================
CREATE TABLE detalle_retenciones (
  id             SERIAL PRIMARY KEY,
  id_retencion   INT NOT NULL REFERENCES retenciones(id) ON DELETE CASCADE,
  id_empresa     INT NOT NULL REFERENCES empresas(id),
  tipo           VARCHAR(10) NOT NULL,
  codigo         VARCHAR(5) NOT NULL,
  descripcion    VARCHAR(300) NOT NULL,
  base_imponible NUMERIC(12,4) DEFAULT 0,
  porcentaje     NUMERIC(5,2) DEFAULT 0,
  valor_retenido NUMERIC(12,4) DEFAULT 0,
  orden          INT DEFAULT 1
);

-- =====================================================
-- 23. GUÍAS DE REMISIÓN
-- =====================================================
CREATE TABLE guias_remision (
  id                         SERIAL PRIMARY KEY,
  id_empresa                 INT NOT NULL REFERENCES empresas(id),
  id_usuario                 INT NOT NULL REFERENCES usuarios(id),
  id_punto_emision           INT NOT NULL REFERENCES puntos_emision(id),
  cod_establecimiento        VARCHAR(3) NOT NULL,
  cod_punto_emision          VARCHAR(3) NOT NULL,
  secuencial                 VARCHAR(9) NOT NULL,
  numero_comprobante         VARCHAR(17),
  clave_acceso               VARCHAR(49) UNIQUE,
  numero_autorizacion        VARCHAR(49),
  estado                     VARCHAR(20) DEFAULT 'BORRADOR',
  fecha_emision              DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_autorizacion         TIMESTAMP,
  ruc_transportista          VARCHAR(13) NOT NULL,
  razon_social_transportista VARCHAR(300) NOT NULL,
  placa                      VARCHAR(10) NOT NULL,
  fecha_ini_transporte       DATE NOT NULL,
  fecha_fin_transporte       DATE NOT NULL,
  ruta                       VARCHAR(300),
  id_cliente                 INT REFERENCES clientes(id),
  dest_identificacion        VARCHAR(20),
  dest_razon_social          VARCHAR(300),
  direccion_destino          VARCHAR(500),
  motivo_traslado            VARCHAR(300),
  xml_generado               TEXT,
  xml_autorizado             TEXT,
  pdf_url                    TEXT,
  respuesta_sri              TEXT,
  motivo_rechazo             TEXT,
  created_at                 TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at                 TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(id_empresa, cod_establecimiento, cod_punto_emision, secuencial)
);



-- =====================================================
-- 23. DETALLE DE GUÍAS DE REMISIÓN
-- =====================================================
CREATE TABLE detalle_guias_remision (
  id          SERIAL PRIMARY KEY,
  id_guia     INT NOT NULL REFERENCES guias_remision(id) ON DELETE CASCADE,
  id_empresa  INT NOT NULL REFERENCES empresas(id),
  id_producto INT REFERENCES productos(id),
  codigo      VARCHAR(50),
  descripcion VARCHAR(500) NOT NULL,
  cantidad    NUMERIC(12,4) DEFAULT 1,
  orden       INT DEFAULT 1
);

-- =====================================================
-- 24. LIQUIDACIONES DE COMPRA
-- =====================================================
CREATE TABLE liquidaciones_compra (
  id                       SERIAL PRIMARY KEY,
  id_empresa               INT NOT NULL REFERENCES empresas(id),
  id_usuario               INT NOT NULL REFERENCES usuarios(id),
  id_punto_emision         INT NOT NULL REFERENCES puntos_emision(id),
  cod_establecimiento      VARCHAR(3) NOT NULL,
  cod_punto_emision        VARCHAR(3) NOT NULL,
  secuencial               VARCHAR(9) NOT NULL,
  numero_comprobante       VARCHAR(17),
  clave_acceso             VARCHAR(49) UNIQUE,
  numero_autorizacion      VARCHAR(49),
  estado                   VARCHAR(20) DEFAULT 'BORRADOR',
  fecha_emision            DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_autorizacion       TIMESTAMP,
  tipo_identificacion_prov VARCHAR(2) DEFAULT '05' REFERENCES tipos_identificacion(id),
  identificacion_prov      VARCHAR(20) NOT NULL,
  razon_social_prov        VARCHAR(300) NOT NULL,
  direccion_prov           VARCHAR(500),
  subtotal_sin_impuesto    NUMERIC(12,4) DEFAULT 0,
  subtotal_0               NUMERIC(12,4) DEFAULT 0,
  subtotal_iva             NUMERIC(12,4) DEFAULT 0,
  descuento_total          NUMERIC(12,4) DEFAULT 0,
  iva_total                NUMERIC(12,4) DEFAULT 0,
  total                    NUMERIC(12,4) DEFAULT 0,
  xml_generado             TEXT,
  xml_autorizado           TEXT,
  pdf_url                  TEXT,
  respuesta_sri            TEXT,
  motivo_rechazo           TEXT,
  created_at               TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at               TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(id_empresa, cod_establecimiento, cod_punto_emision, secuencial)
);

-- =====================================================
-- 25. DETALLE DE LIQUIDACIONES DE COMPRA
-- =====================================================
CREATE TABLE detalle_liquidaciones_compra (
  id              SERIAL PRIMARY KEY,
  id_liquidacion  INT NOT NULL REFERENCES liquidaciones_compra(id) ON DELETE CASCADE,
  id_empresa      INT NOT NULL REFERENCES empresas(id),
porcentaje_ice  NUMERIC(5,2)  NOT NULL DEFAULT 0,
valor_ice       NUMERIC(12,4) NOT NULL DEFAULT 0,
codigo_ice      VARCHAR(10)   DEFAULT NULL,
valor_irbpnr    NUMERIC(12,4) NOT NULL DEFAULT 0,
  codigo          VARCHAR(50) NOT NULL,
  descripcion     VARCHAR(500) NOT NULL,
  unidad_medida   VARCHAR(30) DEFAULT 'UNIDAD',
  cantidad        NUMERIC(12,4) DEFAULT 1,
  precio_unitario NUMERIC(12,4) DEFAULT 0,
  descuento       NUMERIC(12,4) DEFAULT 0,
  subtotal        NUMERIC(12,4) DEFAULT 0,
  codigo_iva      VARCHAR(2) DEFAULT '4',
  porcentaje_iva  NUMERIC(5,2) DEFAULT 15.00,
  valor_iva       NUMERIC(12,4) DEFAULT 0,
  total           NUMERIC(12,4) DEFAULT 0,
  orden           INT DEFAULT 1
);

-- =====================================================
-- 26. NOTAS DE VENTA (RISE)
-- =====================================================
CREATE TABLE notas_venta (
  id                    SERIAL PRIMARY KEY,
  id_empresa            INT NOT NULL REFERENCES empresas(id),
  id_usuario            INT NOT NULL REFERENCES usuarios(id),
  id_cliente            INT REFERENCES clientes(id),
  id_punto_emision      INT NOT NULL REFERENCES puntos_emision(id),
  id_ambiente           SMALLINT NOT NULL REFERENCES ambiente(id),
  cod_establecimiento   VARCHAR(3) NOT NULL,
  cod_punto_emision     VARCHAR(3) NOT NULL,
  secuencial            VARCHAR(9) NOT NULL,
  numero_comprobante    VARCHAR(17),
  clave_acceso          VARCHAR(49) UNIQUE,
  numero_autorizacion   VARCHAR(49),
  estado                VARCHAR(20) NOT NULL DEFAULT 'BORRADOR',
  fecha_emision         DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_autorizacion    TIMESTAMP,
  cli_identificacion    VARCHAR(20),
  cli_razon_social      VARCHAR(300),
  cli_direccion         VARCHAR(500),
  cli_telefono          VARCHAR(20),
  cli_email             VARCHAR(150),
  forma_pago            VARCHAR(5) NOT NULL DEFAULT '01',
  subtotal_sin_impuesto NUMERIC(12,4) DEFAULT 0,
  descuento_total       NUMERIC(12,4) DEFAULT 0,
  total                 NUMERIC(12,4) DEFAULT 0,
  observacion           TEXT,
  xml_generado          TEXT,
  xml_autorizado        TEXT,
  pdf_url               TEXT,
  respuesta_sri         TEXT,
  motivo_rechazo        TEXT,
  created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(id_empresa, cod_establecimiento, cod_punto_emision, secuencial)
);

-- =====================================================
-- 27. DETALLE DE NOTAS DE VENTA
-- =====================================================
CREATE TABLE detalle_notas_venta (
  id              SERIAL PRIMARY KEY,
  id_nota_venta   INT NOT NULL REFERENCES notas_venta(id) ON DELETE CASCADE,
  id_empresa      INT NOT NULL REFERENCES empresas(id),
  id_producto     INT REFERENCES productos(id),
  codigo          VARCHAR(50) NOT NULL,
  descripcion     VARCHAR(500) NOT NULL,
  unidad_medida   VARCHAR(30) DEFAULT 'UNIDAD',
  cantidad        NUMERIC(12,4) NOT NULL DEFAULT 1,
  precio_unitario NUMERIC(12,4) NOT NULL DEFAULT 0,
  descuento       NUMERIC(12,4) DEFAULT 0,
  subtotal        NUMERIC(12,4) DEFAULT 0,
  total           NUMERIC(12,4) DEFAULT 0,
  orden           INT DEFAULT 1
);

-- =====================================================
-- 28. PROFORMAS
-- =====================================================
CREATE TABLE proformas (
  id                    SERIAL PRIMARY KEY,
  id_empresa            INT NOT NULL REFERENCES empresas(id),
  id_usuario            INT NOT NULL REFERENCES usuarios(id),
  id_cliente            INT REFERENCES clientes(id),
  id_punto_emision      INT NOT NULL REFERENCES puntos_emision(id),
  numero                VARCHAR(20) NOT NULL,
  fecha_emision         DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_vencimiento     DATE,
  cli_identificacion    VARCHAR(20),
  cli_razon_social      VARCHAR(300),
  subtotal_sin_impuesto NUMERIC(12,4) DEFAULT 0,
  subtotal_0            NUMERIC(12,4) DEFAULT 0,
  subtotal_iva          NUMERIC(12,4) DEFAULT 0,
  descuento_total       NUMERIC(12,4) DEFAULT 0,
  iva_total             NUMERIC(12,4) DEFAULT 0,
  total                 NUMERIC(12,4) DEFAULT 0,
  estado                VARCHAR(20) DEFAULT 'PENDIENTE',
  id_factura            INT REFERENCES facturas(id),
  observaciones         TEXT,
  pdf_url               TEXT,
  created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(id_empresa, numero)
);

-- =====================================================
-- 27. DETALLE DE PROFORMAS
-- =====================================================
CREATE TABLE detalle_proformas (
  id              SERIAL PRIMARY KEY,
  id_proforma     INT NOT NULL REFERENCES proformas(id) ON DELETE CASCADE,
  id_empresa      INT NOT NULL REFERENCES empresas(id),
  id_producto     INT REFERENCES productos(id),
  porcentaje_ice  NUMERIC(5,2)  NOT NULL DEFAULT 0,
  valor_ice       NUMERIC(12,4) NOT NULL DEFAULT 0,
  codigo_ice      VARCHAR(10)   DEFAULT NULL,
  valor_irbpnr    NUMERIC(12,4) NOT NULL DEFAULT 0,
  codigo          VARCHAR(50) NOT NULL,
  descripcion     VARCHAR(500) NOT NULL,
  unidad_medida   VARCHAR(30) DEFAULT 'UNIDAD',
  cantidad        NUMERIC(12,4) DEFAULT 1,
  precio_unitario NUMERIC(12,4) DEFAULT 0,
  descuento       NUMERIC(12,4) DEFAULT 0,
  subtotal        NUMERIC(12,4) DEFAULT 0,
  codigo_iva      VARCHAR(2) DEFAULT '4',
  porcentaje_iva  NUMERIC(5,2) DEFAULT 15.00,
  valor_iva       NUMERIC(12,4) DEFAULT 0,
  total           NUMERIC(12,4) DEFAULT 0,
  orden           INT DEFAULT 1
);

-- =====================================================
-- 28. CLIENTES RECURRENTES
-- =====================================================
CREATE TABLE recurrentes (
  id                  SERIAL PRIMARY KEY,
  id_empresa          INT NOT NULL REFERENCES empresas(id),
  id_cliente          INT NOT NULL REFERENCES clientes(id),
  id_usuario          INT NOT NULL REFERENCES usuarios(id),
  id_punto_emision    INT NOT NULL REFERENCES puntos_emision(id),
  descripcion         VARCHAR(300) NOT NULL,
  frecuencia          VARCHAR(20) NOT NULL DEFAULT 'MENSUAL',
  dia_emision         INT DEFAULT 1,
  proxima_facturacion DATE NOT NULL,
  ultima_facturacion  DATE,
  forma_pago          VARCHAR(5) DEFAULT '01',
  estado              VARCHAR(20) DEFAULT 'ACTIVO',
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 29. DETALLE DE RECURRENTES
-- =====================================================
CREATE TABLE detalle_recurrentes (
  id              SERIAL PRIMARY KEY,
  id_recurrente   INT NOT NULL REFERENCES recurrentes(id) ON DELETE CASCADE,
  id_empresa      INT NOT NULL REFERENCES empresas(id),
  id_producto     INT REFERENCES productos(id),
  codigo          VARCHAR(50) NOT NULL,
  descripcion     VARCHAR(500) NOT NULL,
  cantidad        NUMERIC(12,4) DEFAULT 1,
  precio_unitario NUMERIC(12,4) DEFAULT 0,
  descuento       NUMERIC(12,4) DEFAULT 0,
  codigo_iva      VARCHAR(2) DEFAULT '4',
  porcentaje_iva  NUMERIC(5,2) DEFAULT 15.00,
  orden           INT DEFAULT 1
);

-- =====================================================
-- 30. LOG SRI
-- =====================================================
CREATE TABLE log_sri (
  id             SERIAL PRIMARY KEY,
  id_empresa     INT NOT NULL REFERENCES empresas(id),
  tipo_documento VARCHAR(5) NOT NULL,
  id_documento   INT NOT NULL,
  clave_acceso   VARCHAR(49),
  accion         VARCHAR(30) NOT NULL,
  ambiente       VARCHAR(10) DEFAULT 'PRUEBAS',
  estado         VARCHAR(20),
  request_xml    TEXT,
  response_xml   TEXT,
  mensaje        TEXT,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- ÍNDICES
-- =====================================================
CREATE INDEX idx_usuarios_empresa         ON usuarios(id_empresa);
CREATE INDEX idx_establecimientos_empresa ON establecimientos(id_empresa);
CREATE INDEX idx_puntos_emision_empresa   ON puntos_emision(id_empresa);
CREATE INDEX idx_secuenciales_punto       ON secuenciales(id_punto_emision);
CREATE INDEX idx_clientes_empresa         ON clientes(id_empresa);
CREATE INDEX idx_clientes_identificacion  ON clientes(id_empresa, identificacion);
CREATE INDEX idx_proveedores_empresa      ON proveedores(id_empresa);
CREATE INDEX idx_codigos_iva_empresa      ON codigos_iva(id_empresa);
CREATE INDEX idx_productos_empresa        ON productos(id_empresa);
CREATE INDEX idx_productos_grupo          ON productos(id_grupo);
CREATE INDEX idx_productos_iva            ON productos(id_iva);
CREATE INDEX idx_facturas_empresa         ON facturas(id_empresa);
CREATE INDEX idx_facturas_cliente         ON facturas(id_cliente);
CREATE INDEX idx_facturas_estado          ON facturas(id_empresa, estado);
CREATE INDEX idx_facturas_fecha           ON facturas(id_empresa, fecha_emision);
CREATE INDEX idx_facturas_clave           ON facturas(clave_acceso);
CREATE INDEX idx_detalle_facturas         ON detalle_facturas(id_factura);
CREATE INDEX idx_notas_credito_empresa    ON notas_credito(id_empresa);
CREATE INDEX idx_notas_credito_estado     ON notas_credito(id_empresa, estado);
CREATE INDEX idx_notas_debito_empresa     ON notas_debito(id_empresa);
CREATE INDEX idx_retenciones_empresa      ON retenciones(id_empresa);
CREATE INDEX idx_guias_empresa            ON guias_remision(id_empresa);
CREATE INDEX idx_liquidaciones_empresa    ON liquidaciones_compra(id_empresa);
CREATE INDEX idx_proformas_empresa        ON proformas(id_empresa);
CREATE INDEX idx_recurrentes_proxima      ON recurrentes(proxima_facturacion, estado);
CREATE INDEX idx_log_sri_empresa          ON log_sri(id_empresa);
CREATE INDEX idx_log_sri_documento        ON log_sri(id_documento, tipo_documento);

-- =====================================================
-- FUNCIÓN: códigos IVA por defecto al crear empresa
-- =====================================================
CREATE OR REPLACE FUNCTION fn_init_codigos_iva()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO codigos_iva (id_empresa, codigo, nombre, porcentaje) VALUES
    (NEW.id, '0', 'IVA 0%',           0.00),
    (NEW.id, '2', 'Exento de IVA',    0.00),
    (NEW.id, '3', 'No objeto de IVA', 0.00),
    (NEW.id, '4', 'IVA 15%',          15.00),
    (NEW.id, '5', 'IVA 5%',           5.00);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_empresa_init_codigos_iva
  AFTER INSERT ON empresas
  FOR EACH ROW EXECUTE FUNCTION fn_init_codigos_iva();

-- =====================================================
-- FUNCIÓN: siguiente secuencial
-- =====================================================
CREATE OR REPLACE FUNCTION get_next_secuencial(
  p_id_punto_emision INT,
  p_tipo_documento   VARCHAR(5)
)
RETURNS BIGINT AS $$
DECLARE v_sec BIGINT;
BEGIN
  UPDATE secuenciales
  SET    secuencial_actual = secuencial_actual + 1,
         updated_at        = NOW()
  WHERE  id_punto_emision = p_id_punto_emision
    AND  tipo_documento   = p_tipo_documento
  RETURNING secuencial_actual INTO v_sec;
  RETURN v_sec;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCIÓN: updated_at automático
-- =====================================================
CREATE OR REPLACE FUNCTION fn_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_empresas_upd         BEFORE UPDATE ON empresas             FOR EACH ROW EXECUTE FUNCTION fn_updated_at();
CREATE TRIGGER trg_usuarios_upd         BEFORE UPDATE ON usuarios             FOR EACH ROW EXECUTE FUNCTION fn_updated_at();
CREATE TRIGGER trg_facturas_upd         BEFORE UPDATE ON facturas             FOR EACH ROW EXECUTE FUNCTION fn_updated_at();
CREATE TRIGGER trg_notas_credito_upd    BEFORE UPDATE ON notas_credito        FOR EACH ROW EXECUTE FUNCTION fn_updated_at();
CREATE TRIGGER trg_notas_debito_upd     BEFORE UPDATE ON notas_debito         FOR EACH ROW EXECUTE FUNCTION fn_updated_at();
CREATE TRIGGER trg_retenciones_upd      BEFORE UPDATE ON retenciones          FOR EACH ROW EXECUTE FUNCTION fn_updated_at();
CREATE TRIGGER trg_guias_upd            BEFORE UPDATE ON guias_remision       FOR EACH ROW EXECUTE FUNCTION fn_updated_at();
CREATE TRIGGER trg_liquidaciones_upd    BEFORE UPDATE ON liquidaciones_compra FOR EACH ROW EXECUTE FUNCTION fn_updated_at();
CREATE TRIGGER trg_proformas_upd        BEFORE UPDATE ON proformas            FOR EACH ROW EXECUTE FUNCTION fn_updated_at();

-- =====================================================
-- DATOS INICIALES
-- =====================================================
INSERT INTO tipos_identificacion VALUES
  ('04', 'RUC'),
  ('05', 'Cédula'),
  ('06', 'Pasaporte'),
  ('07', 'Consumidor Final');

INSERT INTO roles (nombre, descripcion) VALUES
  ('ADMIN',      'Administrador de la empresa. Configura usuarios, firma y establecimientos'),
  ('FACTURADOR', 'Crea, revisa y envía documentos electrónicos al SRI'),
  ('CONTADOR',   'Solo lectura: reportes y descarga de XMLs');

INSERT INTO ambiente VALUES
(1, 'PRUEBAS'),
(2, 'PRODUCCION');

INSERT INTO tipos_documento VALUES
  ('01', 'Factura'),
  ('02', 'Nota de Venta'),
  ('03', 'Liquidación de Compra'),
  ('04', 'Nota de Crédito'),
  ('05', 'Nota de Débito'),
  ('06', 'Guía de Remisión'),
  ('07', 'Comprobante de Retención');

 INSERT INTO codigos_iva (id_empresa, codigo, nombre, porcentaje) VALUES
    (12, '0', 'IVA 0%',           0.00),
    (12, '2', 'Exento de IVA',    0.00),
    (12, '3', 'No objeto de IVA', 0.00),
    (12, '4', 'IVA 15%',          15.00),
    (12, '5', 'IVA 5%',           5.00);
  -- Cambia el 1 por el id de cada empresa existente
-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================