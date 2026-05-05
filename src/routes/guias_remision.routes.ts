import { Router } from 'express';
import { GuiaRemisionController } from '../controllers/guias_remision.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { adminYFacturador, todosLosRoles } from '../middlewares/role.middleware';

const router = Router();

router.get('/',             authMiddleware, todosLosRoles,    GuiaRemisionController.listar);
router.get('/:id',          authMiddleware, todosLosRoles,    GuiaRemisionController.verDetalle);
router.post('/',            authMiddleware, adminYFacturador, GuiaRemisionController.crear);
router.put('/:id',          authMiddleware, adminYFacturador, GuiaRemisionController.editar);
router.delete('/:id',       authMiddleware, adminYFacturador, GuiaRemisionController.eliminar);
router.patch('/:id/estado', authMiddleware, adminYFacturador, GuiaRemisionController.cambiarEstado);
router.post('/:id/emitir',  authMiddleware, adminYFacturador, GuiaRemisionController.emitir);

export default router;
