import { _ } from 'golgoth';
import { exists, spinner, writeJson } from 'firost';
import { fieldOrder, getSentiment } from '../../lib/helpers/claude.js';
import { forEachInputComment } from '../../lib/helpers/comment.js';

const progress = spinner();
let hasUpdatedSentiment = false;

await forEachInputComment(
  async ({ filepath, data, index, max }) => {
    const { id, body } = data;
    progress.tick(`[${index}/${max}] Comment #${id}`);

    const sentimentPath = _.replace(
      filepath,
      'comments.json',
      `sentiment/${id}.json`,
    );

    if (await exists(sentimentPath)) {
      return;
    }

    const sentiment = await getSentiment({ title: '', body });
    await writeJson(sentiment, sentimentPath, { sort: fieldOrder });
    hasUpdatedSentiment = true;
  },
  { concurrency: 30 },
);

if (hasUpdatedSentiment) {
  progress.success('All sentiment from comments generated');
} else {
  progress.success('No new sentiment to generate for comments');
}
