import cron from 'node-cron';
import { RecurrenteModel } from '../models/recurrentes.model';
import { generarFacturaDesdeRecurrente } from '../services/recurrentes.service';

async function procesarRecurrentes(): Promise<void> {
  const pendientes = await RecurrenteModel.findPendientes();

  if (pendientes.length === 0) return;

  console.log(`[Recurrentes] Procesando ${pendientes.length} recurrente(s)...`);

  for (const recurrente of pendientes) {
    try {
      const resultado = await generarFacturaDesdeRecurrente(recurrente.id);
      console.log(`[Recurrentes] ✓ Factura ${resultado.numero} generada (recurrente ID ${recurrente.id})`);
    } catch (error: any) {
      console.error(`[Recurrentes] ✗ Error en recurrente ID ${recurrente.id}: ${error.message}`);
    }
  }
}

export function iniciarCronRecurrentes(): void {
  // Corre todos los días a las 6:00 AM
  cron.schedule('0 6 * * *', () => {
    procesarRecurrentes().catch((err) => {
      console.error('[Recurrentes] Error inesperado en el cron:', err);
    });
  });

  console.log('[Recurrentes] Cron job iniciado — se ejecuta diariamente a las 6:00 AM');
}
