import multer from 'multer';
import path from 'path';
import type { Request } from 'express';

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(__dirname, '../../uploads/logos'));
  },
  filename: (req: Request, _file, cb) => {
    const empresaId = req.usuario?.empresaId ?? 'unknown';
    const ext = path.extname(_file.originalname);
    cb(null, `empresa_${empresaId}_${Date.now()}${ext}`);
  },
});

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.svg'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten imágenes (.jpg, .jpeg, .png, .webp, .svg)'));
  }
};

export const uploadLogo = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
}).single('logo');
