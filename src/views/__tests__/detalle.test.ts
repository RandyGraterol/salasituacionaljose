import * as fs from 'fs';
import * as path from 'path';

describe('Delivery Detail View - File Display', () => {
  let detalleTemplate: string;

  beforeAll(() => {
    // Read the detalle.ejs template
    const templatePath = path.join(__dirname, '../tareas/detalle.ejs');
    detalleTemplate = fs.readFileSync(templatePath, 'utf-8');
  });

  test('should have code to display file download link when archivoUrl is present', () => {
    // Check that the template contains the conditional logic for displaying files
    expect(detalleTemplate).toContain('if (entrega.archivoUrl)');
    expect(detalleTemplate).toContain('Ver archivo');
    expect(detalleTemplate).toContain('target="_blank"');
    expect(detalleTemplate).toContain('entrega.archivoUrl');
  });

  test('should have code to display "Sin archivo" when archivoUrl is not present', () => {
    // Check that the template contains the else condition
    expect(detalleTemplate).toContain('Sin archivo');
  });

  test('should have "Archivo" column header in desktop table', () => {
    // Verify "Archivo" column header exists in the table
    expect(detalleTemplate).toMatch(/<th[^>]*>[\s\S]*Archivo[\s\S]*<\/th>/);
  });

  test('should display file link in both desktop and mobile views', () => {
    // Count occurrences of "Ver archivo" - should appear in both desktop and mobile views
    const matches = detalleTemplate.match(/Ver archivo/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBeGreaterThanOrEqual(2); // At least once in desktop and once in mobile
  });

  test('should use document-text icon for file links', () => {
    // Verify the icon name is used in the file link sections
    expect(detalleTemplate).toContain("name: 'document-text'");
  });

  test('should open file links in new tab', () => {
    // Verify all file links have target="_blank"
    const fileLinksWithTarget = detalleTemplate.match(/href="<%= entrega\.archivoUrl %>"\s+target="_blank"/g);
    expect(fileLinksWithTarget).not.toBeNull();
    expect(fileLinksWithTarget!.length).toBeGreaterThanOrEqual(2); // Desktop and mobile
  });
});
