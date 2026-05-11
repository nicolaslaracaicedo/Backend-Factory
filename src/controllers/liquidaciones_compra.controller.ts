import { Request, Response } from 'express';
import { LiquidacionCompraService } from '../services/liquidaciones_compra.service';
import { LiquidacionCompraModel } from '../models/liquidaciones_compra.model';
import { EmpresaModel } from '../models/empresas.model';
import { generarPdfLiquidacionCompra } from '../utils/pdf-liquidacion-compra';
import { enviarDocumentoPorCorreo } from '../utils/email.service';
import { ProveedorModel } from '../models/proveedores.model';

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
      const empresaId = req.usuario!.empresaId;
      const data = await LiquidacionCompraService.emitir(id, empresaId);
      res.status(200).json({ success: true, data });

      if (data && data.estado === 'AUTORIZADO') {
        (async () => {
          try {
            const lc = await LiquidacionCompraModel.findByIdConDetalles(id);
            if (!lc) return;
            const proveedor = await ProveedorModel.findByIdentificacion(empresaId, lc.identificacion_prov);
            const correoDestino = proveedor?.email ?? null;
            if (!correoDestino) return;
            const empresa = await EmpresaModel.findById(empresaId);
            if (!empresa?.smtp_host) return;
            const pdfBuffer = await generarPdfLiquidacionCompra(lc, empresa);
            const numero = (lc.numero_comprobante ?? `lc-${id}`).replace(/\//g, '-');
            await enviarDocumentoPorCorreo(empresa, {
              correoDestino,
              destinatarioNombre: lc.razon_social_prov ?? 'Proveedor',
              tipoDocumento: 'LIQUIDACIÓN DE COMPRA ELECTRÓNICA',
              numeroComprobante: lc.numero_comprobante ?? '',
              pdfBuffer,
              pdfNombre: `${numero}.pdf`,
              xmlContent: lc.xml_autorizado ?? lc.xml_generado ?? null,
              xmlNombre: `${numero}.xml`,
            });
          } catch (e) { console.error('[auto-correo liquidacion-compra]', e); }
        })();
      }
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

  async generarPDF(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params['id']);
      const empresaId = req.usuario!.empresaId;

      const lc = await LiquidacionCompraModel.findByIdConDetalles(id);
      if (!lc || lc.id_empresa !== empresaId) {
        res.status(404).json({ success: false, message: 'Liquidación de compra no encontrada.' });
        return;
      }

      const empresa = await EmpresaModel.findById(empresaId);
      if (!empresa) {
        res.status(404).json({ success: false, message: 'Empresa no encontrada.' });
        return;
      }

      const buffer = await generarPdfLiquidacionCompra(lc, empresa);
      const numero = (lc.numero_comprobante ?? `lc-${id}`).replace(/\//g, '-');

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

      const lc = await LiquidacionCompraModel.findByIdConDetalles(id);
      if (!lc || lc.id_empresa !== empresaId) {
        res.status(404).json({ success: false, message: 'Liquidación de compra no encontrada.' });
        return;
      }

      if (lc.estado !== 'AUTORIZADO') {
        res.status(400).json({ success: false, message: 'Solo se puede enviar por correo una liquidación de compra AUTORIZADA.' });
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

      const pdfBuffer = await generarPdfLiquidacionCompra(lc, empresa);
      const numero = (lc.numero_comprobante ?? `lc-${id}`).replace(/\//g, '-');
      const xmlContent = lc.xml_autorizado ?? lc.xml_generado ?? null;

      await enviarDocumentoPorCorreo(empresa, {
        correoDestino,
        destinatarioNombre: lc.razon_social_prov ?? 'Proveedor',
        tipoDocumento: 'LIQUIDACIÓN DE COMPRA ELECTRÓNICA',
        numeroComprobante: lc.numero_comprobante ?? '',
        pdfBuffer,
        pdfNombre: `${numero}.pdf`,
        xmlContent,
        xmlNombre: `${numero}.xml`,
      });

      res.status(200).json({ success: true, message: `Liquidación de compra enviada correctamente a ${correoDestino}.` });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
};
