import { Router } from 'express';
import { FacturaController } from '../controllers/facturas.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authMiddleware, FacturaController.listar);
router.get('/:id', authMiddleware, FacturaController.verDetalle);
router.post('/', authMiddleware, FacturaController.crear);
router.put('/:id', authMiddleware, FacturaController.editar);
router.delete('/:id', authMiddleware, FacturaController.eliminar);
router.patch('/:id/estado', authMiddleware, FacturaController.cambiarEstado);
router.post('/:id/emitir', authMiddleware, FacturaController.emitir);

export default router;
