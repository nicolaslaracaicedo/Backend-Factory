import { Router } from 'express';
import { SecuencialController } from '../controllers/secuenciales.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { soloAdmin, todosLosRoles } from '../middlewares/role.middleware';

const router = Router();

router.get('/tipos-documento',       authMiddleware, todosLosRoles, SecuencialController.tiposDocumento);
router.get('/punto/:puntoEmisionId', authMiddleware, todosLosRoles, SecuencialController.listarPorPunto);
router.get('/',                      authMiddleware, todosLosRoles, SecuencialController.listar);
router.get('/:id',                   authMiddleware, todosLosRoles, SecuencialController.verDetalle);
router.post('/',                     authMiddleware, soloAdmin,     SecuencialController.crear);
router.patch('/:id/estado',          authMiddleware, soloAdmin,     SecuencialController.cambiarEstado);

export default router;
