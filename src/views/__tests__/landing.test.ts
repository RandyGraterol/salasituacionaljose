import * as fs from 'fs';
import * as path from 'path';
import * as ejs from 'ejs';

describe('Landing Page Content', () => {
  let landingTemplate: string;
  let renderedHtml: string;

  beforeAll(() => {
    // Read the landing.ejs template
    const templatePath = path.join(__dirname, '../landing.ejs');
    landingTemplate = fs.readFileSync(templatePath, 'utf-8');
    
    // Render the template (no data needed for static content)
    renderedHtml = ejs.render(landingTemplate, {});
  });

  test('should display "MPPE" text in rendered HTML', () => {
    expect(renderedHtml).toContain('MPPE');
    // Verify it's in a paragraph with the correct styling
    expect(renderedHtml).toMatch(/<p[^>]*class="[^"]*text-4xl[^"]*font-bold[^"]*text-white[^"]*"[^>]*>MPPE<\/p>/);
  });

  test('should display correct main title "Sistema CDCE Estadal Sala Situacional"', () => {
    expect(renderedHtml).toContain('Sistema CDCE Estadal Sala Situacional');
    // Verify it's in an h1 tag
    expect(renderedHtml).toMatch(/<h1[^>]*>[\s\S]*Sistema CDCE Estadal Sala Situacional[\s\S]*<\/h1>/);
  });

  test('should display correct subtitle "Control y seguimiento de gestión educativa"', () => {
    expect(renderedHtml).toContain('Control y seguimiento de gestión educativa');
    // Verify it's in a paragraph with the correct styling
    expect(renderedHtml).toMatch(/<p[^>]*class="[^"]*text-xl[^"]*"[^>]*>[\s\S]*Control y seguimiento de gestión educativa[\s\S]*<\/p>/);
  });

  test('should display logo image', () => {
    expect(renderedHtml).toContain('logo2.png');
    expect(renderedHtml).toMatch(/<img[^>]*src="\/img\/logo2\.png"[^>]*alt="Logo CDCE"[^>]*>/);
  });

  test('should have MPPE text appear before the logo in the HTML structure', () => {
    const mppeIndex = renderedHtml.indexOf('MPPE');
    const logoIndex = renderedHtml.indexOf('logo2.png');
    
    expect(mppeIndex).toBeGreaterThan(-1);
    expect(logoIndex).toBeGreaterThan(-1);
    expect(mppeIndex).toBeLessThan(logoIndex);
  });

  test('should have proper spacing between MPPE and logo (mb-2 and mb-8)', () => {
    // MPPE container should have mb-2
    expect(renderedHtml).toMatch(/<div[^>]*class="[^"]*flex[^"]*justify-center[^"]*mb-2[^"]*"[^>]*>[\s\S]*MPPE[\s\S]*<\/div>/);
    
    // Logo container should have mb-8
    expect(renderedHtml).toMatch(/<div[^>]*class="[^"]*flex[^"]*justify-center[^"]*mb-8[^"]*"[^>]*>[\s\S]*logo2\.png[\s\S]*<\/div>/);
  });
});
