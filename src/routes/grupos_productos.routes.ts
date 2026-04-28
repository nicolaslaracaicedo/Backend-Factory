import { Router } from 'express';
import { GrupoProductoController } from '../controllers/grupos_productos.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { adminYFacturador, todosLosRoles } from '../middlewares/role.middleware';

const router = Router();

router.get('/',            authMiddleware, todosLosRoles,    GrupoProductoController.listar);
router.get('/:id',         authMiddleware, todosLosRoles,    GrupoProductoController.verDetalle);
router.post('/',           authMiddleware, adminYFacturador, GrupoProductoController.crear);
router.put('/:id',         authMiddleware, adminYFacturador, GrupoProductoController.editar);
router.patch('/:id/estado',authMiddleware, adminYFacturador, GrupoProductoController.cambiarEstado);

export default router;
