/**
 * Color Generation Utility
 * 
 * Provides functions to generate distinct colors for visual elements like charts.
 * Used for municipality performance visualization where each municipality needs a unique color.
 */

/**
 * Array of distinct, visually appealing colors for chart visualization
 * Colors are chosen to be easily distinguishable from each other
 */
const CHART_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#14B8A6', // teal
  '#F97316', // orange
  '#6366F1', // indigo
  '#84CC16', // lime
  '#06B6D4', // cyan
  '#F43F5E', // rose
  '#A855F7', // violet
  '#22C55E', // green-500
  '#FBBF24', // yellow
];

/**
 * Generate a color based on an index
 * 
 * Returns a color from the predefined color array based on the provided index.
 * Uses modulo operation to cycle through colors if index exceeds array length.
 * 
 * @param index - The index to generate a color for (0-based)
 * @returns A hex color string (e.g., '#3B82F6')
 * 
 * @example
 * generateColor(0)  // Returns '#3B82F6' (blue)
 * generateColor(1)  // Returns '#10B981' (green)
 * generateColor(15) // Returns '#3B82F6' (cycles back to first color)
 */
export function generateColor(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length];
}
