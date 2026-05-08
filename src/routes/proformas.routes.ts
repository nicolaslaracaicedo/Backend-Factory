import { Router } from 'express';
import { ProformaController } from '../controllers/proformas.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { adminYFacturador, todosLosRoles } from '../middlewares/role.middleware';

const router = Router();

router.get('/',               authMiddleware, todosLosRoles,    ProformaController.listar);
router.get('/:id/pdf',        authMiddleware, todosLosRoles,    ProformaController.generarPDF);
router.get('/:id',            authMiddleware, todosLosRoles,    ProformaController.verDetalle);
router.post('/',              authMiddleware, adminYFacturador, ProformaController.crear);
router.put('/:id',            authMiddleware, adminYFacturador, ProformaController.editar);
router.delete('/:id',         authMiddleware, adminYFacturador, ProformaController.eliminar);
router.patch('/:id/estado',   authMiddleware, adminYFacturador, ProformaController.cambiarEstado);
router.post('/:id/convertir', authMiddleware, adminYFacturador, ProformaController.convertirAFactura);

export default router;
