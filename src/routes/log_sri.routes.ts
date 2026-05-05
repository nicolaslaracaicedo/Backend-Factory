import { Router } from 'express';
import { LogSriController } from '../controllers/log_sri.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { todosLosRoles } from '../middlewares/role.middleware';

const router = Router();

router.get('/',    authMiddleware, todosLosRoles, LogSriController.listar);
router.get('/:id', authMiddleware, todosLosRoles, LogSriController.verDetalle);

export default router;
