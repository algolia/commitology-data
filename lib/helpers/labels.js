import { _ } from 'golgoth';
import chroma from 'chroma-js';

export let __ = {};

/**
 * Normalizes an array of raw label objects by extracting the id, name, color, and calculating rgb/hsl values.
 * @param {Array<object>} rawLabels - Array of raw label objects to normalize
 * @returns {Array<object>} Array of normalized label objects containing id, name, color (hex), rgb array, hsl array, and isDark boolean
 */
export function normalizeLabels(rawLabels) {
  return _.map(rawLabels, (rawLabel) => {
    const { color, id, name } = rawLabel;
    const chromaColor = chroma(`#${color}`);
    const rgb = chromaColor.rgb();
    const hsl = chromaColor.hsl();
    const isDark = chromaColor.luminance() <= 0.5;

    // Convert HSL from chroma format [h(0-360), s(0-1), l(0-1)] to [h, s(0-100), l(0-100)]
    const hslPercent = [
      Math.round(hsl[0]) || 0, // h in degrees, use 0 if NaN
      Math.round(hsl[1] * 100),
      Math.round(hsl[2] * 100),
    ];

    return { id, name, color, rgb, hsl: hslPercent, isDark };
  });
}

__ = {};
