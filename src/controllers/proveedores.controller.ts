import { Request, Response } from 'express';
import { ProveedorService } from '../services/proveedores.service';

export const ProveedorController = {
  async listar(req: Request, res: Response): Promise<void> {
    try {
      const query = req.query as Record<string, string | undefined>;
      const data = await ProveedorService.listar(req.usuario!.empresaId, query);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async verDetalle(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params['id']);
      const data = await ProveedorService.verDetalle(id, req.usuario!.empresaId);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(404).json({ success: false, message: error.message });
    }
  },

  async crear(req: Request, res: Response): Promise<void> {
    try {
      const data = await ProveedorService.crear(req.usuario!.empresaId, req.body as Record<string, unknown>);
      res.status(201).json({ success: true, data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async editar(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params['id']);
      const data = await ProveedorService.editar(id, req.usuario!.empresaId, req.body as Record<string, unknown>);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async cambiarEstado(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params['id']);
      const data = await ProveedorService.cambiarEstado(id, req.usuario!.empresaId);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async tiposIdentificacion(_req: Request, res: Response): Promise<void> {
    try {
      const data = await ProveedorService.getTiposIdentificacion();
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
};
