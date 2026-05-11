import { Router } from 'express';
import { FacturaController } from '../controllers/facturas.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { adminYFacturador, todosLosRoles } from '../middlewares/role.middleware';

const router = Router();

router.get('/',                      authMiddleware, todosLosRoles,    FacturaController.listar);
router.get('/:id/pdf',               authMiddleware, todosLosRoles,    FacturaController.generarPDF);
router.get('/:id/recibo',            authMiddleware, todosLosRoles,    FacturaController.generarRecibo);
router.get('/:id',                   authMiddleware, todosLosRoles,    FacturaController.verDetalle);
router.post('/',                     authMiddleware, adminYFacturador, FacturaController.crear);
router.put('/:id',                   authMiddleware, adminYFacturador, FacturaController.editar);
router.delete('/:id',                authMiddleware, adminYFacturador, FacturaController.eliminar);
router.patch('/:id/estado',          authMiddleware, adminYFacturador, FacturaController.cambiarEstado);
router.post('/:id/emitir',           authMiddleware, adminYFacturador, FacturaController.emitir);
router.post('/:id/enviar-correo',    authMiddleware, adminYFacturador, FacturaController.enviarCorreo);

export default router;
