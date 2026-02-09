/**
 * Property-Based Tests for File Upload Middleware
 * Feature: mejoras-ui-funcionales-cdce
 * Properties 3 & 4: File Type Validation
 * Validates: Requirements 5.2, 5.3, 5.4, 5.5, 5.6
 */

import * as fc from 'fast-check';
import { uploadEntrega } from './upload';

describe('Upload Middleware Property-Based Tests', () => {
  // Access the fileFilter function from the multer configuration
  const fileFilter = (uploadEntrega as any).fileFilter;

  /**
   * Property 3: File Type Validation - Accepted Formats
   * **Validates: Requirements 5.2, 5.3, 5.4, 5.5**
   * 
   * For any file with an extension in the allowed list (.doc, .docx, .xls, .xlsx, .ppt, .pptx, .pdf),
   * the file upload system should accept the file and allow the upload to proceed.
   */
  test('Property 3: All files with allowed extensions are accepted', async () => {
    // Generator for allowed extensions
    const allowedExtensionArb = fc.constantFrom(
      '.doc',
      '.docx',
      '.xls',
      '.xlsx',
      '.ppt',
      '.pptx',
      '.pdf'
    );

    // Generator for random filenames (alphanumeric with spaces, hyphens, and underscores)
    // Exclude path separators and other invalid filename characters
    const filenameBaseArb = fc.string({
      minLength: 1,
      maxLength: 50
    })
      .filter(s => s.trim().length > 0)
      .map(s => s.replace(/[\/\\:*?"<>|]/g, '_')); // Replace invalid filename chars

    // Generator for case variations (lowercase, uppercase, mixed)
    const caseVariationArb = fc.constantFrom('lower', 'upper', 'mixed');

    await fc.assert(
      fc.asyncProperty(
        filenameBaseArb,
        allowedExtensionArb,
        caseVariationArb,
        async (basename, extension, caseVariation) => {
          // Apply case variation to extension
          let finalExtension: string = extension;
          if (caseVariation === 'upper') {
            finalExtension = extension.toUpperCase();
          } else if (caseVariation === 'mixed') {
            // Mix case: .PdF, .DoCx, etc.
            finalExtension = extension
              .split('')
              .map((char, idx) => (idx % 2 === 0 ? char.toUpperCase() : char.toLowerCase()))
              .join('');
          }

          const filename = basename + finalExtension;

          // Create mock file
          const mockFile = {
            originalname: filename,
            mimetype: 'application/octet-stream'
          } as Express.Multer.File;

          // Test the file filter
          return new Promise<boolean>((resolve) => {
            fileFilter(null, mockFile, (error: Error | null, accept: boolean) => {
              // Should accept the file (no error, accept = true)
              resolve(error === null && accept === true);
            });
          });
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Property 4: File Type Validation - Rejected Formats
   * **Validates: Requirements 5.6**
   * 
   * For any file with an extension not in the allowed list,
   * the file upload system should reject the file and return an error message.
   */
  test('Property 4: All files with disallowed extensions are rejected with error message', async () => {
    // List of allowed extensions for filtering
    const allowedExtensions = ['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.pdf'];

    // Generator for disallowed extensions
    // Common file extensions that should be rejected
    const commonDisallowedExtensions = [
      '.txt', '.exe', '.zip', '.rar', '.tar', '.gz',
      '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg',
      '.mp3', '.mp4', '.avi', '.mov', '.wav',
      '.html', '.css', '.js', '.json', '.xml',
      '.py', '.java', '.cpp', '.c', '.h',
      '.sql', '.db', '.mdb', '.accdb',
      '.bat', '.sh', '.cmd', '.ps1',
      '.dmg', '.iso', '.img'
    ];

    const disallowedExtensionArb = fc.oneof(
      // Use common disallowed extensions
      fc.constantFrom(...commonDisallowedExtensions),
      // Generate random extensions that are not in the allowed list
      fc.string({ minLength: 2, maxLength: 6 })
        .map(s => '.' + s.replace(/[^a-zA-Z0-9]/g, ''))
        .filter(ext => {
          const lowerExt = ext.toLowerCase();
          return !allowedExtensions.includes(lowerExt) && ext.length > 1;
        })
    );

    // Generator for random filenames
    const filenameBaseArb = fc.string({
      minLength: 1,
      maxLength: 50
    }).filter(s => s.trim().length > 0);

    await fc.assert(
      fc.asyncProperty(
        filenameBaseArb,
        disallowedExtensionArb,
        async (basename, extension) => {
          const filename = basename + extension;

          // Create mock file
          const mockFile = {
            originalname: filename,
            mimetype: 'application/octet-stream'
          } as Express.Multer.File;

          // Test the file filter
          return new Promise<boolean>((resolve) => {
            fileFilter(null, mockFile, (error: Error | null, accept: boolean) => {
              // Should reject the file (error present, error message contains expected text)
              const isRejected = error !== null && error instanceof Error;
              const hasErrorMessage = error?.message?.includes('Formato de archivo no permitido') ?? false;
              resolve(isRejected && hasErrorMessage);
            });
          });
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Additional Property: Extension extraction is case-insensitive
   * 
   * For any allowed extension with any case variation,
   * the file should be accepted consistently.
   */
  test('Property: Extension validation is case-insensitive for all allowed formats', async () => {
    const allowedExtensions = ['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.pdf'];

    // Generator for valid filename strings (no path separators or invalid chars)
    const stringArb = fc.string({ minLength: 1, maxLength: 20 })
      .filter(s => s.trim().length > 0)
      .map(s => s.replace(/[\/\\:*?"<>|]/g, '_')); // Replace invalid filename chars

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...allowedExtensions),
        stringArb,
        async (extension, basename) => {
          // Test with lowercase, uppercase, and original
          const variations = [
            extension.toLowerCase(),
            extension.toUpperCase(),
            extension
          ];

          const results = variations.map(ext => {
            const filename = basename + ext;
            const mockFile = {
              originalname: filename,
              mimetype: 'application/octet-stream'
            } as Express.Multer.File;

            return new Promise<boolean>((resolve) => {
              fileFilter(null, mockFile, (error: Error | null, accept: boolean) => {
                resolve(error === null && accept === true);
              });
            });
          });

          // All variations should be accepted
          const outcomes = await Promise.all(results);
          return outcomes.every(outcome => outcome === true);
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Additional Property: Files with multiple dots in filename are handled correctly
   * 
   * For any filename with multiple dots, only the last extension should be validated.
   */
  test('Property: Only the final extension is validated for files with multiple dots', async () => {
    const allowedExtensionArb = fc.constantFrom(
      '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.pdf'
    );

    // Generator for filenames with multiple dots (valid filename characters only)
    const multiDotFilenameArb = fc.tuple(
      fc.string({ minLength: 1, maxLength: 20 })
        .filter(s => s.trim().length > 0)
        .map(s => s.replace(/[\/\\:*?"<>|.]/g, '_')),
      fc.string({ minLength: 1, maxLength: 10 })
        .filter(s => s.trim().length > 0)
        .map(s => s.replace(/[\/\\:*?"<>|.]/g, '_')),
      fc.string({ minLength: 1, maxLength: 10 })
        .filter(s => s.trim().length > 0)
        .map(s => s.replace(/[\/\\:*?"<>|.]/g, '_'))
    ).map(([base, middle, end]) => `${base}.${middle}.${end}`);

    await fc.assert(
      fc.asyncProperty(
        multiDotFilenameArb,
        allowedExtensionArb,
        async (basename, extension) => {
          const filename = basename + extension;

          const mockFile = {
            originalname: filename,
            mimetype: 'application/octet-stream'
          } as Express.Multer.File;

          return new Promise<boolean>((resolve) => {
            fileFilter(null, mockFile, (error: Error | null, accept: boolean) => {
              // Should accept because the final extension is allowed
              resolve(error === null && accept === true);
            });
          });
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Additional Property: Empty or whitespace-only basenames with valid extensions
   * 
   * Even with unusual basenames, valid extensions should be accepted.
   */
  test('Property: Valid extensions are accepted regardless of basename content', async () => {
    const allowedExtensionArb = fc.constantFrom(
      '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.pdf'
    );

    // Generator for various basename patterns including edge cases
    const basenameArb = fc.oneof(
      fc.string({ minLength: 1, maxLength: 50 }),
      fc.constant('file'),
      fc.constant('document'),
      fc.constant('123'),
      fc.constant('file-name'),
      fc.constant('file_name'),
      fc.constant('file name with spaces')
    ).filter(s => s.length > 0);

    await fc.assert(
      fc.asyncProperty(
        basenameArb,
        allowedExtensionArb,
        async (basename, extension) => {
          const filename = basename + extension;

          const mockFile = {
            originalname: filename,
            mimetype: 'application/octet-stream'
          } as Express.Multer.File;

          return new Promise<boolean>((resolve) => {
            fileFilter(null, mockFile, (error: Error | null, accept: boolean) => {
              resolve(error === null && accept === true);
            });
          });
        }
      ),
      { numRuns: 10 }
    );
  });
});
