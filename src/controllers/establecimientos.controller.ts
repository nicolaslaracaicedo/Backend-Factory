import { Request, Response } from 'express';
import { EstablecimientoService } from '../services/establecimientos.service';

function soloAdmin(req: Request, res: Response): boolean {
  if (req.usuario!.rol !== 1) {
    res.status(403).json({ success: false, message: 'Solo el administrador puede gestionar establecimientos.' });
    return false;
  }
  return true;
}

export const EstablecimientoController = {
  async listar(req: Request, res: Response): Promise<void> {
    try {
      const estado = req.query['estado'] as string | undefined;
      const data = await EstablecimientoService.listar(req.usuario!.empresaId, estado);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async verDetalle(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params['id']);
      const data = await EstablecimientoService.verDetalle(id, req.usuario!.empresaId);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(404).json({ success: false, message: error.message });
    }
  },

  async crear(req: Request, res: Response): Promise<void> {
    if (!soloAdmin(req, res)) return;
    try {
      const data = await EstablecimientoService.crear(req.usuario!.empresaId, req.body as Record<string, unknown>);
      res.status(201).json({ success: true, data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async editar(req: Request, res: Response): Promise<void> {
    if (!soloAdmin(req, res)) return;
    try {
      const id = Number(req.params['id']);
      const data = await EstablecimientoService.editar(id, req.usuario!.empresaId, req.body as Record<string, unknown>);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async cambiarEstado(req: Request, res: Response): Promise<void> {
    if (!soloAdmin(req, res)) return;
    try {
      const id = Number(req.params['id']);
      const data = await EstablecimientoService.cambiarEstado(id, req.usuario!.empresaId);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },
};
