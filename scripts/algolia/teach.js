#!/usr/bin/env node
import { _, dayjs } from 'golgoth';
import { absolute, gitRoot, read, write, writeJson } from 'firost';
import {
  getAgentConfig,
  updateAgentConfig,
} from '../../lib/helpers/algolia.js';

// Load local configuration files
const newInstructions = await read(
  absolute(gitRoot(), 'data/agent/instructions.md'),
);
const newConfig = JSON.parse(
  await read(absolute(gitRoot(), 'data/agent/config.json')),
);
const newAgentConfig = {
  instructions: newInstructions,
  ...newConfig,
};

// Fetch current agent configuration from API
const currentAgentConfig = await getAgentConfig();

// Exit early if nothing changed
if (_.isEqual(currentAgentConfig, newAgentConfig)) {
  process.exit(0);
}

// Backup current config before updating
const timestamp = dayjs().format('YYYY-MM-DD_HH-mm-ss');
const backupDir = absolute(gitRoot(), 'tmp/agent', timestamp);

await write(currentAgentConfig.instructions, `${backupDir}/instructions.md`);
await writeJson(
  {
    providerId: currentAgentConfig.providerId,
    model: currentAgentConfig.model,
    tools: currentAgentConfig.tools,
  },
  `${backupDir}/config.json`,
);

// Update agent configuration
await updateAgentConfig(newAgentConfig);
