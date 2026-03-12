import { _ } from 'golgoth';

export let __ = {};

/**
 * Normalizes an array of raw label objects by extracting only the id, name, and color properties.
 * @param {Array<object>} rawLabels - Array of raw label objects to normalize
 * @returns {Array<object>} Array of normalized label objects containing only id, name, and color properties
 */
export function normalizeLabels(rawLabels) {
  return _.map(rawLabels, (rawLabel) => {
    const { color, id, name } = rawLabel;
    const isDark = __.isDarkColor(color);
    return { id, name, color, isDark };
  });
}

__ = {
  /**
   * Determines if a hex color is considered dark based on its luminance value.
   * @param {string} hexColor - The hex color code (with or without # prefix)
   * @returns {boolean} True if the color is dark (luminance <= 0.5), false otherwise
   */
  isDarkColor(hexColor) {
    const hex = hexColor.replace('#', '');

    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    return luminance <= 0.5;
  },
};
