import { Router } from 'express';
import { NotaDebitoController } from '../controllers/notas_debito.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { adminYFacturador, todosLosRoles } from '../middlewares/role.middleware';

const router = Router();

router.get('/',             authMiddleware, todosLosRoles,    NotaDebitoController.listar);
router.get('/:id',          authMiddleware, todosLosRoles,    NotaDebitoController.verDetalle);
router.post('/',            authMiddleware, adminYFacturador, NotaDebitoController.crear);
router.put('/:id',          authMiddleware, adminYFacturador, NotaDebitoController.editar);
router.delete('/:id',       authMiddleware, adminYFacturador, NotaDebitoController.eliminar);
router.patch('/:id/estado', authMiddleware, adminYFacturador, NotaDebitoController.cambiarEstado);
router.post('/:id/emitir',  authMiddleware, adminYFacturador, NotaDebitoController.emitir);

export default router;
