import { Router } from 'express';
import { AmbienteController } from '../controllers/ambiente.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authMiddleware, AmbienteController.listar);

export default router;
