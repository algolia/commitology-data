import { _ } from 'golgoth';
import { exists, spinner, writeJson } from 'firost';
import { fieldOrder, getSentiment } from '../../lib/helpers/claude.js';
import { forEachInputIssue } from '../../lib/helpers/issue.js';

const progress = spinner();

await forEachInputIssue(
  async ({ filepath, data, index, max }) => {
    const { number, title, body } = data;
    progress.tick(`[${index}/${max}] #${number}: ${title}`);

    const sentimentPath = _.replace(filepath, 'issue.json', 'sentiment.json');
    if (await exists(sentimentPath)) {
      return;
    }

    const sentiment = await getSentiment({ title, body });
    await writeJson(sentiment, sentimentPath, { sort: fieldOrder });
  },
  { concurrency: 30 },
);

progress.success('All sentiment from issues generated');
