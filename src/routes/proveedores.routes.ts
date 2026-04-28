import { Router } from 'express';
import { ProveedorController } from '../controllers/proveedores.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { adminYFacturador, todosLosRoles } from '../middlewares/role.middleware';

const router = Router();

router.get('/tipos-identificacion', authMiddleware, todosLosRoles,    ProveedorController.tiposIdentificacion);
router.get('/',                     authMiddleware, todosLosRoles,    ProveedorController.listar);
router.get('/:id',                  authMiddleware, todosLosRoles,    ProveedorController.verDetalle);
router.post('/',                    authMiddleware, adminYFacturador, ProveedorController.crear);
router.put('/:id',                  authMiddleware, adminYFacturador, ProveedorController.editar);
router.patch('/:id/estado',         authMiddleware, adminYFacturador, ProveedorController.cambiarEstado);

export default router;
