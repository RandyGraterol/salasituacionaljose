/**
 * Valida que un campo no esté vacío
 */
export const isNotEmpty = (value: any): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  return true;
};

/**
 * Valida formato de correo electrónico
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Valida que una fecha sea válida
 */
export const isValidDate = (date: any): boolean => {
  const parsedDate = new Date(date);
  return parsedDate instanceof Date && !isNaN(parsedDate.getTime());
};

/**
 * Valida que la fecha de inicio sea anterior o igual a la fecha de culminación
 */
export const isStartDateBeforeEndDate = (startDate: Date, endDate: Date): boolean => {
  return startDate <= endDate;
};

/**
 * Valida que todos los campos requeridos estén presentes
 */
export const validateRequiredFields = (fields: { [key: string]: any }): { valid: boolean; missing: string[] } => {
  const missing: string[] = [];
  
  for (const [key, value] of Object.entries(fields)) {
    if (!isNotEmpty(value)) {
      missing.push(key);
    }
  }
  
  return {
    valid: missing.length === 0,
    missing
  };
};

/**
 * Sanitiza una cadena de texto eliminando caracteres peligrosos
 */
export const sanitizeString = (str: string): string => {
  return str.trim().replace(/[<>]/g, '');
};
