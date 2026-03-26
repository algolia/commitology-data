import { _ } from 'golgoth';
import { readJson } from 'firost';

// Valid values for sentiment fields
const VALID_PRIMARY_VALUES = ['positive', 'negative', 'neutral'];
const VALID_EMOTIONS = [
  'joy',
  'gratitude',
  'confusion',
  'frustration',
  'disappointment',
];

// Emotion weights for score calculation
const EMOTION_WEIGHTS = {
  joy: 5,
  gratitude: 5,
  frustration: -5,
  disappointment: -5,
  confusion: -5,
};

// Reaction weights for score calculation
const REACTION_WEIGHTS = {
  '+1': 2,
  heart: 2,
  laugh: 2,
  rocket: 2,
  hooray: 2,
  eyes: 1,
  '-1': -2,
  confused: -2,
};

/**
 * Calculates a sentiment score from 1-100 based on primary sentiment, emotions, and reactions
 * @param {object} sentiment - The sentiment data with primary and emotions
 * @param {object} [reactions] - Optional reactions object to adjust the score
 * @returns {number} A score from 1 (most negative) to 100 (most positive)
 */
export function calculateSentimentScore(sentiment, reactions = {}) {
  // Base score according to primary sentiment
  const baseScores = {
    negative: 16, // Middle of 0-33 range
    neutral: 50, // Middle of 34-66 range
    positive: 83, // Middle of 67-100 range
  };

  let score = baseScores[sentiment.primary];

  // Adjust based on emotions
  _.forEach(sentiment.emotions, (emotion) => {
    score += EMOTION_WEIGHTS[emotion] || 0;
  });

  // Adjust based on reactions if provided
  score += _.chain(reactions)
    .reduce((sum, count, reactionType) => {
      return sum + count * (REACTION_WEIGHTS[reactionType] || 0);
    }, 0)
    .value();

  // Clamp score to 1-100 range
  score = Math.round(_.clamp(score, 1, 100));

  return score;
}

/**
 * Validates if a sentiment object has valid primary, emotions, and score values
 * @param {object} sentiment - The sentiment object to validate
 * @returns {boolean} True if valid, false otherwise
 */
export function isValid(sentiment) {
  if (!sentiment || typeof sentiment !== 'object') {
    return false;
  }

  // Check primary is valid
  if (!VALID_PRIMARY_VALUES.includes(sentiment.primary)) {
    return false;
  }

  // Check emotions is an array
  if (!Array.isArray(sentiment.emotions)) {
    return false;
  }

  // Check all emotions are valid
  if (
    !sentiment.emotions.every((emotion) => VALID_EMOTIONS.includes(emotion))
  ) {
    return false;
  }

  // Check score is a valid number between 1 and 100
  if (
    typeof sentiment.score !== 'number' ||
    sentiment.score < 1 ||
    sentiment.score > 100
  ) {
    return false;
  }

  return true;
}

/**
 * Normalizes a sentiment object by extracting only the relevant fields and calculating score
 * @param {string} sentimentPath - The filepath to the sentiment.json file
 * @param {object} [reactions] - Optional reactions object to adjust the score
 * @returns {Promise<object>} A normalized sentiment object with score, primary, and emotions
 */
export async function normalizeSentiment(sentimentPath, reactions = null) {
  const sentimentData = await readJson(sentimentPath);

  const score = calculateSentimentScore(sentimentData, reactions);

  const result = {
    score,
    primary: sentimentData.primary,
    emotions: sentimentData.emotions,
  };

  if (!isValid(result)) {
    throw new Error(
      `Invalid sentiment data in ${sentimentPath}: ${JSON.stringify(result)}`,
    );
  }

  return result;
}
