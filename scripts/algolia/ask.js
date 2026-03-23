import { consoleError, consoleInfo } from 'firost';
import { askAgent } from '../../lib/helpers/algolia.js';

// Get the question from CLI argument
const question = process.argv[2];

if (!question) {
  consoleError('Please provide a question as an argument');
  consoleError('Usage: yarn run algolia:ask "Your question here"');
  process.exit(1);
}

// Ask the agent
consoleInfo('Asking agent...\n');
try {
  const answer = await askAgent(question);
  console.log(answer);
} catch (error) {
  consoleError('Error asking agent:', error.message);
  if (error.stack) {
    console.error(error.stack);
  }
  process.exit(1);
}
