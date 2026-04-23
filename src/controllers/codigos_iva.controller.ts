import { Request, Response } from 'express';
import { CodigoIvaService } from '../services/codigos_iva.service';

function soloAdmin(req: Request, res: Response): boolean {
  if (req.usuario!.rol !== 1) {
    res.status(403).json({ success: false, message: 'Solo el administrador puede gestionar los códigos IVA.' });
    return false;
  }
  return true;
}

export const CodigoIvaController = {
  async listar(req: Request, res: Response): Promise<void> {
    try {
      const soloActivos = req.query['activo'] as string | undefined;
      const data = await CodigoIvaService.listar(req.usuario!.empresaId, soloActivos);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async verDetalle(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params['id']);
      const data = await CodigoIvaService.verDetalle(id, req.usuario!.empresaId);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(404).json({ success: false, message: error.message });
    }
  },

  async crear(req: Request, res: Response): Promise<void> {
    if (!soloAdmin(req, res)) return;
    try {
      const data = await CodigoIvaService.crear(req.usuario!.empresaId, req.body as Record<string, unknown>);
      res.status(201).json({ success: true, data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async editar(req: Request, res: Response): Promise<void> {
    if (!soloAdmin(req, res)) return;
    try {
      const id = Number(req.params['id']);
      const data = await CodigoIvaService.editar(id, req.usuario!.empresaId, req.body as Record<string, unknown>);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async toggleActivo(req: Request, res: Response): Promise<void> {
    if (!soloAdmin(req, res)) return;
    try {
      const id = Number(req.params['id']);
      const data = await CodigoIvaService.toggleActivo(id, req.usuario!.empresaId);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },
};
