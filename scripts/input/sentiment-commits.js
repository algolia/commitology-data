import { _ } from 'golgoth';
import { exists, spinner, writeJson } from 'firost';
import { fieldOrder, getSentiment } from '../../lib/helpers/claude.js';
import { forEachInputCommit } from '../../lib/helpers/commit.js';

const progress = spinner();
let hasUpdatedSentiment = false;

await forEachInputCommit(
  async ({ filepath, data, index, max }) => {
    const { hash, subject, body } = data;
    progress.tick(`[${index}/${max}] ${hash}: ${subject}`);

    const sentimentPath = _.replace(filepath, 'commit.json', 'sentiment.json');
    if (await exists(sentimentPath)) {
      return;
    }

    const sentiment = await getSentiment({ title: subject, body });
    await writeJson(sentiment, sentimentPath, { sort: fieldOrder });
    hasUpdatedSentiment = true;
  },
  { concurrency: 30 },
);

if (hasUpdatedSentiment) {
  progress.success('All sentiment from commits generated');
} else {
  progress.success('No new sentiment to generate for commits');
}
