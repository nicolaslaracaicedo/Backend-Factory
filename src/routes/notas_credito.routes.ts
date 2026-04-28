import { Router } from 'express';
import { NotaCreditoController } from '../controllers/notas_credito.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authMiddleware, NotaCreditoController.listar);
router.get('/:id', authMiddleware, NotaCreditoController.verDetalle);
router.post('/', authMiddleware, NotaCreditoController.crear);
router.put('/:id', authMiddleware, NotaCreditoController.editar);
router.delete('/:id', authMiddleware, NotaCreditoController.eliminar);
router.patch('/:id/estado', authMiddleware, NotaCreditoController.cambiarEstado);
router.post('/:id/emitir', authMiddleware, NotaCreditoController.emitir);

export default router;
