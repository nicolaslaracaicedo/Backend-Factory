import { Router } from 'express';
import { ProductoController } from '../controllers/productos.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authMiddleware, ProductoController.listar);
router.get('/:id', authMiddleware, ProductoController.verDetalle);
router.post('/', authMiddleware, ProductoController.crear);
router.put('/:id', authMiddleware, ProductoController.editar);
router.patch('/:id/estado', authMiddleware, ProductoController.cambiarEstado);

export default router;
