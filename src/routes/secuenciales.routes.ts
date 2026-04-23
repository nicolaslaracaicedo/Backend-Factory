import { Router } from 'express';
import { SecuencialController } from '../controllers/secuenciales.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.get('/tipos-documento', authMiddleware, SecuencialController.tiposDocumento);
router.get('/punto/:puntoEmisionId', authMiddleware, SecuencialController.listarPorPunto);
router.get('/', authMiddleware, SecuencialController.listar);
router.get('/:id', authMiddleware, SecuencialController.verDetalle);
router.post('/', authMiddleware, SecuencialController.crear);
router.patch('/:id/estado', authMiddleware, SecuencialController.cambiarEstado);

export default router;
