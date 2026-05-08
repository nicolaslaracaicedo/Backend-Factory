import { Router } from 'express';
import { ClienteController } from '../controllers/clientes.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { adminYFacturador, todosLosRoles } from '../middlewares/role.middleware';

const router = Router();

router.get('/tipos-identificacion', authMiddleware, todosLosRoles,    ClienteController.tiposIdentificacion);
router.get('/buscar',               authMiddleware, todosLosRoles,    ClienteController.buscarPorIdentificacion);
router.get('/',                     authMiddleware, todosLosRoles,    ClienteController.listar);
router.get('/:id',                  authMiddleware, todosLosRoles,    ClienteController.verDetalle);
router.post('/',                    authMiddleware, adminYFacturador, ClienteController.crear);
router.put('/:id',                  authMiddleware, adminYFacturador, ClienteController.editar);
router.patch('/:id/estado',         authMiddleware, adminYFacturador, ClienteController.cambiarEstado);

export default router;
