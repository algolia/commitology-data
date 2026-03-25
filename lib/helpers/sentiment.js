import { readJson } from 'firost';

/**
 * Normalizes a sentiment object by extracting only the relevant fields and adding polarity
 * @param {string} sentimentPath - The filepath to the sentiment.json file
 * @returns {Promise<object>} A normalized sentiment object with primary, emotions, and polarity
 */
export async function normalizeSentiment(sentimentPath) {
  const sentimentData = await readJson(sentimentPath);

  // Convert primary sentiment to polarity: positive = 1, neutral = 0, negative = -1
  const polarityMap = {
    positive: 1,
    neutral: 0,
    negative: -1,
  };

  return {
    primary: sentimentData.primary,
    emotions: sentimentData.emotions,
    polarity: polarityMap[sentimentData.primary],
  };
}
