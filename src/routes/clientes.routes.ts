import { Router } from 'express';
import { ClienteController } from '../controllers/clientes.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.get('/tipos-identificacion', authMiddleware, ClienteController.tiposIdentificacion);
router.get('/', authMiddleware, ClienteController.listar);
router.get('/:id', authMiddleware, ClienteController.verDetalle);
router.post('/', authMiddleware, ClienteController.crear);
router.put('/:id', authMiddleware, ClienteController.editar);
router.patch('/:id/estado', authMiddleware, ClienteController.cambiarEstado);

export default router;
