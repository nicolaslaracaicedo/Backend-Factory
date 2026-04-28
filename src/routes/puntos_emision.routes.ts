import { Router } from 'express';
import { PuntoEmisionController } from '../controllers/puntos_emision.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { soloAdmin, todosLosRoles } from '../middlewares/role.middleware';

const router = Router();

router.get('/',                              authMiddleware, todosLosRoles, PuntoEmisionController.listar);
router.get('/establecimiento/:establecimientoId', authMiddleware, todosLosRoles, PuntoEmisionController.listarPorEstablecimiento);
router.get('/:id',                           authMiddleware, todosLosRoles, PuntoEmisionController.verDetalle);
router.post('/',                             authMiddleware, soloAdmin,     PuntoEmisionController.crear);
router.put('/:id',                           authMiddleware, soloAdmin,     PuntoEmisionController.editar);
router.patch('/:id/estado',                  authMiddleware, soloAdmin,     PuntoEmisionController.cambiarEstado);

export default router;
