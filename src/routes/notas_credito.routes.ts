import { Router } from 'express';
import { NotaCreditoController } from '../controllers/notas_credito.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { adminYFacturador, todosLosRoles } from '../middlewares/role.middleware';

const router = Router();

router.get('/',             authMiddleware, todosLosRoles,    NotaCreditoController.listar);
router.get('/:id',          authMiddleware, todosLosRoles,    NotaCreditoController.verDetalle);
router.post('/',            authMiddleware, adminYFacturador, NotaCreditoController.crear);
router.put('/:id',          authMiddleware, adminYFacturador, NotaCreditoController.editar);
router.delete('/:id',       authMiddleware, adminYFacturador, NotaCreditoController.eliminar);
router.patch('/:id/estado', authMiddleware, adminYFacturador, NotaCreditoController.cambiarEstado);
router.post('/:id/emitir',  authMiddleware, adminYFacturador, NotaCreditoController.emitir);
router.get('/:id/pdf',      authMiddleware, todosLosRoles,    NotaCreditoController.generarPDF);
router.get('/:id/recibo',   authMiddleware, todosLosRoles,    NotaCreditoController.generarRecibo);

export default router;
