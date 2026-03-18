import { _ } from 'golgoth';
import chroma from 'chroma-js';

export let __ = {};

/**
 * Normalizes an array of raw label objects by extracting the id, name, color, and calculating border color.
 * @param {Array<object>} rawLabels - Array of raw label objects to normalize
 * @returns {Array<object>} Array of normalized label objects containing id, name, color (hex), isDark boolean, and borderColor (hsla string)
 */
export function normalizeLabels(rawLabels) {
  return _.map(rawLabels, (rawLabel) => {
    const { color, id, name } = rawLabel;

    // Check cache first
    if (__.cache[color]) {
      return { id, name, ...__.cache[color] };
    }

    // Calculate if not cached
    const chromaColor = chroma(`#${color}`);
    const isDark = chromaColor.luminance() <= 0.5;
    const borderColor = __.calculateBorderColor(chromaColor);

    // Store in cache
    __.cache[color] = { color, isDark, borderColor };

    return { id, name, color, isDark, borderColor };
  });
}

__ = {
  cache: {},
  /**
   * Calculates the border color for a label based on a chroma color object.
   * @param {object} chromaColor - A chroma.js color object
   * @returns {string} Border color as an HSLA string
   * Note: The math is extracted from GitHub CSS vars front-end
   */
  calculateBorderColor(chromaColor) {
    const [r, g, b] = chromaColor.rgb();
    const hsl = chromaColor.hsl();

    // Convert HSL from chroma format [h(0-360), s(0-1), l(0-1)] to [h, s(0-100), l(0-100)]
    const h = Math.round(hsl[0]) || 0; // h in degrees, use 0 if NaN
    const s = Math.round(hsl[1] * 100);
    const l = Math.round(hsl[2] * 100);

    // Calculate perceived lightness
    const perceivedLightness = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 255;

    // Calculate border alpha
    const borderAlpha = Math.max(
      0,
      Math.min((perceivedLightness - 0.96) * 100, 1),
    );

    // Construct border color
    return `hsla(${h}, ${s}%, ${l - 25}%, ${borderAlpha})`;
  },
};
