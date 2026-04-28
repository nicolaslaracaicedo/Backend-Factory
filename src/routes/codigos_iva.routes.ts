import { Router } from 'express';
import { CodigoIvaController } from '../controllers/codigos_iva.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { soloAdmin, todosLosRoles } from '../middlewares/role.middleware';

const router = Router();

router.get('/',             authMiddleware, todosLosRoles, CodigoIvaController.listar);
router.get('/:id',          authMiddleware, todosLosRoles, CodigoIvaController.verDetalle);
router.post('/',            authMiddleware, soloAdmin,     CodigoIvaController.crear);
router.put('/:id',          authMiddleware, soloAdmin,     CodigoIvaController.editar);
router.patch('/:id/activo', authMiddleware, soloAdmin,     CodigoIvaController.toggleActivo);

export default router;
