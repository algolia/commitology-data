import { _, pMap } from 'golgoth';
import { exists, glob, readJson, spinner, writeJson } from 'firost';
import { fieldOrder, getSentiment } from '../../lib/helpers/claude.js';
import { inputDirectory } from '../../lib/helpers/issue.js';

const CONCURRENCY = 10;

const allIssues = await glob('./2015/*/**/issue.json', {
  cwd: inputDirectory,
});
const maxIssueCount = allIssues.length;
const progress = spinner();

await pMap(
  _.slice(allIssues, 30),
  async (issuePath, issueIndex) => {
    const issueContent = await readJson(issuePath);

    const { number, title, body } = issueContent;
    const tickTitle = `[${issueIndex}/${maxIssueCount}] #${number}: ${title}`;
    progress.tick(tickTitle);

    const sentimentPath = _.replace(issuePath, 'issue.json', 'sentiment.json');
    if (await exists(sentimentPath)) {
      progress.tick(`${tickTitle} (Already exists, skipping)`);
      return;
    }

    const sentiment = await getSentiment({ title, body });

    await writeJson(sentiment, sentimentPath, { sort: fieldOrder });
  },
  { concurrency: CONCURRENCY },
);
progress.success('All sentiment from issues generated');
