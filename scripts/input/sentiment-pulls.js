import { _, pMap } from 'golgoth';
import { exists, glob, readJson, spinner, writeJson } from 'firost';
import { fieldOrder, getSentiment } from '../../lib/helpers/claude.js';
import { inputDirectory } from '../../lib/helpers/pull.js';

const CONCURRENCY = 10;

const allPulls = await glob('./**/basic.json', {
  cwd: inputDirectory,
});
const maxPullCount = allPulls.length;
const progress = spinner();

await pMap(
  allPulls,
  async (pullPath, pullIndex) => {
    const pullContent = await readJson(pullPath);

    const { number, title, body } = pullContent;
    const tickTitle = `[${pullIndex}/${maxPullCount}] #${number}: ${title}`;
    progress.tick(tickTitle);

    const sentimentPath = _.replace(pullPath, 'basic.json', 'sentiment.json');
    if (await exists(sentimentPath)) {
      progress.tick(`${tickTitle} (Already exists, skipping)`);
      return;
    }

    const sentiment = await getSentiment({ title, body });

    await writeJson(sentiment, sentimentPath, { sort: fieldOrder });
  },
  { concurrency: CONCURRENCY },
);
progress.success('All sentiment from pulls generated');
