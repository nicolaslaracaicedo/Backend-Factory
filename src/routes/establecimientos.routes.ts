import { Router } from 'express';
import { EstablecimientoController } from '../controllers/establecimientos.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authMiddleware, EstablecimientoController.listar);
router.get('/:id', authMiddleware, EstablecimientoController.verDetalle);
router.post('/', authMiddleware, EstablecimientoController.crear);
router.put('/:id', authMiddleware, EstablecimientoController.editar);
router.patch('/:id/estado', authMiddleware, EstablecimientoController.cambiarEstado);

export default router;
