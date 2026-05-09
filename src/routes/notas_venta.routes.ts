import { Router } from 'express';
import { NotaVentaController } from '../controllers/notas_venta.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { adminYFacturador, todosLosRoles } from '../middlewares/role.middleware';

const router = Router();

router.get('/',             authMiddleware, todosLosRoles,    NotaVentaController.listar);
router.get('/:id',          authMiddleware, todosLosRoles,    NotaVentaController.verDetalle);
router.post('/',            authMiddleware, adminYFacturador, NotaVentaController.crear);
router.put('/:id',          authMiddleware, adminYFacturador, NotaVentaController.editar);
router.delete('/:id',       authMiddleware, adminYFacturador, NotaVentaController.eliminar);
router.patch('/:id/estado', authMiddleware, adminYFacturador, NotaVentaController.cambiarEstado);
router.post('/:id/emitir',  authMiddleware, adminYFacturador, NotaVentaController.emitir);
router.get('/:id/pdf',      authMiddleware, todosLosRoles,    NotaVentaController.generarPDF);
router.get('/:id/recibo',   authMiddleware, todosLosRoles,    NotaVentaController.generarRecibo);

export default router;
