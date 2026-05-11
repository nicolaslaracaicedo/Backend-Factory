import { Request, Response } from 'express';
import { DashboardService } from '../services/dashboard.service';

export const DashboardController = {
  async obtener(req: Request, res: Response): Promise<void> {
    try {
      const data = await DashboardService.obtener(req.usuario!.empresaId);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
};
