import { Request, Response } from 'express';
import { EmpresaService } from '../services/empresas.service';
import { uploadLogo } from '../middlewares/upload.middleware';
import { EmpresaModel } from '../models/empresas.model';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

function eliminarArchivo(filePath: string): void {
  const absoluta = path.join(__dirname, '../../', filePath);
  if (fs.existsSync(absoluta)) {
    fs.unlinkSync(absoluta);
  }
}

export const EmpresaController = {
  async obtener(req: Request, res: Response): Promise<void> {
    try {
      const empresaId = req.usuario!.empresaId;
      const empresa = await EmpresaService.obtener(empresaId);
      res.status(200).json({ success: true, data: empresa });
    } catch (error: any) {
      res.status(404).json({ success: false, message: error.message });
    }
  },

  editar(req: Request, res: Response): void {
    const { rol, empresaId } = req.usuario!;

    if (rol !== 1) {
      res.status(403).json({ success: false, message: 'Solo el administrador puede editar la empresa.' });
      return;
    }

    uploadLogo(req, res, async (err) => {
      if (err) {
        const mensaje = err instanceof multer.MulterError && err.code === 'LIMIT_UNEXPECTED_FILE'
          ? 'El campo del archivo debe llamarse "logo".'
          : err.message;
        res.status(400).json({ success: false, message: mensaje });
        return;
      }

      const nuevoArchivo = req.file ? `/uploads/logos/${req.file.filename}` : null;

      try {
        const body: Record<string, unknown> = { ...req.body };

        if (nuevoArchivo) {
          // Obtener logo anterior para eliminarlo si la actualización es exitosa
          const logoAnterior = await EmpresaModel.getLogoUrl(empresaId);
          body['logo_url'] = nuevoArchivo;

          const empresa = await EmpresaService.editar(empresaId, body);

          // Eliminar logo anterior solo si la actualización fue exitosa
          if (logoAnterior) eliminarArchivo(logoAnterior);

          res.status(200).json({ success: true, data: empresa });
        } else {
          const empresa = await EmpresaService.editar(empresaId, body);
          res.status(200).json({ success: true, data: empresa });
        }
      } catch (error: any) {
        // Si falló la validación/guardado, eliminar el archivo recién subido
        if (nuevoArchivo) eliminarArchivo(nuevoArchivo);
        res.status(400).json({ success: false, message: error.message });
      }
    });
  },
};
