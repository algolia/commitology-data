import { dayjs } from 'golgoth';
import { absolute, consoleError, consoleInfo, gitRoot, write } from 'firost';
import { updateAgentPrompt } from '../../lib/helpers/algolia.js';

// Get the prompt from CLI argument
const prompt = process.argv[2];

if (!prompt) {
  consoleError('Please provide a prompt as an argument');
  consoleError('Usage: yarn run algolia:prompt "Your prompt here"');
  process.exit(1);
}

// Save backup of the prompt, in case we want to go back
const timestamp = dayjs().format('YYYY-MM-DD_HH-mm-ss');
const filename = `${timestamp}.md`;
const filepath = absolute(gitRoot(), 'tmp/prompt', filename);
await write(prompt, filepath);

// Update agent prompt in Algolia
consoleInfo('Updating agent prompt in Algolia...');
try {
  await updateAgentPrompt(prompt);
  consoleInfo('✓ Agent prompt updated successfully in Algolia');
} catch (error) {
  consoleError('Error updating agent prompt:', error.message);
  process.exit(1);
}
