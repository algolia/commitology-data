#!/usr/bin/env node
import { consoleError, consoleSuccess } from 'firost';
import { getKey } from 'keyleth';

/**
 * Reads and displays the complete configuration of the AI Agent
 */
async function readAgentConfig() {
  const appId = (await getKey('ALGOLIA_APP_ID')) || 'OKF83BFQS4';
  const agentId =
    (await getKey('ALGOLIA_AGENT_ID')) ||
    '644a77bb-d575-4254-ba6f-15e502b0a64d';
  const apiKey = await getKey('ALGOLIA_ADMIN_API_KEY');

  if (!apiKey) {
    consoleError('Missing ALGOLIA_ADMIN_API_KEY');
    throw new Error('Missing ALGOLIA_ADMIN_API_KEY');
  }

  console.log('🔍 Reading agent configuration...\n');
  console.log(`App ID: ${appId}`);
  console.log(`Agent ID: ${agentId}\n`);

  const url = `https://${appId}.algolia.net/agent-studio/1/agents/${agentId}`;
  const options = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'x-algolia-application-id': appId,
      'x-algolia-api-key': apiKey,
    },
  };

  const response = await fetch(url, options);

  if (!response.ok) {
    const errorText = await response.text();
    consoleError(
      `Failed to read agent config: ${response.status} ${response.statusText}`,
    );
    consoleError(errorText);
    throw new Error(`Failed to read agent config: ${response.statusText}`);
  }

  const config = await response.json();

  console.log('📋 Full Agent Configuration:\n');
  console.log(JSON.stringify(config, null, 2));

  // Display tools in a more readable format
  if (config.tools && config.tools.length > 0) {
    console.log('\n🔧 Configured Tools:\n');
    config.tools.forEach((tool, index) => {
      console.log(`Tool ${index + 1}:`);
      console.log(`  Type: ${tool.type}`);
      console.log(`  Name: ${tool.name || '(default)'}`);

      if (tool.type === 'algolia_search_index' && tool.indices) {
        console.log(`  Indices (${tool.indices.length}):`);
        tool.indices.forEach((idx, i) => {
          console.log(`    ${i + 1}. ${idx.index}`);
          if (idx.description) {
            console.log(`       Description: ${idx.description}`);
          }
        });
      }

      // Display input schema if available
      if (tool.inputSchema) {
        console.log('  Input Schema:');
        console.log(
          `    ${JSON.stringify(tool.inputSchema, null, 4).replace(/\n/g, '\n    ')}`,
        );
      }
    });
  } else {
    console.log('\n⚠️  No tools configured');
  }

  // Display instructions preview
  if (config.instructions) {
    console.log('\n📝 Instructions Preview (first 300 chars):\n');
    console.log(
      config.instructions.substring(0, 300) +
        (config.instructions.length > 300 ? '...' : ''),
    );
    console.log(
      `\nTotal instructions length: ${config.instructions.length} characters`,
    );
  }

  consoleSuccess('\n✓ Agent configuration read successfully');
  return config;
}

try {
  await readAgentConfig();
} catch (error) {
  consoleError(error.message);
  process.exit(1);
}
