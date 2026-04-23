import { Router } from 'express';
import { ProveedorController } from '../controllers/proveedores.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.get('/tipos-identificacion', authMiddleware, ProveedorController.tiposIdentificacion);
router.get('/', authMiddleware, ProveedorController.listar);
router.get('/:id', authMiddleware, ProveedorController.verDetalle);
router.post('/', authMiddleware, ProveedorController.crear);
router.put('/:id', authMiddleware, ProveedorController.editar);
router.patch('/:id/estado', authMiddleware, ProveedorController.cambiarEstado);

export default router;
