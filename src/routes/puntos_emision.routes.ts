import { Router } from 'express';
import { PuntoEmisionController } from '../controllers/puntos_emision.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authMiddleware, PuntoEmisionController.listar);
router.get('/establecimiento/:establecimientoId', authMiddleware, PuntoEmisionController.listarPorEstablecimiento);
router.get('/:id', authMiddleware, PuntoEmisionController.verDetalle);
router.post('/', authMiddleware, PuntoEmisionController.crear);
router.put('/:id', authMiddleware, PuntoEmisionController.editar);
router.patch('/:id/estado', authMiddleware, PuntoEmisionController.cambiarEstado);

export default router;
