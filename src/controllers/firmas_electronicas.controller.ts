import { Request, Response } from 'express';
import multer from 'multer';
import { FirmaService } from '../services/firmas_electronicas.service';

const uploadP12 = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    const ext = file.originalname.toLowerCase();
    if (ext.endsWith('.p12') || ext.endsWith('.pfx')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos .p12 o .pfx'));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 },
}).single('firma');

function soloAdmin(req: Request, res: Response): boolean {
  if (req.usuario!.rol !== 1) {
    res.status(403).json({ success: false, message: 'Solo el administrador puede gestionar la firma electrónica.' });
    return false;
  }
  return true;
}

export const FirmaController = {
  async listar(req: Request, res: Response): Promise<void> {
    try {
      const result = await FirmaService.listar(req.usuario!.empresaId);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async verDetalle(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params['id']);
      const result = await FirmaService.verDetalle(id, req.usuario!.empresaId);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(404).json({ success: false, message: error.message });
    }
  },

  subir(req: Request, res: Response): void {
    if (!soloAdmin(req, res)) return;

    uploadP12(req, res, async (err) => {
      if (err) {
        res.status(400).json({ success: false, message: err.message });
        return;
      }
      if (!req.file) {
        res.status(400).json({ success: false, message: 'Debes subir un archivo .p12 o .pfx.' });
        return;
      }
      try {
        const { password, nombre } = req.body as { password: string; nombre?: string };
        if (!password) {
          res.status(400).json({ success: false, message: 'La contraseña de la firma es requerida.' });
          return;
        }
        const result = await FirmaService.subir(req.usuario!.empresaId, req.file.buffer, password, nombre);
        res.status(201).json({ success: true, data: result });
      } catch (error: any) {
        res.status(400).json({ success: false, message: error.message });
      }
    });
  },

  async verActiva(req: Request, res: Response): Promise<void> {
    try {
      const empresaId = Number(req.params['id']);
      const result = await FirmaService.verActiva(empresaId);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(404).json({ success: false, message: error.message });
    }
  },

  reemplazar(req: Request, res: Response): void {
    if (!soloAdmin(req, res)) return;

    uploadP12(req, res, async (err) => {
      if (err) {
        res.status(400).json({ success: false, message: err.message });
        return;
      }
      if (!req.file) {
        res.status(400).json({ success: false, message: 'Debes subir un archivo .p12 o .pfx.' });
        return;
      }
      try {
        const id = Number(req.params['id']);
        const { password, nombre } = req.body as { password: string; nombre?: string };
        if (!password) {
          res.status(400).json({ success: false, message: 'La contraseña de la firma es requerida.' });
          return;
        }
        const result = await FirmaService.reemplazar(id, req.usuario!.empresaId, req.file.buffer, password, nombre);
        res.status(200).json({ success: true, data: result });
      } catch (error: any) {
        res.status(400).json({ success: false, message: error.message });
      }
    });
  },

  async activar(req: Request, res: Response): Promise<void> {
    if (!soloAdmin(req, res)) return;
    try {
      const id = Number(req.params['id']);
      const result = await FirmaService.activar(id, req.usuario!.empresaId);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },
};
