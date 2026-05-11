import { Request, Response } from 'express';
import { NotaCreditoService } from '../services/notas_credito.service';
import { NotaCreditoModel } from '../models/notas_credito.model';
import { EmpresaModel } from '../models/empresas.model';
import { generarPdfNotaCredito } from '../utils/pdf-nota-credito';
import { generarReciboNotaCredito } from '../utils/pdf-recibo-nota-credito';
import { enviarDocumentoPorCorreo } from '../utils/email.service';
import { ClienteModel } from '../models/clientes.model';

export const NotaCreditoController = {
  async listar(req: Request, res: Response): Promise<void> {
    try {
      const query = req.query as Record<string, string | undefined>;
      const data = await NotaCreditoService.listar(req.usuario!.empresaId, query);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async verDetalle(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params['id']);
      const data = await NotaCreditoService.verDetalle(id, req.usuario!.empresaId);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(404).json({ success: false, message: error.message });
    }
  },

  async crear(req: Request, res: Response): Promise<void> {
    try {
      const data = await NotaCreditoService.crear(
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
      const data = await NotaCreditoService.editar(
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
      const data = await NotaCreditoService.eliminar(id, req.usuario!.empresaId);
      res.status(200).json({ success: true, ...data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async emitir(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params['id']);
      const empresaId = req.usuario!.empresaId;
      const data = await NotaCreditoService.emitir(id, empresaId);
      res.status(200).json({ success: true, data });

      if (data && data.estado === 'AUTORIZADO') {
        (async () => {
          try {
            const nc = await NotaCreditoModel.findByIdConDetalles(id);
            if (!nc) return;
            const correoDestino = nc.id_cliente ? (await ClienteModel.findById(nc.id_cliente))?.email ?? null : null;
            if (!correoDestino) return;
            const empresa = await EmpresaModel.findById(empresaId);
            if (!empresa?.smtp_host) return;
            const pdfBuffer = await generarPdfNotaCredito(nc, empresa);
            const numero = (nc.numero_comprobante ?? `nc-${id}`).replace(/\//g, '-');
            await enviarDocumentoPorCorreo(empresa, {
              correoDestino,
              destinatarioNombre: nc.cli_razon_social ?? 'Cliente',
              tipoDocumento: 'NOTA DE CRÉDITO ELECTRÓNICA',
              numeroComprobante: nc.numero_comprobante ?? '',
              pdfBuffer,
              pdfNombre: `${numero}.pdf`,
              xmlContent: nc.xml_autorizado ?? nc.xml_generado ?? null,
              xmlNombre: `${numero}.xml`,
            });
          } catch (e) { console.error('[auto-correo nota-credito]', e); }
        })();
      }
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async cambiarEstado(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params['id']);
      const data = await NotaCreditoService.cambiarEstado(
        id,
        req.usuario!.empresaId,
        (req.body ?? {}) as Record<string, unknown>
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

      const nc = await NotaCreditoModel.findByIdConDetalles(id);
      if (!nc || nc.id_empresa !== empresaId) {
        res.status(404).json({ success: false, message: 'Nota de crédito no encontrada.' });
        return;
      }

      const empresa = await EmpresaModel.findById(empresaId);
      if (!empresa) {
        res.status(404).json({ success: false, message: 'Empresa no encontrada.' });
        return;
      }

      const buffer = await generarPdfNotaCredito(nc, empresa);
      const numero = (nc.numero_comprobante ?? `nc-${id}`).replace(/\//g, '-');

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

      const nc = await NotaCreditoModel.findByIdConDetalles(id);
      if (!nc || nc.id_empresa !== empresaId) {
        res.status(404).json({ success: false, message: 'Nota de crédito no encontrada.' });
        return;
      }

      const empresa = await EmpresaModel.findById(empresaId);
      if (!empresa) {
        res.status(404).json({ success: false, message: 'Empresa no encontrada.' });
        return;
      }

      const buffer = await generarReciboNotaCredito(nc, empresa);
      const numero = (nc.numero_comprobante ?? `nc-${id}`).replace(/\//g, '-');

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

      const nc = await NotaCreditoModel.findByIdConDetalles(id);
      if (!nc || nc.id_empresa !== empresaId) {
        res.status(404).json({ success: false, message: 'Nota de crédito no encontrada.' });
        return;
      }

      if (nc.estado !== 'AUTORIZADO') {
        res.status(400).json({ success: false, message: 'Solo se puede enviar por correo una nota de crédito AUTORIZADA.' });
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

      const pdfBuffer = await generarPdfNotaCredito(nc, empresa);
      const numero = (nc.numero_comprobante ?? `nc-${id}`).replace(/\//g, '-');
      const xmlContent = nc.xml_autorizado ?? nc.xml_generado ?? null;

      await enviarDocumentoPorCorreo(empresa, {
        correoDestino,
        destinatarioNombre: nc.cli_razon_social ?? 'Cliente',
        tipoDocumento: 'NOTA DE CRÉDITO ELECTRÓNICA',
        numeroComprobante: nc.numero_comprobante ?? '',
        pdfBuffer,
        pdfNombre: `${numero}.pdf`,
        xmlContent,
        xmlNombre: `${numero}.xml`,
      });

      res.status(200).json({ success: true, message: `Nota de crédito enviada correctamente a ${correoDestino}.` });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
};
