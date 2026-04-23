export function validarCedula(cedula: string): boolean {
  if (!/^\d{10}$/.test(cedula)) return false;

  const provincia = Number(cedula.slice(0, 2));
  if (provincia < 1 || provincia > 24) return false;

  const tercerDigito = Number(cedula[2]);
  if (tercerDigito >= 6) return false;

  const coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2];
  const digitos = cedula.split('').map(Number);

  const suma = coeficientes.reduce((acc, coef, i) => {
    let resultado = coef * digitos[i]!;
    if (resultado >= 10) resultado -= 9;
    return acc + resultado;
  }, 0);

  const digitoVerificador = suma % 10 === 0 ? 0 : 10 - (suma % 10);
  return digitoVerificador === digitos[9];
}

export function validarRuc(ruc: string): boolean {
  if (!/^\d{13}$/.test(ruc)) return false;

  const provincia = Number(ruc.slice(0, 2));
  if (provincia < 1 || provincia > 24) return false;

  const tercerDigito = Number(ruc[2]);
  const sufijo = ruc.slice(10);

  // Persona natural (tercer dígito 0-5)
  if (tercerDigito >= 0 && tercerDigito <= 5) {
    if (Number(sufijo) === 0) return false;
    return validarCedula(ruc.slice(0, 10));
  }

  // Entidad pública (tercer dígito = 6)
  if (tercerDigito === 6) {
    if (sufijo !== '0001') return false;
    const coeficientes = [3, 2, 7, 6, 5, 4, 3, 2];
    const digitos = ruc.split('').map(Number);
    const suma = coeficientes.reduce((acc, coef, i) => acc + coef * digitos[i]!, 0);
    const residuo = suma % 11;
    const digitoVerificador = residuo === 0 ? 0 : 11 - residuo;
    return digitoVerificador === digitos[8];
  }

  // Persona jurídica (tercer dígito = 9)
  if (tercerDigito === 9) {
    if (Number(sufijo) === 0) return false;
    const coeficientes = [4, 3, 2, 7, 6, 5, 4, 3, 2];
    const digitos = ruc.split('').map(Number);
    const suma = coeficientes.reduce((acc, coef, i) => acc + coef * digitos[i]!, 0);
    const residuo = suma % 11;
    const digitoVerificador = residuo === 0 ? 0 : 11 - residuo;
    return digitoVerificador === digitos[9];
  }

  return false;
}

export function validarTelefono(telefono: string): boolean {
  return /^\d{10}$/.test(telefono);
}

export function validarEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validarPassword(password: string): { valido: boolean; mensaje: string } {
  if (password.length < 8) {
    return { valido: false, mensaje: 'La contraseña debe tener al menos 8 caracteres.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valido: false, mensaje: 'La contraseña debe contener al menos una letra mayúscula.' };
  }
  if (!/[a-z]/.test(password)) {
    return { valido: false, mensaje: 'La contraseña debe contener al menos una letra minúscula.' };
  }
  if (!/[0-9]/.test(password)) {
    return { valido: false, mensaje: 'La contraseña debe contener al menos un número.' };
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { valido: false, mensaje: 'La contraseña debe contener al menos un carácter especial (!@#$%^&*...).' };
  }
  return { valido: true, mensaje: 'Contraseña válida.' };
}
