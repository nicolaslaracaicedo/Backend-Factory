import { Router } from 'express';
import { EstablecimientoController } from '../controllers/establecimientos.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { soloAdmin, todosLosRoles } from '../middlewares/role.middleware';

const router = Router();

router.get('/',              authMiddleware, todosLosRoles, EstablecimientoController.listar);
router.get('/:id',           authMiddleware, todosLosRoles, EstablecimientoController.verDetalle);
router.post('/',             authMiddleware, soloAdmin,     EstablecimientoController.crear);
router.put('/:id',           authMiddleware, soloAdmin,     EstablecimientoController.editar);
router.patch('/:id/estado',  authMiddleware, soloAdmin,     EstablecimientoController.cambiarEstado);

export default router;
