import { Router } from 'express';
import { CodigoIvaController } from '../controllers/codigos_iva.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authMiddleware, CodigoIvaController.listar);
router.get('/:id', authMiddleware, CodigoIvaController.verDetalle);
router.post('/', authMiddleware, CodigoIvaController.crear);
router.put('/:id', authMiddleware, CodigoIvaController.editar);
router.patch('/:id/activo', authMiddleware, CodigoIvaController.toggleActivo);

export default router;
