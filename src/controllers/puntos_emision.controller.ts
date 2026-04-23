import { Request, Response } from 'express';
import { PuntoEmisionService } from '../services/puntos_emision.service';

function soloAdmin(req: Request, res: Response): boolean {
  if (req.usuario!.rol !== 1) {
    res.status(403).json({ success: false, message: 'Solo el administrador puede gestionar puntos de emisión.' });
    return false;
  }
  return true;
}

export const PuntoEmisionController = {
  async listar(req: Request, res: Response): Promise<void> {
    try {
      const estado = req.query['estado'] as string | undefined;
      const data = await PuntoEmisionService.listar(req.usuario!.empresaId, estado);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async listarPorEstablecimiento(req: Request, res: Response): Promise<void> {
    try {
      const establecimientoId = Number(req.params['establecimientoId']);
      const estado = req.query['estado'] as string | undefined;
      const data = await PuntoEmisionService.listarPorEstablecimiento(establecimientoId, req.usuario!.empresaId, estado);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async verDetalle(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params['id']);
      const data = await PuntoEmisionService.verDetalle(id, req.usuario!.empresaId);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(404).json({ success: false, message: error.message });
    }
  },

  async crear(req: Request, res: Response): Promise<void> {
    if (!soloAdmin(req, res)) return;
    try {
      const data = await PuntoEmisionService.crear(req.usuario!.empresaId, req.body as Record<string, unknown>);
      res.status(201).json({ success: true, data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async editar(req: Request, res: Response): Promise<void> {
    if (!soloAdmin(req, res)) return;
    try {
      const id = Number(req.params['id']);
      const data = await PuntoEmisionService.editar(id, req.usuario!.empresaId, req.body as Record<string, unknown>);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async cambiarEstado(req: Request, res: Response): Promise<void> {
    if (!soloAdmin(req, res)) return;
    try {
      const id = Number(req.params['id']);
      const data = await PuntoEmisionService.cambiarEstado(id, req.usuario!.empresaId);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },
};
