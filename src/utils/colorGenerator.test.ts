/**
 * Unit tests for Color Generator Utility
 * Validates color generation, cycling behavior, and consistency
 */

import { generateColor } from './colorGenerator';

describe('Color Generator Utility', () => {
  describe('Basic color generation', () => {
    test('generates a valid hex color for index 0', () => {
      const color = generateColor(0);
      
      expect(color).toBeDefined();
      expect(color).toMatch(/^#[0-9A-F]{6}$/i);
    });

    test('generates a valid hex color for any positive index', () => {
      const color = generateColor(5);
      
      expect(color).toBeDefined();
      expect(color).toMatch(/^#[0-9A-F]{6}$/i);
    });

    test('generates different colors for consecutive indices', () => {
      const color0 = generateColor(0);
      const color1 = generateColor(1);
      const color2 = generateColor(2);
      
      expect(color0).not.toBe(color1);
      expect(color1).not.toBe(color2);
      expect(color0).not.toBe(color2);
    });

    test('returns first color (#3B82F6) for index 0', () => {
      const color = generateColor(0);
      
      expect(color).toBe('#3B82F6');
    });

    test('returns second color (#10B981) for index 1', () => {
      const color = generateColor(1);
      
      expect(color).toBe('#10B981');
    });
  });

  describe('Color cycling behavior', () => {
    test('cycles back to first color after 15 colors', () => {
      const color0 = generateColor(0);
      const color15 = generateColor(15);
      
      expect(color15).toBe(color0);
    });

    test('cycles correctly for index 16', () => {
      const color1 = generateColor(1);
      const color16 = generateColor(16);
      
      expect(color16).toBe(color1);
    });

    test('cycles correctly for large indices', () => {
      const color5 = generateColor(5);
      const color35 = generateColor(35); // 35 % 15 = 5
      
      expect(color35).toBe(color5);
    });

    test('handles very large indices', () => {
      const color = generateColor(1000);
      
      expect(color).toBeDefined();
      expect(color).toMatch(/^#[0-9A-F]{6}$/i);
      
      // 1000 % 15 = 10, should match index 10
      const color10 = generateColor(10);
      expect(color).toBe(color10);
    });
  });

  describe('Consistency', () => {
    test('returns same color for same index on multiple calls', () => {
      const color1 = generateColor(3);
      const color2 = generateColor(3);
      const color3 = generateColor(3);
      
      expect(color1).toBe(color2);
      expect(color2).toBe(color3);
    });

    test('generates all 15 distinct colors', () => {
      const colors = new Set<string>();
      
      for (let i = 0; i < 15; i++) {
        colors.add(generateColor(i));
      }
      
      expect(colors.size).toBe(15);
    });

    test('all colors are valid hex format', () => {
      const hexPattern = /^#[0-9A-F]{6}$/i;
      
      for (let i = 0; i < 15; i++) {
        const color = generateColor(i);
        expect(color).toMatch(hexPattern);
      }
    });
  });

  describe('Edge cases', () => {
    test('handles index at exact array length boundary', () => {
      const color14 = generateColor(14); // Last color in array
      const color15 = generateColor(15); // Should cycle to first
      const color0 = generateColor(0);
      
      expect(color14).not.toBe(color15);
      expect(color15).toBe(color0);
    });

    test('handles zero index', () => {
      const color = generateColor(0);
      
      expect(color).toBeDefined();
      expect(color).toBe('#3B82F6');
    });
  });

  describe('Use case: Municipality chart colors', () => {
    test('generates unique colors for typical number of municipalities (20)', () => {
      const colors = [];
      
      for (let i = 0; i < 20; i++) {
        colors.push(generateColor(i));
      }
      
      // Should have at least 15 unique colors (the full palette)
      const uniqueColors = new Set(colors);
      expect(uniqueColors.size).toBe(15);
      
      // First 15 should all be unique
      const first15 = new Set(colors.slice(0, 15));
      expect(first15.size).toBe(15);
    });

    test('provides visually distinct colors for small datasets', () => {
      // For 5 municipalities, all should have different colors
      const colors = [];
      
      for (let i = 0; i < 5; i++) {
        colors.push(generateColor(i));
      }
      
      const uniqueColors = new Set(colors);
      expect(uniqueColors.size).toBe(5);
    });

    test('handles maximum expected municipalities (50)', () => {
      const colors = [];
      
      for (let i = 0; i < 50; i++) {
        colors.push(generateColor(i));
      }
      
      // Should cycle through colors multiple times
      expect(colors.length).toBe(50);
      
      // Verify cycling: index 0 should equal index 15, 30, 45
      expect(colors[0]).toBe(colors[15]);
      expect(colors[0]).toBe(colors[30]);
      expect(colors[0]).toBe(colors[45]);
    });
  });

  describe('Color palette verification', () => {
    test('contains expected blue color at index 0', () => {
      expect(generateColor(0)).toBe('#3B82F6');
    });

    test('contains expected green color at index 1', () => {
      expect(generateColor(1)).toBe('#10B981');
    });

    test('contains expected amber color at index 2', () => {
      expect(generateColor(2)).toBe('#F59E0B');
    });

    test('contains expected red color at index 3', () => {
      expect(generateColor(3)).toBe('#EF4444');
    });

    test('contains expected purple color at index 4', () => {
      expect(generateColor(4)).toBe('#8B5CF6');
    });

    test('all colors are uppercase hex format', () => {
      for (let i = 0; i < 15; i++) {
        const color = generateColor(i);
        // Check that hex letters are uppercase
        expect(color).toBe(color.toUpperCase());
      }
    });
  });
});
