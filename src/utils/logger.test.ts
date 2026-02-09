/**
 * Tests unitarios para Logger
 * Valida formateo, contexto, sanitización y manejo de errores
 */

import { logger, LogContext, LogLevel } from './logger';

describe('Logger Utility', () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleDebugSpy: jest.SpyInstance;

  beforeEach(() => {
    // Capturar llamadas a console
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();
    
    // Resetear nivel a INFO para cada test
    logger.setLevel(LogLevel.INFO);
  });

  afterEach(() => {
    // Restaurar console
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleDebugSpy.mockRestore();
  });

  describe('Formateo de mensajes', () => {
    test('formatea mensajes correctamente con timestamp', () => {
      logger.info('Test message');
      
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const loggedMessage = consoleLogSpy.mock.calls[0][0];
      
      // Verificar formato: [timestamp] [level] message
      expect(loggedMessage).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[INFO\] Test message/);
    });

    test('incluye contexto en los mensajes', () => {
      const context: LogContext = {
        userId: 123,
        username: 'testuser',
        action: 'login',
        details: { ip: '127.0.0.1' }
      };

      logger.info('User action', context);
      
      const loggedMessage = consoleLogSpy.mock.calls[0][0];
      
      // Verificar que el contexto está presente
      expect(loggedMessage).toContain('Context:');
      expect(loggedMessage).toContain('"userId": 123');
      expect(loggedMessage).toContain('"username": "testuser"');
      expect(loggedMessage).toContain('"action": "login"');
      expect(loggedMessage).toContain('"ip": "127.0.0.1"');
    });

    test('maneja mensajes sin contexto', () => {
      logger.info('Simple message');
      
      const loggedMessage = consoleLogSpy.mock.calls[0][0];
      
      // No debe incluir "Context:" si no hay contexto
      expect(loggedMessage).not.toContain('Context:');
      expect(loggedMessage).toContain('Simple message');
    });
  });

  describe('Sanitización de contraseñas', () => {
    test('no incluye contraseñas en logs', () => {
      const context: LogContext = {
        action: 'login',
        details: {
          username: 'testuser',
          password: 'secretPassword123'
        }
      };

      logger.info('Login attempt', context);
      
      const loggedMessage = consoleLogSpy.mock.calls[0][0];
      
      // Verificar que la contraseña fue sanitizada
      expect(loggedMessage).not.toContain('secretPassword123');
      expect(loggedMessage).toContain('[REDACTED]');
      expect(loggedMessage).toContain('"username": "testuser"');
    });

    test('sanitiza múltiples campos sensibles', () => {
      const context: LogContext = {
        action: 'auth',
        details: {
          password: 'pass123',
          token: 'abc123token',
          apiKey: 'key456',
          username: 'user'
        }
      };

      logger.info('Auth attempt', context);
      
      const loggedMessage = consoleLogSpy.mock.calls[0][0];
      
      // Verificar que todos los campos sensibles fueron sanitizados
      expect(loggedMessage).not.toContain('pass123');
      expect(loggedMessage).not.toContain('abc123token');
      expect(loggedMessage).not.toContain('key456');
      expect(loggedMessage).toContain('[REDACTED]');
      expect(loggedMessage).toContain('"username": "user"');
    });

    test('sanitiza objetos anidados', () => {
      const context: LogContext = {
        action: 'update',
        details: {
          user: {
            name: 'John',
            credentials: {
              password: 'secret',
              token: 'token123'
            }
          }
        }
      };

      logger.info('Update user', context);
      
      const loggedMessage = consoleLogSpy.mock.calls[0][0];
      
      // Verificar sanitización en objetos anidados
      expect(loggedMessage).not.toContain('secret');
      expect(loggedMessage).not.toContain('token123');
      expect(loggedMessage).toContain('[REDACTED]');
      expect(loggedMessage).toContain('"name": "John"');
    });

    test('sanitiza arrays con objetos sensibles', () => {
      const context: LogContext = {
        action: 'batch_update',
        details: {
          users: [
            { name: 'User1', password: 'pass1' },
            { name: 'User2', password: 'pass2' }
          ]
        }
      };

      logger.info('Batch update', context);
      
      const loggedMessage = consoleLogSpy.mock.calls[0][0];
      
      // Verificar sanitización en arrays
      expect(loggedMessage).not.toContain('pass1');
      expect(loggedMessage).not.toContain('pass2');
      expect(loggedMessage).toContain('[REDACTED]');
    });
  });

  describe('Niveles de log', () => {
    test('respeta nivel INFO', () => {
      logger.setLevel(LogLevel.INFO);
      
      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warn message');
      logger.error('Error message', new Error('test'));
      
      // DEBUG no debe aparecer, los demás sí
      expect(consoleDebugSpy).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });

    test('respeta nivel WARN', () => {
      logger.setLevel(LogLevel.WARN);
      
      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warn message');
      logger.error('Error message', new Error('test'));
      
      // Solo WARN y ERROR deben aparecer
      expect(consoleDebugSpy).not.toHaveBeenCalled();
      expect(consoleLogSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });

    test('respeta nivel DEBUG', () => {
      logger.setLevel(LogLevel.DEBUG);
      
      logger.debug('Debug message');
      logger.info('Info message');
      
      // Todos deben aparecer
      expect(consoleDebugSpy).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    });

    test('acepta nivel como string', () => {
      logger.setLevel('debug');
      
      logger.debug('Debug message');
      
      expect(consoleDebugSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Manejo de errores', () => {
    test('incluye stack trace en logs de error', () => {
      const error = new Error('Test error');
      
      logger.error('An error occurred', error);
      
      const loggedMessage = consoleErrorSpy.mock.calls[0][0];
      
      expect(loggedMessage).toContain('Test error');
      expect(loggedMessage).toContain('errorStack');
    });

    test('maneja errores sin contexto', () => {
      const error = new Error('Simple error');
      
      logger.error('Error without context', error);
      
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const loggedMessage = consoleErrorSpy.mock.calls[0][0];
      expect(loggedMessage).toContain('Simple error');
    });

    test('combina contexto con información de error', () => {
      const error = new Error('Auth error');
      const context: LogContext = {
        userId: 456,
        action: 'login'
      };
      
      logger.error('Login failed', error, context);
      
      const loggedMessage = consoleErrorSpy.mock.calls[0][0];
      
      expect(loggedMessage).toContain('Auth error');
      expect(loggedMessage).toContain('"userId": 456');
      expect(loggedMessage).toContain('"action": "login"');
    });
  });

  describe('Diferentes métodos de log', () => {
    test('info usa console.log', () => {
      logger.info('Info message');
      
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    test('warn usa console.warn', () => {
      logger.warn('Warning message');
      
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    test('error usa console.error', () => {
      logger.error('Error message', new Error('test'));
      
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    test('debug usa console.debug', () => {
      logger.setLevel(LogLevel.DEBUG);
      logger.debug('Debug message');
      
      expect(consoleDebugSpy).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });
});
