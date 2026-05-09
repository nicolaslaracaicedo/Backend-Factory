import { Request, Response } from 'express';
import { RetencioneService } from '../services/retenciones.service';
import { RetencioneModel } from '../models/retenciones.model';
import { EmpresaModel } from '../models/empresas.model';
import { generarPdfRetencion } from '../utils/pdf-retencion';

export const RetencioneController = {
  async listar(req: Request, res: Response): Promise<void> {
    try {
      const data = await RetencioneService.listar(req.usuario!.empresaId, req.query as Record<string, string | undefined>);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async verDetalle(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params['id']);
      const data = await RetencioneService.verDetalle(id, req.usuario!.empresaId);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(404).json({ success: false, message: error.message });
    }
  },

  async crear(req: Request, res: Response): Promise<void> {
    try {
      const data = await RetencioneService.crear(
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
      const data = await RetencioneService.editar(id, req.usuario!.empresaId, req.body as Record<string, unknown>);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async eliminar(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params['id']);
      const data = await RetencioneService.eliminar(id, req.usuario!.empresaId);
      res.status(200).json({ success: true, ...data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async emitir(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params['id']);
      const data = await RetencioneService.emitir(id, req.usuario!.empresaId);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async cambiarEstado(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params['id']);
      const data = await RetencioneService.cambiarEstado(id, req.usuario!.empresaId, (req.body ?? {}) as Record<string, unknown>);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async generarPDF(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params['id']);
      const empresaId = req.usuario!.empresaId;

      const ret = await RetencioneModel.findByIdConDetalles(id);
      if (!ret || ret.id_empresa !== empresaId) {
        res.status(404).json({ success: false, message: 'Retención no encontrada.' });
        return;
      }

      const empresa = await EmpresaModel.findById(empresaId);
      if (!empresa) {
        res.status(404).json({ success: false, message: 'Empresa no encontrada.' });
        return;
      }

      const buffer = await generarPdfRetencion(ret, empresa);
      const numero = (ret.numero_comprobante ?? `ret-${id}`).replace(/\//g, '-');

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${numero}.pdf"`);
      res.setHeader('Content-Length', buffer.length);
      res.send(buffer);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
};
