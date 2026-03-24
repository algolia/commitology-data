import { _ } from 'golgoth';
import { firostError } from 'firost';
import { getKey } from 'keyleth';

export let __;

/**
 * Asks a question to the Algolia AI Agent and returns the response
 * @param {string} question - The question to ask the agent
 * @returns {Promise<object>} Object with { answer: string, raw: object }
 */
export async function askAgent(question) {
  const raw = await __.apiCall(
    'POST',
    '/completions?compatibilityMode=ai-sdk-5&stream=false',
    {
      messages: [
        {
          role: 'user',
          parts: [
            {
              text: question,
            },
          ],
        },
      ],
    },
  );
  const answer = _.chain(raw.parts)
    .filter({ type: 'text' })
    .map('text')
    .join('\n')
    .value();

  // Try to parse the JSON
  let json;
  try {
    json = JSON.parse(answer);
  } catch (_err) {
    throw firostError('ALGOLIA_AGENT_ERROR_JSON', `Not valid JSON: ${answer}`);
  }

  return {
    answer,
    json,
    raw,
  };
}

/**
 * Gets the current configuration of the Algolia AI Agent
 * @returns {Promise<object>} The agent configuration including instructions, model, tools, etc.
 */
export async function getAgentConfig() {
  return await __.apiCall('GET', '');
}

/**
 * Updates the Algolia AI Agent configuration
 * @param {object} config - Configuration object to update (can include instructions, model, tools, etc.)
 * @returns {Promise<object>} The updated agent configuration
 */
export async function updateAgentConfig(config) {
  return await __.apiCall('PATCH', '', config);
}

__ = {
  /**
   * Gets Algolia credentials from .env file or defaults
   * Throws an error if ALGOLIA_ADMIN_API_KEY is missing
   * @returns {Promise<object>} Object containing appId, agentId, and apiKey
   * @throws {Error} If ALGOLIA_ADMIN_API_KEY is not configured
   */
  async getCredentials() {
    const appId = await getKey('ALGOLIA_APP_ID', 'OKF83BFQS4');
    const agentId = await getKey(
      'ALGOLIA_AGENT_ID',
      '644a77bb-d575-4254-ba6f-15e502b0a64d',
    );
    const apiKey = await getKey('ALGOLIA_ADMIN_API_KEY');

    if (!apiKey) {
      throw firostError(
        'ALGOLIA_MISSING_API_KEY',
        'Missing ALGOLIA_ADMIN_API_KEY. Please configure it in your .env file.',
      );
    }

    return {
      appId,
      agentId,
      apiKey,
    };
  },

  /**
   * Makes an API call to Algolia Agent Studio
   * @param {string} method - HTTP method (GET, POST, PATCH)
   * @param {string} path - API path relative to /agents/{agentId} (e.g., '', '/completions?...')
   * @param {object} [body] - Optional request body
   * @returns {Promise<object>} The API response as JSON
   */
  async apiCall(method, path, body = null) {
    const credentials = await this.getCredentials();

    const url = `https://${credentials.appId}.algolia.net/agent-studio/1/agents/${credentials.agentId}${path}`;
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-algolia-application-id': credentials.appId,
        'x-algolia-api-key': credentials.apiKey,
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      throw firostError(
        'ALGOLIA_AGENT_ERROR',
        `Failed ${method} ${path}: ${response.status} ${response.statusText}\n${errorText}`,
      );
    }

    return await response.json();
  },
};
