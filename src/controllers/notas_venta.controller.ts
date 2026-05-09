import { Request, Response } from 'express';
import { NotaVentaService } from '../services/notas_venta.service';
import { NotaVentaModel } from '../models/notas_venta.model';
import { EmpresaModel } from '../models/empresas.model';
import { generarPdfNotaVenta } from '../utils/pdf-nota-venta';
import { generarReciboNotaVenta } from '../utils/pdf-recibo-nota-venta';

export const NotaVentaController = {
  async listar(req: Request, res: Response): Promise<void> {
    try {
      const query = req.query as Record<string, string | undefined>;
      const data = await NotaVentaService.listar(req.usuario!.empresaId, query);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async verDetalle(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params['id']);
      const data = await NotaVentaService.verDetalle(id, req.usuario!.empresaId);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(404).json({ success: false, message: error.message });
    }
  },

  async crear(req: Request, res: Response): Promise<void> {
    try {
      const data = await NotaVentaService.crear(
        req.usuario!.empresaId,
        req.usuario!.usuarioId,
        req.body as Record<string, unknown>,
      );
      res.status(201).json({ success: true, data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async editar(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params['id']);
      const data = await NotaVentaService.editar(
        id,
        req.usuario!.empresaId,
        req.body as Record<string, unknown>,
      );
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async eliminar(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params['id']);
      const data = await NotaVentaService.eliminar(id, req.usuario!.empresaId);
      res.status(200).json({ success: true, ...data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async emitir(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params['id']);
      const data = await NotaVentaService.emitir(id, req.usuario!.empresaId);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async cambiarEstado(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params['id']);
      const data = await NotaVentaService.cambiarEstado(
        id,
        req.usuario!.empresaId,
        (req.body ?? {}) as Record<string, unknown>,
      );
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async generarPDF(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params['id']);
      const empresaId = req.usuario!.empresaId;

      const nv = await NotaVentaModel.findByIdConDetalles(id);
      if (!nv || nv.id_empresa !== empresaId) {
        res.status(404).json({ success: false, message: 'Nota de venta no encontrada.' });
        return;
      }

      const empresa = await EmpresaModel.findById(empresaId);
      if (!empresa) {
        res.status(404).json({ success: false, message: 'Empresa no encontrada.' });
        return;
      }

      const buffer = await generarPdfNotaVenta(nv, empresa);
      const numero = (nv.numero_comprobante ?? `nv-${id}`).replace(/\//g, '-');

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${numero}.pdf"`);
      res.setHeader('Content-Length', buffer.length);
      res.send(buffer);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  async generarRecibo(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params['id']);
      const empresaId = req.usuario!.empresaId;

      const nv = await NotaVentaModel.findByIdConDetalles(id);
      if (!nv || nv.id_empresa !== empresaId) {
        res.status(404).json({ success: false, message: 'Nota de venta no encontrada.' });
        return;
      }

      const empresa = await EmpresaModel.findById(empresaId);
      if (!empresa) {
        res.status(404).json({ success: false, message: 'Empresa no encontrada.' });
        return;
      }

      const buffer = await generarReciboNotaVenta(nv, empresa);
      const numero = (nv.numero_comprobante ?? `nv-${id}`).replace(/\//g, '-');

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="recibo-${numero}.pdf"`);
      res.setHeader('Content-Length', buffer.length);
      res.send(buffer);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
};
