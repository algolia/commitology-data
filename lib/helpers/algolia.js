import { consoleError } from 'firost';
import { getKey } from 'keyleth';

export let __;

/**
 * Updates the prompt (instructions) of an Algolia AI Agent
 * @param {string} prompt - The new prompt/instructions for the agent
 * @returns {Promise<void>}
 */
export async function updateAgentPrompt(prompt) {
  const credentials = await __.getCredentials();

  // Validate required environment variables
  if (!credentials.apiKey) {
    consoleError('Missing ALGOLIA_ADMIN_API_KEY');
    throw new Error('Missing ALGOLIA_ADMIN_API_KEY');
  }

  const url = `https://${credentials.appId}.algolia.net/agent-studio/1/agents/${credentials.agentId}`;
  const options = {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-algolia-application-id': credentials.appId,
      'x-algolia-api-key': credentials.apiKey,
    },
    body: JSON.stringify({
      instructions: prompt,
    }),
  };

  const response = await fetch(url, options);

  if (!response.ok) {
    const errorText = await response.text();
    consoleError(
      `Failed to update agent prompt: ${response.status} ${response.statusText}`,
    );
    consoleError(errorText);
    throw new Error(`Failed to update agent prompt: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Asks a question to the Algolia AI Agent and returns the response
 * @param {string} question - The question to ask the agent
 * @returns {Promise<string>} The agent's response
 */
export async function askAgent(question) {
  const credentials = await __.getCredentials();

  // Validate required environment variables
  if (!credentials.apiKey) {
    consoleError('Missing ALGOLIA_ADMIN_API_KEY');
    throw new Error('Missing ALGOLIA_ADMIN_API_KEY');
  }

  const url = `https://${credentials.appId}.algolia.net/agent-studio/1/agents/${credentials.agentId}/completions?compatibilityMode=ai-sdk-5&stream=false`;
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-algolia-application-id': credentials.appId,
      'x-algolia-api-key': credentials.apiKey,
    },
    body: JSON.stringify({
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
    }),
  };

  const response = await fetch(url, options);

  if (!response.ok) {
    const errorText = await response.text();
    consoleError(
      `Failed to get agent response: ${response.status} ${response.statusText}`,
    );
    consoleError(errorText);
    throw new Error(`Failed to get agent response: ${response.statusText}`);
  }

  const result = await response.json();

  // Display debug information about tool calls
  if (result.parts) {
    const toolCalls = result.parts.filter((part) =>
      part.type.startsWith('tool-'),
    );
    if (toolCalls.length > 0) {
      console.log('\n🔧 Tool Calls:\n');
      toolCalls.forEach((tool, index) => {
        console.log(`  Tool ${index + 1}: ${tool.type}`);
        if (tool.input) {
          console.log('  Input:');
          console.log(
            `    ${JSON.stringify(tool.input, null, 4).replace(/\n/g, '\n    ')}`,
          );
        }
        if (tool.output && tool.output.nbHits !== undefined) {
          console.log(`  Output: ${tool.output.nbHits} hits found`);
        }
        console.log('');
      });
    }
  }

  // Extract the text response from the completion
  // In ai-sdk-5 mode, response has role and parts array
  if (result.role === 'assistant' && result.parts) {
    // Filter for text parts and concatenate them
    const textParts = result.parts
      .filter((part) => part.type === 'text')
      .map((part) => part.text)
      .join('\n');
    return textParts;
  }

  // Fallback if the format is different
  throw new Error('Unexpected response format from agent');
}

__ = {
  /**
   * Gets Algolia credentials from .env file or defaults
   * @returns {Promise<object>} Object containing appId, agentId, and apiKey
   */
  async getCredentials() {
    const appId = (await getKey('ALGOLIA_APP_ID')) || 'OKF83BFQS4';
    const agentId =
      (await getKey('ALGOLIA_AGENT_ID')) ||
      '644a77bb-d575-4254-ba6f-15e502b0a64d';
    const apiKey = await getKey('ALGOLIA_ADMIN_API_KEY');

    return {
      appId,
      agentId,
      apiKey,
    };
  },
};
