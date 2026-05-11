import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { todosLosRoles } from '../middlewares/role.middleware';

const router = Router();

router.get('/', authMiddleware, todosLosRoles, DashboardController.obtener);

export default router;
