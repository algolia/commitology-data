#!/usr/bin/env node
import { consoleError, consoleSuccess } from 'firost';
import { read } from 'firost';
import { absolute, gitRoot } from 'firost';
import { getKey } from 'keyleth';

/**
 * Updates the AI Agent configuration from config files
 * Usage: yarn run algolia:agent-config-write
 */
async function writeAgentConfig() {
  const appId = (await getKey('ALGOLIA_APP_ID')) || 'OKF83BFQS4';
  const agentId =
    (await getKey('ALGOLIA_AGENT_ID')) ||
    '644a77bb-d575-4254-ba6f-15e502b0a64d';
  const apiKey = await getKey('ALGOLIA_ADMIN_API_KEY');

  if (!apiKey) {
    consoleError('Missing ALGOLIA_ADMIN_API_KEY');
    throw new Error('Missing ALGOLIA_ADMIN_API_KEY');
  }

  console.log('📝 Writing agent configuration from files...\n');

  // Load configuration files
  const promptPath = absolute(gitRoot(), 'data/agent/prompt.md');
  const configPath = absolute(gitRoot(), 'data/agent/config.json');

  const prompt = await read(promptPath);
  const config = JSON.parse(await read(configPath));

  console.log(`Prompt source: ${promptPath}`);
  console.log(`Config source: ${configPath}\n`);

  // Prepare update payload
  const payload = {
    instructions: prompt,
    ...config,
  };

  const url = `https://${appId}.algolia.net/agent-studio/1/agents/${agentId}`;
  const options = {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-algolia-application-id': appId,
      'x-algolia-api-key': apiKey,
    },
    body: JSON.stringify(payload),
  };

  const response = await fetch(url, options);

  if (!response.ok) {
    const errorText = await response.text();
    consoleError(
      `Failed to write agent config: ${response.status} ${response.statusText}`,
    );
    consoleError(errorText);
    throw new Error(`Failed to write agent config: ${response.statusText}`);
  }

  consoleSuccess('✓ Agent configuration updated successfully');
  console.log('\nUpdated:');
  console.log(`  - Instructions (${prompt.length} chars)`);
  if (config.providerId) console.log(`  - Provider: ${config.providerId}`);
  if (config.model) console.log(`  - Model: ${config.model}`);
  if (config.tools) console.log(`  - Tools: ${config.tools.length} configured`);

  return await response.json();
}

try {
  await writeAgentConfig();
} catch (error) {
  consoleError(error.message);
  process.exit(1);
}
