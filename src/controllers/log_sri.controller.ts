import { Request, Response } from 'express';
import { LogSriService } from '../services/log_sri.service';

export const LogSriController = {
  async listar(req: Request, res: Response): Promise<void> {
    try {
      const empresaId = req.usuario!.empresaId;
      const data = await LogSriService.listar(empresaId, req.query as Record<string, string | undefined>);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async verDetalle(req: Request, res: Response): Promise<void> {
    try {
      const empresaId = req.usuario!.empresaId;
      const id = Number(req.params['id']);
      if (isNaN(id)) {
        res.status(400).json({ success: false, message: 'ID inválido.' });
        return;
      }
      const data = await LogSriService.verDetalle(id, empresaId);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(404).json({ success: false, message: error.message });
    }
  },
};
