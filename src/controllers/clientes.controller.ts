import { Request, Response } from 'express';
import { ClienteService } from '../services/clientes.service';
import { ClienteModel } from '../models/clientes.model';

export const ClienteController = {
  async listar(req: Request, res: Response): Promise<void> {
    try {
      const query = req.query as Record<string, string | undefined>;
      const data = await ClienteService.listar(req.usuario!.empresaId, query);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async verDetalle(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params['id']);
      const data = await ClienteService.verDetalle(id, req.usuario!.empresaId);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(404).json({ success: false, message: error.message });
    }
  },

  async crear(req: Request, res: Response): Promise<void> {
    try {
      const data = await ClienteService.crear(req.usuario!.empresaId, req.body as Record<string, unknown>);
      res.status(201).json({ success: true, data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async editar(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params['id']);
      const data = await ClienteService.editar(id, req.usuario!.empresaId, req.body as Record<string, unknown>);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async cambiarEstado(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params['id']);
      const data = await ClienteService.cambiarEstado(id, req.usuario!.empresaId);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async buscarPorIdentificacion(req: Request, res: Response): Promise<void> {
    try {
      const identificacion = (req.query['q'] as string ?? '').trim();
      if (!identificacion) {
        res.status(400).json({ success: false, message: 'El parámetro q (RUC o identificación) es requerido.' });
        return;
      }
      const cliente = await ClienteModel.findByIdentificacion(req.usuario!.empresaId, identificacion);
      if (!cliente) {
        res.status(404).json({ success: false, message: 'Cliente no encontrado con esa identificación.' });
        return;
      }
      res.status(200).json({ success: true, data: cliente });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async tiposIdentificacion(_req: Request, res: Response): Promise<void> {
    try {
      const data = await ClienteService.getTiposIdentificacion();
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
};
