import { Router } from 'express';
import { GrupoProductoController } from '../controllers/grupos_productos.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authMiddleware, GrupoProductoController.listar);
router.get('/:id', authMiddleware, GrupoProductoController.verDetalle);
router.post('/', authMiddleware, GrupoProductoController.crear);
router.put('/:id', authMiddleware, GrupoProductoController.editar);
router.patch('/:id/estado', authMiddleware, GrupoProductoController.cambiarEstado);

export default router;
