import { Router } from 'express';
import { FirmaController } from '../controllers/firmas_electronicas.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authMiddleware, FirmaController.listar);
router.get('/:id', authMiddleware, FirmaController.verDetalle);
router.post('/', authMiddleware, FirmaController.subir);
router.get('/empresa/:id', authMiddleware, FirmaController.verActiva);
router.put('/:id', authMiddleware, FirmaController.reemplazar);
router.patch('/:id/activar', authMiddleware, FirmaController.activar);

export default router;
