import path from 'path';
import { uploadEntrega } from './upload';

describe('Upload Middleware', () => {
  describe('File Filter', () => {
    // Access the fileFilter function from the multer configuration
    const fileFilter = (uploadEntrega as any).fileFilter;

    it('should accept .doc files', (done) => {
      const mockFile = {
        originalname: 'document.doc',
        mimetype: 'application/msword'
      } as Express.Multer.File;

      fileFilter(null, mockFile, (error: Error | null, accept: boolean) => {
        expect(error).toBeNull();
        expect(accept).toBe(true);
        done();
      });
    });

    it('should accept .docx files', (done) => {
      const mockFile = {
        originalname: 'document.docx',
        mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      } as Express.Multer.File;

      fileFilter(null, mockFile, (error: Error | null, accept: boolean) => {
        expect(error).toBeNull();
        expect(accept).toBe(true);
        done();
      });
    });

    it('should accept .xls files', (done) => {
      const mockFile = {
        originalname: 'spreadsheet.xls',
        mimetype: 'application/vnd.ms-excel'
      } as Express.Multer.File;

      fileFilter(null, mockFile, (error: Error | null, accept: boolean) => {
        expect(error).toBeNull();
        expect(accept).toBe(true);
        done();
      });
    });

    it('should accept .xlsx files', (done) => {
      const mockFile = {
        originalname: 'spreadsheet.xlsx',
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      } as Express.Multer.File;

      fileFilter(null, mockFile, (error: Error | null, accept: boolean) => {
        expect(error).toBeNull();
        expect(accept).toBe(true);
        done();
      });
    });

    it('should accept .ppt files', (done) => {
      const mockFile = {
        originalname: 'presentation.ppt',
        mimetype: 'application/vnd.ms-powerpoint'
      } as Express.Multer.File;

      fileFilter(null, mockFile, (error: Error | null, accept: boolean) => {
        expect(error).toBeNull();
        expect(accept).toBe(true);
        done();
      });
    });

    it('should accept .pptx files', (done) => {
      const mockFile = {
        originalname: 'presentation.pptx',
        mimetype: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      } as Express.Multer.File;

      fileFilter(null, mockFile, (error: Error | null, accept: boolean) => {
        expect(error).toBeNull();
        expect(accept).toBe(true);
        done();
      });
    });

    it('should accept .pdf files', (done) => {
      const mockFile = {
        originalname: 'document.pdf',
        mimetype: 'application/pdf'
      } as Express.Multer.File;

      fileFilter(null, mockFile, (error: Error | null, accept: boolean) => {
        expect(error).toBeNull();
        expect(accept).toBe(true);
        done();
      });
    });

    it('should reject .txt files', (done) => {
      const mockFile = {
        originalname: 'document.txt',
        mimetype: 'text/plain'
      } as Express.Multer.File;

      fileFilter(null, mockFile, (error: Error | null, accept: boolean) => {
        expect(error).toBeInstanceOf(Error);
        expect(error?.message).toContain('Formato de archivo no permitido');
        done();
      });
    });

    it('should reject .exe files', (done) => {
      const mockFile = {
        originalname: 'malware.exe',
        mimetype: 'application/x-msdownload'
      } as Express.Multer.File;

      fileFilter(null, mockFile, (error: Error | null, accept: boolean) => {
        expect(error).toBeInstanceOf(Error);
        expect(error?.message).toContain('Formato de archivo no permitido');
        done();
      });
    });

    it('should reject .zip files', (done) => {
      const mockFile = {
        originalname: 'archive.zip',
        mimetype: 'application/zip'
      } as Express.Multer.File;

      fileFilter(null, mockFile, (error: Error | null, accept: boolean) => {
        expect(error).toBeInstanceOf(Error);
        expect(error?.message).toContain('Formato de archivo no permitido');
        done();
      });
    });

    it('should handle uppercase extensions', (done) => {
      const mockFile = {
        originalname: 'DOCUMENT.PDF',
        mimetype: 'application/pdf'
      } as Express.Multer.File;

      fileFilter(null, mockFile, (error: Error | null, accept: boolean) => {
        expect(error).toBeNull();
        expect(accept).toBe(true);
        done();
      });
    });

    it('should handle mixed case extensions', (done) => {
      const mockFile = {
        originalname: 'document.PdF',
        mimetype: 'application/pdf'
      } as Express.Multer.File;

      fileFilter(null, mockFile, (error: Error | null, accept: boolean) => {
        expect(error).toBeNull();
        expect(accept).toBe(true);
        done();
      });
    });
  });

  describe('Multer Configuration', () => {
    it('should have correct file size limit (10MB)', () => {
      const limits = (uploadEntrega as any).limits;
      expect(limits.fileSize).toBe(10 * 1024 * 1024);
    });

    it('should use disk storage', () => {
      const storage = (uploadEntrega as any).storage;
      expect(storage).toBeDefined();
    });
  });
});
