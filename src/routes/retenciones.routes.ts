import { Router } from 'express';
import { RetencioneController } from '../controllers/retenciones.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { adminYFacturador, todosLosRoles } from '../middlewares/role.middleware';

const router = Router();

router.get('/',             authMiddleware, todosLosRoles,    RetencioneController.listar);
router.get('/:id',          authMiddleware, todosLosRoles,    RetencioneController.verDetalle);
router.post('/',            authMiddleware, adminYFacturador, RetencioneController.crear);
router.put('/:id',          authMiddleware, adminYFacturador, RetencioneController.editar);
router.delete('/:id',       authMiddleware, adminYFacturador, RetencioneController.eliminar);
router.patch('/:id/estado', authMiddleware, adminYFacturador, RetencioneController.cambiarEstado);
router.post('/:id/emitir',  authMiddleware, adminYFacturador, RetencioneController.emitir);

export default router;
