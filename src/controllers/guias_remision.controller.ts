import { Request, Response } from 'express';
import { GuiaRemisionService } from '../services/guias_remision.service';
import { GuiaRemisionModel } from '../models/guias_remision.model';
import { EmpresaModel } from '../models/empresas.model';
import { generarPdfGuiaRemision } from '../utils/pdf-guia-remision';
import { enviarDocumentoPorCorreo } from '../utils/email.service';
import { ClienteModel } from '../models/clientes.model';

export const GuiaRemisionController = {
  async listar(req: Request, res: Response): Promise<void> {
    try {
      const query = req.query as Record<string, string | undefined>;
      const data = await GuiaRemisionService.listar(req.usuario!.empresaId, query);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async verDetalle(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params['id']);
      const data = await GuiaRemisionService.verDetalle(id, req.usuario!.empresaId);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(404).json({ success: false, message: error.message });
    }
  },

  async crear(req: Request, res: Response): Promise<void> {
    try {
      const data = await GuiaRemisionService.crear(
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
      const data = await GuiaRemisionService.editar(
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
      const data = await GuiaRemisionService.eliminar(id, req.usuario!.empresaId);
      res.status(200).json({ success: true, ...data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async emitir(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params['id']);
      const empresaId = req.usuario!.empresaId;
      const data = await GuiaRemisionService.emitir(id, empresaId);
      res.status(200).json({ success: true, data });

      if (data && data.estado === 'AUTORIZADO') {
        (async () => {
          try {
            const gr = await GuiaRemisionModel.findByIdConDetalles(id);
            if (!gr) return;
            const correoDestino = gr.id_cliente ? (await ClienteModel.findById(gr.id_cliente))?.email ?? null : null;
            if (!correoDestino) return;
            const empresa = await EmpresaModel.findById(empresaId);
            if (!empresa?.smtp_host) return;
            const pdfBuffer = await generarPdfGuiaRemision(gr, empresa);
            const numero = (gr.numero_comprobante ?? `gr-${id}`).replace(/\//g, '-');
            await enviarDocumentoPorCorreo(empresa, {
              correoDestino,
              destinatarioNombre: gr.dest_razon_social ?? gr.razon_social_transportista ?? 'Destinatario',
              tipoDocumento: 'GUÍA DE REMISIÓN ELECTRÓNICA',
              numeroComprobante: gr.numero_comprobante ?? '',
              pdfBuffer,
              pdfNombre: `${numero}.pdf`,
              xmlContent: gr.xml_autorizado ?? gr.xml_generado ?? null,
              xmlNombre: `${numero}.xml`,
            });
          } catch (e) { console.error('[auto-correo guia-remision]', e); }
        })();
      }
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async cambiarEstado(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params['id']);
      const data = await GuiaRemisionService.cambiarEstado(
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

      const gr = await GuiaRemisionModel.findByIdConDetalles(id);
      if (!gr || gr.id_empresa !== empresaId) {
        res.status(404).json({ success: false, message: 'Guía de remisión no encontrada.' });
        return;
      }

      const empresa = await EmpresaModel.findById(empresaId);
      if (!empresa) {
        res.status(404).json({ success: false, message: 'Empresa no encontrada.' });
        return;
      }

      const buffer = await generarPdfGuiaRemision(gr, empresa);
      const numero = (gr.numero_comprobante ?? `gr-${id}`).replace(/\//g, '-');

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

      const gr = await GuiaRemisionModel.findByIdConDetalles(id);
      if (!gr || gr.id_empresa !== empresaId) {
        res.status(404).json({ success: false, message: 'Guía de remisión no encontrada.' });
        return;
      }

      if (gr.estado !== 'AUTORIZADO') {
        res.status(400).json({ success: false, message: 'Solo se puede enviar por correo una guía de remisión AUTORIZADA.' });
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

      const pdfBuffer = await generarPdfGuiaRemision(gr, empresa);
      const numero = (gr.numero_comprobante ?? `gr-${id}`).replace(/\//g, '-');
      const xmlContent = gr.xml_autorizado ?? gr.xml_generado ?? null;

      await enviarDocumentoPorCorreo(empresa, {
        correoDestino,
        destinatarioNombre: gr.dest_razon_social ?? gr.razon_social_transportista ?? 'Destinatario',
        tipoDocumento: 'GUÍA DE REMISIÓN ELECTRÓNICA',
        numeroComprobante: gr.numero_comprobante ?? '',
        pdfBuffer,
        pdfNombre: `${numero}.pdf`,
        xmlContent,
        xmlNombre: `${numero}.xml`,
      });

      res.status(200).json({ success: true, message: `Guía de remisión enviada correctamente a ${correoDestino}.` });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
};
