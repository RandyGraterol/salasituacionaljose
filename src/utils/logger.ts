/**
 * Logger Utility - Sistema de logging centralizado
 * Proporciona logging estructurado con niveles, timestamps y sanitización de datos sensibles
 */

export interface LogContext {
  userId?: number;
  username?: string;
  email?: string;
  action: string;
  details?: any;
}

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

class Logger {
  private currentLevel: LogLevel = LogLevel.INFO;
  private sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'accessToken'];

  /**
   * Configura el nivel de logging
   */
  setLevel(level: LogLevel | string): void {
    if (typeof level === 'string') {
      const levelMap: { [key: string]: LogLevel } = {
        'debug': LogLevel.DEBUG,
        'info': LogLevel.INFO,
        'warn': LogLevel.WARN,
        'error': LogLevel.ERROR
      };
      this.currentLevel = levelMap[level.toLowerCase()] ?? LogLevel.INFO;
    } else {
      this.currentLevel = level;
    }
  }

  /**
   * Log de nivel INFO - para eventos normales del sistema
   */
  info(message: string, context?: LogContext): void {
    if (this.currentLevel <= LogLevel.INFO) {
      this.log('INFO', message, context);
    }
  }

  /**
   * Log de nivel WARN - para situaciones que requieren atención
   */
  warn(message: string, context?: LogContext): void {
    if (this.currentLevel <= LogLevel.WARN) {
      this.log('WARN', message, context);
    }
  }

  /**
   * Log de nivel ERROR - para errores y excepciones
   */
  error(message: string, error: Error, context?: LogContext): void {
    if (this.currentLevel <= LogLevel.ERROR) {
      const errorContext: LogContext = {
        action: context?.action || 'error',
        userId: context?.userId,
        username: context?.username,
        details: {
          ...context?.details,
          errorMessage: error.message,
          errorStack: error.stack
        }
      };
      this.log('ERROR', message, errorContext);
    }
  }

  /**
   * Log de nivel DEBUG - para información detallada de debugging
   */
  debug(message: string, context?: LogContext): void {
    if (this.currentLevel <= LogLevel.DEBUG) {
      this.log('DEBUG', message, context);
    }
  }

  /**
   * Método privado que formatea y escribe el log
   */
  private log(level: string, message: string, context?: LogContext): void {
    const timestamp = new Date().toISOString();
    const sanitizedContext = context ? this.sanitizeContext(context) : undefined;
    
    let logMessage = `[${timestamp}] [${level}] ${message}`;
    
    if (sanitizedContext) {
      const contextStr = JSON.stringify(sanitizedContext, null, 2);
      logMessage += `\n  Context: ${contextStr}`;
    }

    // Usar console apropiado según nivel
    switch (level) {
      case 'ERROR':
        console.error(logMessage);
        break;
      case 'WARN':
        console.warn(logMessage);
        break;
      case 'DEBUG':
        console.debug(logMessage);
        break;
      default:
        console.log(logMessage);
    }
  }

  /**
   * Sanitiza el contexto removiendo datos sensibles
   */
  private sanitizeContext(context: LogContext): LogContext {
    const sanitized = { ...context };

    // Sanitizar details si existe
    if (sanitized.details && typeof sanitized.details === 'object') {
      sanitized.details = this.sanitizeObject(sanitized.details);
    }

    return sanitized;
  }

  /**
   * Sanitiza un objeto recursivamente
   */
  private sanitizeObject(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    if (typeof obj === 'object') {
      const sanitized: any = {};
      
      for (const [key, value] of Object.entries(obj)) {
        // Si el campo es sensible, reemplazar con [REDACTED]
        if (this.isSensitiveField(key)) {
          sanitized[key] = '[REDACTED]';
        } else if (typeof value === 'object') {
          // Recursivamente sanitizar objetos anidados
          sanitized[key] = this.sanitizeObject(value);
        } else {
          sanitized[key] = value;
        }
      }
      
      return sanitized;
    }

    return obj;
  }

  /**
   * Verifica si un campo es sensible
   */
  private isSensitiveField(fieldName: string): boolean {
    const lowerFieldName = fieldName.toLowerCase();
    return this.sensitiveFields.some(sensitive => 
      lowerFieldName.includes(sensitive.toLowerCase())
    );
  }
}

// Exportar instancia singleton
export const logger = new Logger();

// Configurar nivel según entorno
if (process.env.NODE_ENV === 'development') {
  logger.setLevel(LogLevel.DEBUG);
} else if (process.env.LOG_LEVEL) {
  logger.setLevel(process.env.LOG_LEVEL);
}
