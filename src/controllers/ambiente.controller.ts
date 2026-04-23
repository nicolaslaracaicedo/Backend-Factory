import { Request, Response } from 'express';
import { AmbienteModel } from '../models/ambiente.model';

export const AmbienteController = {
  async listar(_req: Request, res: Response): Promise<void> {
    try {
      const data = await AmbienteModel.findAll();
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
};
