import { _ } from 'golgoth';
import { firostError } from 'firost';
import Anthropic from '@anthropic-ai/sdk';
import Bottleneck from 'bottleneck';
import { getKey } from 'keyleth';

const CLAUDE_MODEL = 'claude-3-haiku-20240307';
const RATE_LIMIT_MIN_TIME = 30; // Tier 4: 4000req/min

export const fieldOrder = [
  'title',
  'primary',
  'emotions',
  'score',
  'explanation',
];

export let __;

/**
 * Analyzes the sentiment of a GitHub item using Claude API
 * @param {object} input - The input object to analyze
 * @param {string} input.title - The item title
 * @param {string} input.body - The item body
 * @returns {Promise<object>} Sentiment analysis result with primary, emotions, and score
 */
export async function getSentiment(input) {
  const { title } = input;
  const body = input.body || '(no description provided)';

  const prompt = `Analyze the sentiment of this GitHub issue.

Title: "${title}"
Body: "${body}"

Return ONLY valid JSON:
{
  "primary": "positive" | "negative" | "neutral",
  "emotions": [],
  "score": 0.0,
  "explanation": ""
}

Rules:
- primary: Must be exactly one of: "positive", "negative", "neutral"
- emotions: Array of 0-2 emotions from: ["joy", "gratitude", "confusion", "frustration", "disappointment"]
  - joy: Excitement, happiness, enthusiasm from a user
  - gratitude: Thanks, appreciation, acknowledgment
  - confusion: Unclear, don't understand, needs clarification
  - frustration: Blocked, annoyed, technical difficulties preventing progress
  - disappointment: Sad, unfortunate, unmet expectations
- score: Confidence level 0.0 to 1.0
- explanation: Brief explanation (1-2 sentences) of why you chose this sentiment and emotions
- Technical/factual issues = neutral with empty emotions
- Implementation tasks and specs (even detailed) = neutral with empty emotions
- Bug reports with blocking issues = frustration or confusion
- User feature requests expressing desire = can be joy
- Max 2 emotions if both strong, prefer empty emotions when in doubt

Return ONLY the JSON object, no additional text.`;

  const sentiment = await __.askClaude(prompt);

  return {
    ...sentiment,
    title,
  };
}

__ = {
  /**
   * Cached Anthropic client instance
   */
  client: null,

  /**
   * Cached Bottleneck limiter instance
   */
  limiter: null,

  /**
   * Gets or creates the Anthropic client with API key from environment
   * @returns {Promise<Anthropic>} Configured Anthropic client
   */
  async getClient() {
    if (__.client) {
      return __.client;
    }

    const apiKey = await getKey('ANTHROPIC_API_KEY');
    if (!apiKey) {
      throw firostError(
        'CLAUDE_MISSING_API_KEY',
        'Missing ANTHROPIC_API_KEY environment variable',
      );
    }

    __.client = new Anthropic({ apiKey });
    return __.client;
  },

  /**
   * Gets or creates the rate limiter and schedules a function
   * @param {Function} fn - The function to schedule
   * @returns {Promise<any>} The result of the scheduled function
   */
  async schedule(fn) {
    if (!__.limiter) {
      __.limiter = new Bottleneck({
        minTime: RATE_LIMIT_MIN_TIME,
      });
    }

    return await __.limiter.schedule(fn);
  },

  /**
   * Asks Claude with rate limiting and parses JSON response
   * @param {string} prompt - The prompt to send
   * @returns {Promise<object>} Parsed JSON object from Claude response
   */
  async askClaude(prompt) {
    const client = await __.getClient();
    const response = await __.schedule(async () => {
      const message = await client.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 200,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      return message.content[0].text;
    });

    try {
      // Remove markdown code blocks if present using lodash chain
      const cleaned = _.chain(response)
        .replace(/```json\n/g, '')
        .replace(/```\n/g, '')
        .replace(/```/g, '')
        .trim()
        .value();

      return JSON.parse(cleaned);
    } catch (error) {
      throw firostError(
        'CLAUDE_PARSE_RESPONSE_FAILED',
        `Failed to parse Claude response: ${error.message}`,
      );
    }
  },
};
