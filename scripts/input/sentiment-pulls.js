import { _ } from 'golgoth';
import { exists, spinner, writeJson } from 'firost';
import { fieldOrder, getSentiment } from '../../lib/helpers/claude.js';
import { forEachInputPull } from '../../lib/helpers/pull.js';

const progress = spinner();
let hasUpdatedSentiment = false;

await forEachInputPull(
  async ({ filepath, data, index, max }) => {
    const { number, title, body } = data;
    progress.tick(`[${index}/${max}] #${number}: ${title}`);

    const sentimentPath = _.replace(filepath, 'basic.json', 'sentiment.json');
    if (await exists(sentimentPath)) {
      return;
    }

    const sentiment = await getSentiment({ title, body });
    await writeJson(sentiment, sentimentPath, { sort: fieldOrder });
    hasUpdatedSentiment = true;
  },
  { concurrency: 30 },
);

if (hasUpdatedSentiment) {
  progress.success('All sentiment from pulls generated');
} else {
  progress.success('No new sentiment to generate for pulls');
}
