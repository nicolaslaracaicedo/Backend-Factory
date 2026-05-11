import { Request, Response } from 'express';
import { RetencioneService } from '../services/retenciones.service';
import { RetencioneModel } from '../models/retenciones.model';
import { EmpresaModel } from '../models/empresas.model';
import { generarPdfRetencion } from '../utils/pdf-retencion';
import { enviarDocumentoPorCorreo } from '../utils/email.service';
import { ProveedorModel } from '../models/proveedores.model';

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
      const empresaId = req.usuario!.empresaId;
      const data = await RetencioneService.emitir(id, empresaId);
      res.status(200).json({ success: true, data });

      if (data && data.estado === 'AUTORIZADO') {
        (async () => {
          try {
            const ret = await RetencioneModel.findByIdConDetalles(id);
            if (!ret) return;
            const correoDestino = ret.id_proveedor ? (await ProveedorModel.findById(ret.id_proveedor))?.email ?? null : null;
            if (!correoDestino) return;
            const empresa = await EmpresaModel.findById(empresaId);
            if (!empresa?.smtp_host) return;
            const pdfBuffer = await generarPdfRetencion(ret, empresa);
            const numero = (ret.numero_comprobante ?? `ret-${id}`).replace(/\//g, '-');
            await enviarDocumentoPorCorreo(empresa, {
              correoDestino,
              destinatarioNombre: ret.prov_razon_social ?? 'Proveedor',
              tipoDocumento: 'RETENCIÓN ELECTRÓNICA',
              numeroComprobante: ret.numero_comprobante ?? '',
              pdfBuffer,
              pdfNombre: `${numero}.pdf`,
              xmlContent: ret.xml_autorizado ?? ret.xml_generado ?? null,
              xmlNombre: `${numero}.xml`,
            });
          } catch (e) { console.error('[auto-correo retencion]', e); }
        })();
      }
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

  async enviarCorreo(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params['id']);
      const empresaId = req.usuario!.empresaId;

      const ret = await RetencioneModel.findByIdConDetalles(id);
      if (!ret || ret.id_empresa !== empresaId) {
        res.status(404).json({ success: false, message: 'Retención no encontrada.' });
        return;
      }

      if (ret.estado !== 'AUTORIZADO') {
        res.status(400).json({ success: false, message: 'Solo se puede enviar por correo una retención AUTORIZADA.' });
        return;
      }

      const correoDestino: string = (req.body as any)['correo_destino'] ?? '';
      if (!correoDestino) {
        res.status(400).json({ success: false, message: 'Se requiere correo_destino en el cuerpo de la solicitud.' });
        return;
      }

      const empresa = await EmpresaModel.findById(empresaId);
      if (!empresa) {
        res.status(404).json({ success: false, message: 'Empresa no encontrada.' });
        return;
      }

      const pdfBuffer = await generarPdfRetencion(ret, empresa);
      const numero = (ret.numero_comprobante ?? `ret-${id}`).replace(/\//g, '-');
      const xmlContent = ret.xml_autorizado ?? ret.xml_generado ?? null;

      await enviarDocumentoPorCorreo(empresa, {
        correoDestino,
        destinatarioNombre: ret.prov_razon_social ?? 'Proveedor',
        tipoDocumento: 'RETENCIÓN ELECTRÓNICA',
        numeroComprobante: ret.numero_comprobante ?? '',
        pdfBuffer,
        pdfNombre: `${numero}.pdf`,
        xmlContent,
        xmlNombre: `${numero}.xml`,
      });

      res.status(200).json({ success: true, message: `Retención enviada correctamente a ${correoDestino}.` });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
};
