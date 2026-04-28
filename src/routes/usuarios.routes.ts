import { Router } from 'express';
import { UsuarioController } from '../controllers/usuarios.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { soloAdmin } from '../middlewares/role.middleware';

const router = Router();

router.get('/',             authMiddleware, soloAdmin, UsuarioController.listar);
router.get('/:id',          authMiddleware, soloAdmin, UsuarioController.verDetalle);
router.post('/',            authMiddleware, soloAdmin, UsuarioController.crear);
router.put('/:id',          authMiddleware, soloAdmin, UsuarioController.editar);
router.patch('/:id/estado', authMiddleware, soloAdmin, UsuarioController.cambiarEstado);

export default router;
