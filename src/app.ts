import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import pool from './config/database';
import authRoutes from './routes/auth.routes';
import empresasRoutes from './routes/empresas.routes';
import firmasRoutes from './routes/firmas_electronicas.routes';
import ambienteRoutes from './routes/ambiente.routes';
import establecimientosRoutes from './routes/establecimientos.routes';
import puntosEmisionRoutes from './routes/puntos_emision.routes';
import secuencialesRoutes from './routes/secuenciales.routes';
import clientesRoutes from './routes/clientes.routes';
import proveedoresRoutes from './routes/proveedores.routes';
import gruposProductosRoutes from './routes/grupos_productos.routes';
import productosRoutes from './routes/productos.routes';
import codigosIvaRoutes from './routes/codigos_iva.routes';

dotenv.config();

const app = express();

const PORT = Number(process.env.PORT) || 3000;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/', (_req, res) => {
  res.json({ status: 'okkkkkkkkkk backenddd' });

});

//RUTAS AUTH
app.use('/api/auth', authRoutes);

// RUTAS EMPRESA
app.use('/api/empresa', empresasRoutes);

// RUTAS FIRMA ELECTRÓNICA
app.use('/api/firma', firmasRoutes);

// RUTAS AMBIENTE
app.use('/api/ambiente', ambienteRoutes);

// RUTAS ESTABLECIMIENTOS
app.use('/api/establecimientos', establecimientosRoutes);

// RUTAS PUNTOS DE EMISIÓN
app.use('/api/puntos-emision', puntosEmisionRoutes);

// RUTAS SECUENCIALES
app.use('/api/secuenciales', secuencialesRoutes);

// RUTAS CLIENTES
app.use('/api/clientes', clientesRoutes);

// RUTAS PROVEEDORES
app.use('/api/proveedores', proveedoresRoutes);

// RUTAS GRUPOS DE PRODUCTOS
app.use('/api/grupos-productos', gruposProductosRoutes);

// RUTAS CÓDIGOS IVA
app.use('/api/codigos-iva', codigosIvaRoutes);

// RUTAS PRODUCTOS
app.use('/api/productos', productosRoutes);

pool.query('SELECT 1')
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Servidor corriendo en el puerto ${PORT}`);
    });
  })
  .catch((err: unknown) => {
    console.error('Error al conectar la base de datos:', err);
    process.exit(1);
  });

export default app;