import { Request, Response } from 'express';
import { LiquidacionCompraService } from '../services/liquidaciones_compra.service';

export const LiquidacionCompraController = {
  async listar(req: Request, res: Response): Promise<void> {
    try {
      const query = req.query as Record<string, string | undefined>;
      const data = await LiquidacionCompraService.listar(req.usuario!.empresaId, query);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async verDetalle(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params['id']);
      const data = await LiquidacionCompraService.verDetalle(id, req.usuario!.empresaId);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(404).json({ success: false, message: error.message });
    }
  },

  async crear(req: Request, res: Response): Promise<void> {
    try {
      const data = await LiquidacionCompraService.crear(
        req.usuario!.empresaId,
        req.usuario!.usuarioId,
        req.body as Record<string, unknown>
      );
      res.status(201).json({ success: true, data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async editar(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params['id']);
      const data = await LiquidacionCompraService.editar(
        id,
        req.usuario!.empresaId,
        req.body as Record<string, unknown>
      );
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async eliminar(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params['id']);
      const data = await LiquidacionCompraService.eliminar(id, req.usuario!.empresaId);
      res.status(200).json({ success: true, ...data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async emitir(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params['id']);
      const data = await LiquidacionCompraService.emitir(id, req.usuario!.empresaId);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async cambiarEstado(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params['id']);
      const data = await LiquidacionCompraService.cambiarEstado(
        id,
        req.usuario!.empresaId,
        (req.body ?? {}) as Record<string, unknown>
      );
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },
};
