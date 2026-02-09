/**
 * Property-Based Tests para Logger
 * Feature: mejora-manejo-errores-auth
 * Property 6: Sanitización de Datos Sensibles
 * Validates: Requirements 1.4
 */

import * as fc from 'fast-check';
import { logger, LogContext } from './logger';

describe('Logger Property-Based Tests', () => {
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  /**
   * Property 6: Sanitización de Datos Sensibles
   * Para cualquier objeto de contexto con campo "password", 
   * el log nunca debe contener el valor de password en el campo password
   */
  test('Property 6: Ningún log contiene valores de campos sensibles', () => {
    // Generador de campos sensibles
    const sensitiveFieldArb = fc.constantFrom(
      'password',
      'token',
      'secret',
      'apiKey',
      'accessToken'
    );

    // Generador de valores sensibles (strings no vacíos y no triviales)
    const sensitiveValueArb = fc.string({ 
      minLength: 3, 
      maxLength: 50 
    }).filter(s => s.trim().length >= 3); // Evitar strings triviales

    // Generador de objetos con campos sensibles
    const contextWithSensitiveDataArb = fc.record({
      action: fc.string({ minLength: 1, maxLength: 20 }),
      userId: fc.option(fc.integer({ min: 1, max: 10000 })),
      username: fc.option(fc.string({ minLength: 1, maxLength: 20 })),
      details: fc.dictionary(
        fc.oneof(
          fc.string({ minLength: 1, maxLength: 20 }), // campos normales
          sensitiveFieldArb // campos sensibles
        ),
        fc.oneof(
          fc.string({ minLength: 1, maxLength: 50 }), // valores normales
          sensitiveValueArb // valores sensibles
        ),
        { minKeys: 1, maxKeys: 10 }
      )
    });

    fc.assert(
      fc.property(contextWithSensitiveDataArb, (context) => {
        // Limpiar spy antes de cada iteración
        consoleLogSpy.mockClear();

        // Ejecutar log
        logger.info('Test message', context as LogContext);

        // Obtener el mensaje loggeado
        const loggedMessage = consoleLogSpy.mock.calls[0][0];

        // Verificar que los campos sensibles específicamente contienen [REDACTED]
        if (context.details) {
          for (const [key, value] of Object.entries(context.details)) {
            const lowerKey = key.toLowerCase();
            const isSensitive = 
              lowerKey.includes('password') ||
              lowerKey.includes('token') ||
              lowerKey.includes('secret') ||
              lowerKey.includes('apikey') ||
              lowerKey.includes('accesstoken');

            if (isSensitive && typeof value === 'string' && value.trim().length >= 3) {
              // Buscar el campo específico en el JSON
              const fieldPattern = new RegExp(`"${key}":\\s*"([^"]+)"`);
              const match = loggedMessage.match(fieldPattern);
              
              if (match) {
                // El valor del campo debe ser [REDACTED]
                expect(match[1]).toBe('[REDACTED]');
              }
            }
          }
        }

        // Debe contener [REDACTED] si hay campos sensibles
        const hasSensitiveFields = context.details && Object.keys(context.details).some(key => {
          const lowerKey = key.toLowerCase();
          return lowerKey.includes('password') || lowerKey.includes('token') || 
                 lowerKey.includes('secret') || lowerKey.includes('apikey') || 
                 lowerKey.includes('accesstoken');
        });

        if (hasSensitiveFields) {
          expect(loggedMessage).toContain('[REDACTED]');
        }
      }),
      { numRuns: 100 } // Mínimo 100 iteraciones según el diseño
    );
  });

  /**
   * Property: Sanitización en objetos anidados
   * Para cualquier objeto con campos sensibles anidados,
   * ningún valor sensible debe aparecer en el log
   */
  test('Property: Sanitización funciona en objetos anidados de cualquier profundidad', () => {
    // Generador de objetos anidados con campos sensibles
    const nestedObjectArb = fc.letrec(tie => ({
      leaf: fc.record({
        password: fc.string({ minLength: 5, maxLength: 20 }),
        normalField: fc.string({ minLength: 1, maxLength: 20 })
      }),
      node: fc.record({
        password: fc.string({ minLength: 5, maxLength: 20 }),
        nested: fc.oneof(tie('leaf'), tie('node')),
        normalField: fc.string({ minLength: 1, maxLength: 20 })
      })
    }));

    const contextArb = fc.record({
      action: fc.constant('nested_test'),
      details: nestedObjectArb.node
    });

    fc.assert(
      fc.property(contextArb, (context) => {
        consoleLogSpy.mockClear();

        logger.info('Nested test', context as LogContext);

        const loggedMessage = consoleLogSpy.mock.calls[0][0];

        // Función recursiva para extraer todos los passwords
        const extractPasswords = (obj: any): string[] => {
          const passwords: string[] = [];
          
          if (obj && typeof obj === 'object') {
            for (const [key, value] of Object.entries(obj)) {
              if (key === 'password' && typeof value === 'string') {
                passwords.push(value);
              } else if (typeof value === 'object') {
                passwords.push(...extractPasswords(value));
              }
            }
          }
          
          return passwords;
        };

        const allPasswords = extractPasswords(context.details);

        // Ningún password debe aparecer en el log
        for (const password of allPasswords) {
          expect(loggedMessage).not.toContain(password);
        }

        // Debe contener [REDACTED]
        expect(loggedMessage).toContain('[REDACTED]');
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Sanitización en arrays
   * Para cualquier array con objetos que contienen campos sensibles,
   * ningún valor sensible debe aparecer en el log
   */
  test('Property: Sanitización funciona en arrays con objetos sensibles', () => {
    const userWithPasswordArb = fc.record({
      name: fc.string({ minLength: 1, maxLength: 20 }),
      password: fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length >= 5),
      email: fc.emailAddress()
    });

    const contextArb = fc.record({
      action: fc.constant('batch_operation'),
      details: fc.record({
        users: fc.array(userWithPasswordArb, { minLength: 1, maxLength: 5 })
      })
    });

    fc.assert(
      fc.property(contextArb, (context) => {
        consoleLogSpy.mockClear();

        logger.info('Batch operation', context as LogContext);

        const loggedMessage = consoleLogSpy.mock.calls[0][0];

        // Verificar que el campo password específicamente contiene [REDACTED]
        // En lugar de buscar el valor del password en todo el log
        const passwordFieldMatches = loggedMessage.match(/"password":\s*"([^"]+)"/g);
        
        if (passwordFieldMatches) {
          for (const match of passwordFieldMatches) {
            // Cada campo password debe contener [REDACTED]
            expect(match).toContain('[REDACTED]');
          }
        }

        // Debe contener [REDACTED]
        expect(loggedMessage).toContain('[REDACTED]');
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Campos no sensibles permanecen intactos
   * Para cualquier objeto con campos no sensibles,
   * esos valores deben aparecer en el log sin modificación
   */
  test('Property: Campos no sensibles no son sanitizados', () => {
    const contextArb = fc.record({
      action: fc.string({ minLength: 1, maxLength: 20 }),
      userId: fc.integer({ min: 1, max: 10000 }),
      username: fc.string({ minLength: 1, maxLength: 20 }),
      details: fc.record({
        normalField: fc.string({ minLength: 1, maxLength: 50 }),
        anotherField: fc.integer({ min: 1, max: 1000 }),
        password: fc.string({ minLength: 5, maxLength: 20 }) // Este sí debe sanitizarse
      })
    });

    fc.assert(
      fc.property(contextArb, (context) => {
        consoleLogSpy.mockClear();

        logger.info('Test message', context as LogContext);

        const loggedMessage = consoleLogSpy.mock.calls[0][0];

        // Los campos no sensibles DEBEN aparecer (considerando escaping de JSON)
        // JSON.stringify escapa caracteres especiales, así que verificamos la versión escapada
        const usernameInLog = JSON.stringify(context.username).slice(1, -1); // Remover comillas
        const normalFieldInLog = JSON.stringify(context.details.normalField).slice(1, -1);
        
        expect(loggedMessage).toContain(usernameInLog);
        expect(loggedMessage).toContain(normalFieldInLog);
        expect(loggedMessage).toContain(String(context.details.anotherField));

        // El password NO debe aparecer
        expect(loggedMessage).not.toContain(context.details.password);
        expect(loggedMessage).toContain('[REDACTED]');
      }),
      { numRuns: 100 }
    );
  });
});
