/**
 * Unit Tests for Performance Chart View
 * 
 * Tests the evaluacion/index.ejs template to ensure the performance chart
 * renders correctly with various data scenarios.
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

import * as fs from 'fs';
import * as path from 'path';
import * as ejs from 'ejs';
import { MunicipalityPerformance } from '../../services/performanceService';

describe('Performance Chart View', () => {
  let evaluacionTemplate: string;
  let layoutTemplate: string;
  let sidebarPartial: string;
  let iconPartial: string;

  beforeAll(() => {
    // Read the evaluacion template
    const templatePath = path.join(__dirname, '../evaluacion/index.ejs');
    evaluacionTemplate = fs.readFileSync(templatePath, 'utf-8');

    // Read layout template for full rendering
    const layoutPath = path.join(__dirname, '../layout.ejs');
    layoutTemplate = fs.readFileSync(layoutPath, 'utf-8');

    // Read partials
    const sidebarPath = path.join(__dirname, '../partials/sidebar.ejs');
    sidebarPartial = fs.readFileSync(sidebarPath, 'utf-8');

    const iconPath = path.join(__dirname, '../partials/icon.ejs');
    iconPartial = fs.readFileSync(iconPath, 'utf-8');
  });

  /**
   * Helper function to render the template with mock data
   */
  function renderTemplate(performanceData: MunicipalityPerformance[] | undefined) {
    return ejs.render(evaluacionTemplate, {
      performanceData,
      divisiones: [],
      resultados: null,
      filtros: {
        mes: '',
        anio: '',
        divisionId: ''
      },
      // Include function for partials
      include: (partialPath: string, data?: any) => {
        if (partialPath.includes('icon')) {
          return `<svg class="${data?.class || ''}"></svg>`;
        }
        return '';
      }
    }, {
      filename: path.join(__dirname, '../evaluacion/index.ejs')
    });
  }

  describe('Chart renders with no data (empty state)', () => {
    test('should not render chart section when performanceData is undefined', () => {
      const renderedHtml = renderTemplate(undefined);
      
      // Chart section should not be present
      expect(renderedHtml).not.toContain('municipalityPerformanceChart');
      expect(renderedHtml).not.toContain('Desempeño de Todos los Municipios');
    });

    test('should not render chart section when performanceData is empty array', () => {
      const renderedHtml = renderTemplate([]);
      
      // Chart section should not be present
      expect(renderedHtml).not.toContain('municipalityPerformanceChart');
      expect(renderedHtml).not.toContain('Desempeño de Todos los Municipios');
    });

    test('should not include Chart.js script when no data is available', () => {
      const renderedHtml = renderTemplate([]);
      
      // Chart.js initialization script should not be present
      expect(renderedHtml).not.toContain('new Chart(ctx');
      expect(renderedHtml).not.toContain('const performanceData = ');
    });

    test('should still render filters and other page elements when no chart data', () => {
      const renderedHtml = renderTemplate([]);
      
      // Filters should still be present
      expect(renderedHtml).toContain('Seleccionar Período y División');
      expect(renderedHtml).toContain('Calcular Desempeño');
    });
  });

  describe('Chart renders with single municipality', () => {
    const singleMunicipalityData: MunicipalityPerformance[] = [
      {
        municipioId: 1,
        municipioNombre: 'Municipio Test',
        totalTareas: 10,
        tareasCompletadas: 7,
        porcentajeCompletado: 70.00,
        actividadesCompletadas: ['Tarea 1', 'Tarea 2', 'Tarea 3'],
        color: '#3B82F6'
      }
    ];

    test('should render chart section with single municipality', () => {
      const renderedHtml = renderTemplate(singleMunicipalityData);
      
      // Chart section should be present
      expect(renderedHtml).toContain('municipalityPerformanceChart');
      expect(renderedHtml).toContain('Desempeño de Todos los Municipios');
    });

    test('should include Chart.js library CDN', () => {
      const renderedHtml = renderTemplate(singleMunicipalityData);
      
      // Chart.js CDN should be included
      expect(renderedHtml).toContain('chart.js');
      expect(renderedHtml).toContain('cdn.jsdelivr.net');
    });

    test('should render canvas element for chart', () => {
      const renderedHtml = renderTemplate(singleMunicipalityData);
      
      // Canvas element should be present
      expect(renderedHtml).toMatch(/<canvas[^>]*id="municipalityPerformanceChart"[^>]*><\/canvas>/);
    });

    test('should include municipality data in JavaScript', () => {
      const renderedHtml = renderTemplate(singleMunicipalityData);
      
      // Performance data should be serialized to JavaScript
      expect(renderedHtml).toContain('const performanceData = ');
      expect(renderedHtml).toContain('Municipio Test');
      expect(renderedHtml).toContain('70');
    });

    test('should initialize Chart.js with correct configuration', () => {
      const renderedHtml = renderTemplate(singleMunicipalityData);
      
      // Chart initialization should be present
      expect(renderedHtml).toContain('new Chart(ctx');
      expect(renderedHtml).toContain("type: 'bar'");
      expect(renderedHtml).toContain('labels: performanceData.map(d => d.municipioNombre)');
      expect(renderedHtml).toContain('data: performanceData.map(d => d.porcentajeCompletado)');
    });

    test('should configure y-axis from 0 to 100', () => {
      const renderedHtml = renderTemplate(singleMunicipalityData);
      
      // Y-axis configuration
      expect(renderedHtml).toContain('beginAtZero: true');
      expect(renderedHtml).toContain('max: 100');
    });

    test('should display municipality in legend', () => {
      const renderedHtml = renderTemplate(singleMunicipalityData);
      
      // Legend should show municipality
      expect(renderedHtml).toContain('Municipio Test');
      expect(renderedHtml).toContain('70%');
      expect(renderedHtml).toContain('#3B82F6');
    });

    test('should use unique color for municipality bar', () => {
      const renderedHtml = renderTemplate(singleMunicipalityData);
      
      // Color should be applied
      expect(renderedHtml).toContain('backgroundColor: performanceData.map(d => d.color)');
      expect(renderedHtml).toContain('borderColor: performanceData.map(d => d.color)');
    });
  });

  describe('Chart renders with maximum municipalities', () => {
    // Create data for 15 municipalities (maximum before color cycling)
    const maxMunicipalitiesData: MunicipalityPerformance[] = Array.from({ length: 15 }, (_, i) => ({
      municipioId: i + 1,
      municipioNombre: `Municipio ${i + 1}`,
      totalTareas: 20,
      tareasCompletadas: Math.floor(Math.random() * 20),
      porcentajeCompletado: Math.round((Math.floor(Math.random() * 20) / 20) * 100),
      actividadesCompletadas: [`Tarea ${i + 1}A`, `Tarea ${i + 1}B`],
      color: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`
    }));

    test('should render chart with all municipalities', () => {
      const renderedHtml = renderTemplate(maxMunicipalitiesData);
      
      // Chart should be present
      expect(renderedHtml).toContain('municipalityPerformanceChart');
      
      // All municipalities should be in the data
      maxMunicipalitiesData.forEach(data => {
        expect(renderedHtml).toContain(data.municipioNombre);
      });
    });

    test('should display first 6 municipalities in legend with "more" indicator', () => {
      const renderedHtml = renderTemplate(maxMunicipalitiesData);
      
      // First 6 should be shown
      for (let i = 0; i < 6; i++) {
        expect(renderedHtml).toContain(maxMunicipalitiesData[i].municipioNombre);
      }
      
      // Should show "more" indicator
      expect(renderedHtml).toContain('... y 9 más');
    });

    test('should handle responsive chart sizing', () => {
      const renderedHtml = renderTemplate(maxMunicipalitiesData);
      
      // Chart should have responsive configuration
      expect(renderedHtml).toContain('responsive: true');
      expect(renderedHtml).toContain('maintainAspectRatio: false');
    });

    test('should include all municipality colors in chart data', () => {
      const renderedHtml = renderTemplate(maxMunicipalitiesData);
      
      // Colors should be mapped from performance data
      expect(renderedHtml).toContain('backgroundColor: performanceData.map(d => d.color)');
      expect(renderedHtml).toContain('borderColor: performanceData.map(d => d.color)');
    });

    test('should serialize all municipality data to JavaScript', () => {
      const renderedHtml = renderTemplate(maxMunicipalitiesData);
      
      // All municipalities should be in the serialized data
      expect(renderedHtml).toContain('const performanceData = ');
      
      // Check that array has correct length (indirectly by checking multiple entries)
      const municipalityMatches = renderedHtml.match(/Municipio \d+/g);
      expect(municipalityMatches).not.toBeNull();
      expect(municipalityMatches!.length).toBeGreaterThanOrEqual(15);
    });
  });

  describe('Chart tooltip displays correct information', () => {
    const tooltipTestData: MunicipalityPerformance[] = [
      {
        municipioId: 1,
        municipioNombre: 'Municipio Alpha',
        totalTareas: 10,
        tareasCompletadas: 8,
        porcentajeCompletado: 80.00,
        actividadesCompletadas: [
          'Actividad 1',
          'Actividad 2',
          'Actividad 3',
          'Actividad 4',
          'Actividad 5',
          'Actividad 6'
        ],
        color: '#3B82F6'
      },
      {
        municipioId: 2,
        municipioNombre: 'Municipio Beta',
        totalTareas: 5,
        tareasCompletadas: 2,
        porcentajeCompletado: 40.00,
        actividadesCompletadas: ['Actividad A', 'Actividad B'],
        color: '#10B981'
      }
    ];

    test('should configure tooltip to show percentage', () => {
      const renderedHtml = renderTemplate(tooltipTestData);
      
      // Tooltip should show percentage
      expect(renderedHtml).toContain('tooltip:');
      expect(renderedHtml).toContain('callbacks:');
      expect(renderedHtml).toContain("'Porcentaje: ' + data.porcentajeCompletado + '%'");
    });

    test('should configure tooltip to show completed/total tasks', () => {
      const renderedHtml = renderTemplate(tooltipTestData);
      
      // Tooltip should show task counts
      expect(renderedHtml).toContain("'Completadas: ' + data.tareasCompletadas + '/' + data.totalTareas");
    });

    test('should configure tooltip to show completed activities', () => {
      const renderedHtml = renderTemplate(tooltipTestData);
      
      // Tooltip should show activities
      expect(renderedHtml).toContain('afterLabel:');
      expect(renderedHtml).toContain('actividadesCompletadas');
      expect(renderedHtml).toContain('Actividades completadas:');
    });

    test('should limit tooltip activities to first 5 with "more" indicator', () => {
      const renderedHtml = renderTemplate(tooltipTestData);
      
      // Should slice to first 5 activities
      expect(renderedHtml).toContain('data.actividadesCompletadas.slice(0, 5)');
      
      // Should show "more" indicator for additional activities
      expect(renderedHtml).toContain("'... y ' + (data.actividadesCompletadas.length - 5) + ' más'");
    });

    test('should format activities with bullet points in tooltip', () => {
      const renderedHtml = renderTemplate(tooltipTestData);
      
      // Activities should be formatted with bullets
      expect(renderedHtml).toContain("'• ' + activity");
    });

    test('should handle empty activities list in tooltip', () => {
      const renderedHtml = renderTemplate(tooltipTestData);
      
      // Should check if activities exist
      expect(renderedHtml).toContain('if (data.actividadesCompletadas && data.actividadesCompletadas.length > 0)');
    });
  });

  describe('Chart configuration and styling', () => {
    const configTestData: MunicipalityPerformance[] = [
      {
        municipioId: 1,
        municipioNombre: 'Test Municipality',
        totalTareas: 10,
        tareasCompletadas: 5,
        porcentajeCompletado: 50.00,
        actividadesCompletadas: ['Task 1'],
        color: '#3B82F6'
      }
    ];

    test('should set chart title', () => {
      const renderedHtml = renderTemplate(configTestData);
      
      // Chart should have title
      expect(renderedHtml).toContain('title:');
      expect(renderedHtml).toContain('Desempeño de Municipios - Todas las Tareas');
    });

    test('should configure y-axis with percentage labels', () => {
      const renderedHtml = renderTemplate(configTestData);
      
      // Y-axis should show percentages
      expect(renderedHtml).toContain("return value + '%'");
      expect(renderedHtml).toContain('Porcentaje de Completitud');
    });

    test('should configure x-axis with municipality label', () => {
      const renderedHtml = renderTemplate(configTestData);
      
      // X-axis should be labeled
      expect(renderedHtml).toContain('Municipios');
    });

    test('should hide legend (colors shown in separate legend section)', () => {
      const renderedHtml = renderTemplate(configTestData);
      
      // Legend should be hidden
      expect(renderedHtml).toContain('legend:');
      expect(renderedHtml).toContain('display: false');
    });

    test('should set chart height to 400px', () => {
      const renderedHtml = renderTemplate(configTestData);
      
      // Chart container should have fixed height
      expect(renderedHtml).toMatch(/style="height:\s*400px;"/);
    });

    test('should initialize chart on DOMContentLoaded', () => {
      const renderedHtml = renderTemplate(configTestData);
      
      // Chart should initialize after DOM is ready
      expect(renderedHtml).toContain("document.addEventListener('DOMContentLoaded'");
      expect(renderedHtml).toContain("const ctx = document.getElementById('municipalityPerformanceChart')");
    });

    test('should check for canvas element existence before initializing', () => {
      const renderedHtml = renderTemplate(configTestData);
      
      // Should verify canvas exists
      expect(renderedHtml).toContain('if (ctx && performanceData && performanceData.length > 0)');
    });
  });

  describe('Chart legend section', () => {
    const legendTestData: MunicipalityPerformance[] = [
      {
        municipioId: 1,
        municipioNombre: 'Municipio 1',
        totalTareas: 10,
        tareasCompletadas: 8,
        porcentajeCompletado: 80.00,
        actividadesCompletadas: ['Task 1'],
        color: '#FF0000'
      },
      {
        municipioId: 2,
        municipioNombre: 'Municipio 2',
        totalTareas: 10,
        tareasCompletadas: 5,
        porcentajeCompletado: 50.00,
        actividadesCompletadas: ['Task 2'],
        color: '#00FF00'
      }
    ];

    test('should render legend section below chart', () => {
      const renderedHtml = renderTemplate(legendTestData);
      
      // Legend section should exist
      expect(renderedHtml).toContain('Información del Gráfico');
    });

    test('should display color swatches in legend', () => {
      const renderedHtml = renderTemplate(legendTestData);
      
      // Color swatches should be rendered with actual colors (not EJS syntax)
      expect(renderedHtml).toContain('background-color: #FF0000');
      expect(renderedHtml).toContain('background-color: #00FF00');
    });

    test('should display municipality names and percentages in legend', () => {
      const renderedHtml = renderTemplate(legendTestData);
      
      // Municipality info should be in legend
      expect(renderedHtml).toContain('Municipio 1');
      expect(renderedHtml).toContain('80%');
      expect(renderedHtml).toContain('Municipio 2');
      expect(renderedHtml).toContain('50%');
    });

    test('should use grid layout for legend items', () => {
      const renderedHtml = renderTemplate(legendTestData);
      
      // Grid layout should be used
      expect(renderedHtml).toMatch(/class="[^"]*grid[^"]*grid-cols-1[^"]*sm:grid-cols-2[^"]*lg:grid-cols-3[^"]*"/);
    });
  });

  describe('Chart description and context', () => {
    const descriptionTestData: MunicipalityPerformance[] = [
      {
        municipioId: 1,
        municipioNombre: 'Test',
        totalTareas: 10,
        tareasCompletadas: 5,
        porcentajeCompletado: 50.00,
        actividadesCompletadas: [],
        color: '#3B82F6'
      }
    ];

    test('should display chart section header', () => {
      const renderedHtml = renderTemplate(descriptionTestData);
      
      // Header should be present
      expect(renderedHtml).toContain('Desempeño de Todos los Municipios');
    });

    test('should display chart description', () => {
      const renderedHtml = renderTemplate(descriptionTestData);
      
      // Description should explain the chart
      expect(renderedHtml).toContain('Visualización del porcentaje de tareas completadas por cada municipio');
    });

    test('should use proper semantic HTML structure', () => {
      const renderedHtml = renderTemplate(descriptionTestData);
      
      // Should use h2 for section title
      expect(renderedHtml).toMatch(/<h2[^>]*>[\s\S]*Desempeño de Todos los Municipios[\s\S]*<\/h2>/);
      
      // Should use h3 for legend title
      expect(renderedHtml).toMatch(/<h3[^>]*>[\s\S]*Información del Gráfico[\s\S]*<\/h3>/);
    });
  });
});
