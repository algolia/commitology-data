import { _ } from 'golgoth';
import chroma from 'chroma-js';

let __ = {};

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
    const isDark = __.calculateIsDark(chromaColor);
    const borderColor = __.calculateBorderColor(chromaColor);

    // Store in cache
    __.cache[color] = { color, isDark, borderColor };

    return { id, name, color, isDark, borderColor };
  });
}

__ = {
  cache: {},
  /**
   * Calculates the perceived lightness of a color based on human perception.
   * @param {object} chromaColor - A chroma.js color object
   * @returns {number} Perceived lightness value between 0 and 1
   * Note: Uses the relative luminance formula from WCAG
   */
  getPerceivedLightness(chromaColor) {
    const [r, g, b] = chromaColor.rgb();
    return (r * 0.2126 + g * 0.7152 + b * 0.0722) / 255;
  },
  /**
   * Determines if a color is dark based on perceived lightness.
   * @param {object} chromaColor - A chroma.js color object
   * @returns {boolean} True if the color is dark (needs white text)
   * Note: Threshold of 0.453 is from GitHub front-end
   */
  calculateIsDark(chromaColor) {
    return __.getPerceivedLightness(chromaColor) < 0.453;
  },
  /**
   * Calculates the border color for a label based on a chroma color object.
   * @param {object} chromaColor - A chroma.js color object
   * @returns {string} Border color as an HSLA string
   * Note: The math is extracted from GitHub CSS vars front-end
   */
  calculateBorderColor(chromaColor) {
    const hsl = chromaColor.hsl();

    // Convert HSL from chroma format [h(0-360), s(0-1), l(0-1)] to [h, s(0-100), l(0-100)]
    const h = Math.round(hsl[0]) || 0; // h in degrees, use 0 if NaN
    const s = Math.round(hsl[1] * 100);
    const l = Math.round(hsl[2] * 100);

    // Use the shared perceived lightness calculation
    const perceivedLightness = __.getPerceivedLightness(chromaColor);

    // Calculate border alpha
    const borderAlpha = Math.max(
      0,
      Math.min((perceivedLightness - 0.96) * 100, 1),
    );

    // Construct border color
    return `hsla(${h}, ${s}%, ${l - 25}%, ${borderAlpha})`;
  },
};
