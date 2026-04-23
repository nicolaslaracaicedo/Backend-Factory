import { Request, Response } from 'express';
import { SecuencialService } from '../services/secuenciales.service';

function soloAdmin(req: Request, res: Response): boolean {
  if (req.usuario!.rol !== 1) {
    res.status(403).json({ success: false, message: 'Solo el administrador puede gestionar secuenciales.' });
    return false;
  }
  return true;
}

export const SecuencialController = {
  async listar(req: Request, res: Response): Promise<void> {
    try {
      const query = req.query as Record<string, string | undefined>;
      const data = await SecuencialService.listar(req.usuario!.empresaId, query);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async listarPorPunto(req: Request, res: Response): Promise<void> {
    try {
      const puntoEmisionId = Number(req.params['puntoEmisionId']);
      const data = await SecuencialService.listarPorPunto(puntoEmisionId, req.usuario!.empresaId);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async verDetalle(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params['id']);
      const data = await SecuencialService.verDetalle(id, req.usuario!.empresaId);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(404).json({ success: false, message: error.message });
    }
  },

  async crear(req: Request, res: Response): Promise<void> {
    if (!soloAdmin(req, res)) return;
    try {
      const data = await SecuencialService.crear(req.usuario!.empresaId, req.body as Record<string, unknown>);
      res.status(201).json({ success: true, data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async cambiarEstado(req: Request, res: Response): Promise<void> {
    if (!soloAdmin(req, res)) return;
    try {
      const id = Number(req.params['id']);
      const data = await SecuencialService.cambiarEstado(id, req.usuario!.empresaId);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async tiposDocumento(_req: Request, res: Response): Promise<void> {
    try {
      const data = await SecuencialService.getTiposDocumento();
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
};
