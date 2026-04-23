import { Router } from 'express';
import { EmpresaController } from '../controllers/empresas.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authMiddleware, EmpresaController.obtener);
router.patch('/', authMiddleware, EmpresaController.editar);

export default router;
