import { Router } from 'express';
import { FirmaController } from '../controllers/firmas_electronicas.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { soloAdmin, todosLosRoles } from '../middlewares/role.middleware';

const router = Router();

router.get('/',              authMiddleware, todosLosRoles, FirmaController.listar);
router.get('/empresa/:id',   authMiddleware, todosLosRoles, FirmaController.verActiva);
router.get('/:id',           authMiddleware, todosLosRoles, FirmaController.verDetalle);
router.post('/',             authMiddleware, soloAdmin,     FirmaController.subir);
router.put('/:id',           authMiddleware, soloAdmin,     FirmaController.reemplazar);
router.patch('/:id/activar', authMiddleware, soloAdmin,     FirmaController.activar);

export default router;
