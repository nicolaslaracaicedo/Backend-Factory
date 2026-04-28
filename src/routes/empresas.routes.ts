import { Router } from 'express';
import { EmpresaController } from '../controllers/empresas.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { soloAdmin, todosLosRoles } from '../middlewares/role.middleware';

const router = Router();

router.get('/',  authMiddleware, todosLosRoles, EmpresaController.obtener);
router.patch('/', authMiddleware, soloAdmin,    EmpresaController.editar);

export default router;
