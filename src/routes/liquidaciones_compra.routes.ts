import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { adminYFacturador, todosLosRoles } from '../middlewares/role.middleware';
import { LiquidacionCompraController } from '../controllers/liquidaciones_compra.controller';

const router = Router();

router.get('/',             authMiddleware, todosLosRoles,    LiquidacionCompraController.listar);
router.get('/:id',          authMiddleware, todosLosRoles,    LiquidacionCompraController.verDetalle);
router.post('/',            authMiddleware, adminYFacturador, LiquidacionCompraController.crear);
router.put('/:id',          authMiddleware, adminYFacturador, LiquidacionCompraController.editar);
router.delete('/:id',       authMiddleware, adminYFacturador, LiquidacionCompraController.eliminar);
router.patch('/:id/estado', authMiddleware, adminYFacturador, LiquidacionCompraController.cambiarEstado);
router.post('/:id/emitir',  authMiddleware, adminYFacturador, LiquidacionCompraController.emitir);

export default router;
