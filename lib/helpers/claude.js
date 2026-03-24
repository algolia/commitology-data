import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Rate limiting: max 50 requests per minute
const RATE_LIMIT_DELAY_MS = 1200; // 60000ms / 50 = 1200ms between requests
let lastRequestTime = 0;

const SENTIMENT_PROMPT = (
  title,
  body,
) => `Analyze the sentiment of this GitHub issue.

Title: "${title}"
Body: "${body || '(no description provided)'}"

Return ONLY valid JSON:
{
  "primary": "positive" | "negative" | "neutral",
  "emotions": [],
  "score": 0.0
}

Rules:
- primary: Must be exactly one of: "positive", "negative", "neutral"
- emotions: Array of 0-2 emotions from: ["joy", "gratitude", "confusion", "frustration", "disappointment"]
  - joy: Excitement, happiness, enthusiasm
  - gratitude: Thanks, appreciation
  - confusion: Unclear, don't understand
  - frustration: Blocked, annoyed, technical difficulties
  - disappointment: Sad, unfortunate, too bad
- score: Confidence level 0.0 to 1.0
- Technical/factual issues = neutral with empty emotions
- Bug reports often = frustration or confusion
- Feature requests can be = joy or neutral
- Max 2 emotions if both strong

Return ONLY the JSON object, no explanation.`;

/**
 * Wait for rate limit delay
 */
async function waitForRateLimit() {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < RATE_LIMIT_DELAY_MS) {
    const waitTime = RATE_LIMIT_DELAY_MS - timeSinceLastRequest;
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }

  lastRequestTime = Date.now();
}

/**
 * Parse JSON from Claude response, handling potential markdown code blocks
 * @param text
 */
function parseClaudeJSON(text) {
  // Remove markdown code blocks if present
  const cleaned = text
    .replace(/```json\n/g, '')
    .replace(/```\n/g, '')
    .replace(/```/g, '')
    .trim();

  return JSON.parse(cleaned);
}

/**
 * Analyze sentiment of an issue using Claude API
 * @param {string} title - Issue title
 * @param {string} body - Issue body
 * @param {number} retries - Number of retries left (default: 3)
 * @returns {Promise<{primary: string, emotions: string[], score: number}>}
 */
export async function analyzeSentiment(title, body, retries = 3) {
  try {
    // Rate limiting
    await waitForRateLimit();

    // Call Claude API
    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: SENTIMENT_PROMPT(title, body),
        },
      ],
    });

    // Extract and parse response
    const responseText = message.content[0].text;
    const sentiment = parseClaudeJSON(responseText);

    // Validate response structure
    if (
      !sentiment.primary ||
      !Array.isArray(sentiment.emotions) ||
      typeof sentiment.score !== 'number'
    ) {
      throw new Error(
        `Invalid response structure: ${JSON.stringify(sentiment)}`,
      );
    }

    // Validate primary value
    const validPrimary = ['positive', 'negative', 'neutral'];
    if (!validPrimary.includes(sentiment.primary)) {
      throw new Error(`Invalid primary value: ${sentiment.primary}`);
    }

    // Validate emotions
    const validEmotions = [
      'joy',
      'gratitude',
      'confusion',
      'frustration',
      'disappointment',
    ];
    for (const emotion of sentiment.emotions) {
      if (!validEmotions.includes(emotion)) {
        throw new Error(`Invalid emotion: ${emotion}`);
      }
    }

    // Validate score range
    if (sentiment.score < 0 || sentiment.score > 1) {
      throw new Error(`Score out of range: ${sentiment.score}`);
    }

    return sentiment;
  } catch (error) {
    // Retry on error
    if (retries > 0) {
      console.warn(
        `Error analyzing sentiment, ${retries} retries left:`,
        error.message,
      );
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2s before retry
      return analyzeSentiment(title, body, retries - 1);
    }

    // If all retries exhausted, throw error
    throw new Error(
      `Failed to analyze sentiment after 3 retries: ${error.message}`,
    );
  }
}
