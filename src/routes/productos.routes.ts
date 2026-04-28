import { Router } from 'express';
import { ProductoController } from '../controllers/productos.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { adminYFacturador, todosLosRoles } from '../middlewares/role.middleware';

const router = Router();

router.get('/',             authMiddleware, todosLosRoles,    ProductoController.listar);
router.get('/:id',          authMiddleware, todosLosRoles,    ProductoController.verDetalle);
router.post('/',            authMiddleware, adminYFacturador, ProductoController.crear);
router.put('/:id',          authMiddleware, adminYFacturador, ProductoController.editar);
router.patch('/:id/estado', authMiddleware, adminYFacturador, ProductoController.cambiarEstado);

export default router;
