import { askAgent } from '../../lib/helpers/algolia.js';

const question = process.argv[2];

if (!question) {
  console.error('Usage: yarn run algolia:ask "Your question here"');
  process.exit(1);
}

try {
  const response = await askAgent(question);
  console.log(JSON.stringify(response, null, 2));
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
