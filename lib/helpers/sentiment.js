import { readJson } from 'firost';

/**
 * Normalizes a sentiment object by extracting only the relevant fields
 * @param {string} sentimentPath - The filepath to the sentiment.json file
 * @returns {Promise<object>} A normalized sentiment object with primary, emotions, and score
 */
export async function normalizeSentiment(sentimentPath) {
  const sentimentData = await readJson(sentimentPath);
  return {
    primary: sentimentData.primary,
    emotions: sentimentData.emotions,
    score: sentimentData.score,
  };
}
