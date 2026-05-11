import { Request, Response } from 'express';
import { FacturaService } from '../services/facturas.service';
import { FacturaModel } from '../models/facturas.model';
import { EmpresaModel } from '../models/empresas.model';
import { generarPdfFactura } from '../utils/pdf-factura';
import { generarPdfRecibo } from '../utils/pdf-recibo';
import { enviarDocumentoPorCorreo } from '../utils/email.service';

export const FacturaController = {
  async listar(req: Request, res: Response): Promise<void> {
    try {
      const query = req.query as Record<string, string | undefined>;
      const data = await FacturaService.listar(req.usuario!.empresaId, query);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async verDetalle(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params['id']);
      const data = await FacturaService.verDetalle(id, req.usuario!.empresaId);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(404).json({ success: false, message: error.message });
    }
  },

  async crear(req: Request, res: Response): Promise<void> {
    try {
      const data = await FacturaService.crear(
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
      const data = await FacturaService.editar(
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
      const data = await FacturaService.eliminar(id, req.usuario!.empresaId);
      res.status(200).json({ success: true, ...data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async cambiarEstado(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params['id']);
      const data = await FacturaService.cambiarEstado(
        id,
        req.usuario!.empresaId,
        (req.body ?? {}) as Record<string, unknown>
      );
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async emitir(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params['id']);
      const empresaId = req.usuario!.empresaId;
      const data = await FacturaService.emitir(id, empresaId);
      res.status(200).json({ success: true, data });

      if (data && data.estado === 'AUTORIZADO') {
        (async () => {
          try {
            const factura = await FacturaModel.findByIdConDetalles(id);
            const correoDestino = factura?.cli_email;
            if (!factura || !correoDestino) return;
            const empresa = await EmpresaModel.findById(empresaId);
            if (!empresa?.smtp_host) return;
            const pdfBuffer = await generarPdfFactura(factura, empresa);
            const numero = (factura.numero_comprobante ?? `factura-${id}`).replace(/\//g, '-');
            await enviarDocumentoPorCorreo(empresa, {
              correoDestino,
              destinatarioNombre: factura.cli_razon_social ?? 'Cliente',
              tipoDocumento: 'FACTURA ELECTRÓNICA',
              numeroComprobante: factura.numero_comprobante ?? '',
              pdfBuffer,
              pdfNombre: `${numero}.pdf`,
              xmlContent: factura.xml_autorizado ?? factura.xml_generado ?? null,
              xmlNombre: `${numero}.xml`,
            });
          } catch (e) { console.error('[auto-correo factura]', e); }
        })();
      }
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async generarPDF(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params['id']);
      const empresaId = req.usuario!.empresaId;

      const factura = await FacturaModel.findByIdConDetalles(id);
      if (!factura || factura.id_empresa !== empresaId) {
        res.status(404).json({ success: false, message: 'Factura no encontrada.' });
        return;
      }

      const empresa = await EmpresaModel.findById(empresaId);
      if (!empresa) {
        res.status(404).json({ success: false, message: 'Empresa no encontrada.' });
        return;
      }

      const buffer = await generarPdfFactura(factura, empresa);
      const numero = (factura.numero_comprobante ?? `factura-${id}`).replace(/\//g, '-');

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

      const factura = await FacturaModel.findByIdConDetalles(id);
      if (!factura || factura.id_empresa !== empresaId) {
        res.status(404).json({ success: false, message: 'Factura no encontrada.' });
        return;
      }

      const empresa = await EmpresaModel.findById(empresaId);
      if (!empresa) {
        res.status(404).json({ success: false, message: 'Empresa no encontrada.' });
        return;
      }

      const buffer = await generarPdfRecibo(factura, empresa);
      const numero = (factura.numero_comprobante ?? `recibo-${id}`).replace(/\//g, '-');

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="recibo-${numero}.pdf"`);
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

      const factura = await FacturaModel.findByIdConDetalles(id);
      if (!factura || factura.id_empresa !== empresaId) {
        res.status(404).json({ success: false, message: 'Factura no encontrada.' });
        return;
      }

      if (factura.estado !== 'AUTORIZADO') {
        res.status(400).json({ success: false, message: 'Solo se puede enviar por correo una factura AUTORIZADA.' });
        return;
      }

      const correoDestino: string = (req.body as any)['correo_destino'] ?? factura.cli_email ?? '';
      if (!correoDestino) {
        res.status(400).json({ success: false, message: 'Se requiere correo_destino en el cuerpo o el cliente debe tener email registrado.' });
        return;
      }

      const empresa = await EmpresaModel.findById(empresaId);
      if (!empresa) {
        res.status(404).json({ success: false, message: 'Empresa no encontrada.' });
        return;
      }

      const pdfBuffer = await generarPdfFactura(factura, empresa);
      const numero = (factura.numero_comprobante ?? `factura-${id}`).replace(/\//g, '-');
      const xmlContent = factura.xml_autorizado ?? factura.xml_generado ?? null;

      await enviarDocumentoPorCorreo(empresa, {
        correoDestino,
        destinatarioNombre: factura.cli_razon_social ?? 'Cliente',
        tipoDocumento: 'FACTURA ELECTRÓNICA',
        numeroComprobante: factura.numero_comprobante ?? '',
        pdfBuffer,
        pdfNombre: `${numero}.pdf`,
        xmlContent,
        xmlNombre: `${numero}.xml`,
      });

      res.status(200).json({ success: true, message: `Factura enviada correctamente a ${correoDestino}.` });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
};
