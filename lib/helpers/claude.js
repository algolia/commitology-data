import { firostError } from 'firost';
import Anthropic from '@anthropic-ai/sdk';
import { jsonSchemaOutputFormat } from '@anthropic-ai/sdk/helpers/json-schema';
import Bottleneck from 'bottleneck';
import { getKey } from 'keyleth';
import { isValid } from './sentiment.js';

const CLAUDE_MODEL = 'claude-haiku-4-5';
const RATE_LIMIT_MIN_TIME = 300; // Tier 4: 4000req/min

export const fieldOrder = ['title', 'primary', 'emotions', 'explanation'];

export let __;

/**
 * Executes a callback function with automatic retry logic on failure.
 * @param {Function} callback - The async function to execute and retry on failure
 * @param {object} [userOptions={}] - Configuration options for retry behavior
 * @param {number} [userOptions.maxRetries=3] - Maximum number of retry attempts
 * @param {object} [userState={}] - Internal state object for tracking retry attempts
 * @param {number} [userState.attempt=0] - Current attempt number
 * @returns {Promise<*>} The result of the successful callback execution
 * @throws {Error} The last error encountered if all retry attempts are exhausted
 */
async function retry(callback, userOptions = {}, userState = {}) {
  const options = {
    maxRetries: 3,
    ...userOptions,
  };
  const state = {
    attempt: 0,
    ...userState,
  };

  try {
    return await callback();
  } catch (error) {
    console.log(
      `Failed attempt ${state.attempt + 1} of ${options.maxRetries}: ${error.message}`,
    );
    if (state.attempt >= options.maxRetries) {
      throw error;
    }
    state.attempt++;
    return await retry(callback, options, state);
  }
}

/**
 * Analyzes the sentiment of a GitHub item using Claude API
 * @param {object} input - The input object to analyze
 * @param {string} input.title - The item title
 * @param {string} input.body - The item body
 * @returns {Promise<object>} Sentiment analysis result with primary, emotions, and explanation
 */
export async function getSentiment(input) {
  const { title } = input;
  const body = input.body || '(no description provided)';

  const sentimentSchema = {
    type: 'object',
    properties: {
      primary: {
        type: 'string',
        enum: ['positive', 'negative', 'neutral'],
        description: 'The primary sentiment of the content',
      },
      emotions: {
        type: 'array',
        items: {
          type: 'string',
          enum: [
            'joy',
            'gratitude',
            'confusion',
            'frustration',
            'disappointment',
          ],
        },
        maxItems: 3,
        description: 'Array of 0-3 emotions detected in the content',
      },
      explanation: {
        type: 'string',
        description: 'Brief explanation of the sentiment analysis',
      },
    },
    required: ['primary', 'emotions', 'explanation'],
    additionalProperties: false,
  };

  const prompt = `Analyze the sentiment of this GitHub issue.

Title: "${title}"
Body: "${body}"

Emotion definitions:
- joy: Excitement, happiness, enthusiasm from a user
- gratitude: Thanks, appreciation, acknowledgment
- confusion: Unclear, don't understand, needs clarification
- frustration: Blocked, annoyed, technical difficulties preventing progress
- disappointment: Sad, unfortunate, unmet expectations

Context guidelines:
- Technical/factual issues = neutral with empty emotions
- Implementation tasks and specs (even detailed) = neutral with empty emotions
- Bug reports with blocking issues = frustration or confusion
- User feature requests expressing desire = can be joy
- Prefer empty emotions when in doubt`;

  return await retry(async () => {
    const sentiment = await __.askClaude(prompt, sentimentSchema);

    // Validate sentiment response
    if (!isValid(sentiment)) {
      console.error('Invalid sentiment response');
      console.error(`Data: ${JSON.stringify(sentiment)}`);
      throw firostError(
        'CLAUDE_INVALID_SENTIMENT',
        'Claude returned invalid sentiment',
      );
    }

    return {
      title,
      ...sentiment,
    };
  });
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
   * Asks Claude with rate limiting and returns parsed JSON response
   * @param {string} prompt - The prompt to send
   * @param {object} [jsonSchema] - Optional JSON schema for structured output
   * @returns {Promise<object>} Parsed JSON object from Claude response
   */
  async askClaude(prompt, jsonSchema) {
    const client = await __.getClient();

    const response = await __.schedule(async () => {
      if (jsonSchema) {
        // Use structured output with JSON schema
        const message = await client.messages.parse({
          model: CLAUDE_MODEL,
          max_tokens: 500,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          output_config: {
            format: jsonSchemaOutputFormat(jsonSchema),
          },
        });

        return message.parsed_output;
      }

      // Fallback to regular message creation
      const message = await client.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      return message.content[0].text;
    });

    // If schema was provided, response is already parsed
    if (jsonSchema) {
      return response;
    }

    // Otherwise, parse manually
    let cleaned = response
      .replace(/```json\n/g, '')
      .replace(/```\n/g, '')
      .replace(/```/g, '')
      .trim();

    cleaned = cleaned.replace(/\\(?!["\\/bfnrtu])/g, '\\\\');

    return JSON.parse(cleaned);
  },
};
