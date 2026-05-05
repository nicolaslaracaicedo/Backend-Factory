import { Router } from 'express';
import { RecurrenteController } from '../controllers/recurrentes.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { adminYFacturador, todosLosRoles } from '../middlewares/role.middleware';

const router = Router();

router.get('/',              authMiddleware, todosLosRoles,    RecurrenteController.listar);
router.get('/:id',           authMiddleware, todosLosRoles,    RecurrenteController.verDetalle);
router.post('/',             authMiddleware, adminYFacturador, RecurrenteController.crear);
router.put('/:id',           authMiddleware, adminYFacturador, RecurrenteController.editar);
router.delete('/:id',        authMiddleware, adminYFacturador, RecurrenteController.eliminar);
router.patch('/:id/estado',  authMiddleware, adminYFacturador, RecurrenteController.cambiarEstado);
router.post('/:id/generar',  authMiddleware, adminYFacturador, RecurrenteController.generarManual);

export default router;
