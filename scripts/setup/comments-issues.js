import { dayjs, pMap } from 'golgoth';
import { absolute, glob, readJson, sleep, spinner, writeJson } from 'firost';
import {
  dataInputCommentsPath,
  dataInputIssuesPath,
} from '../../lib/config.js';
import { getComments } from '../../lib/github.js';

const CONCURRENCY = 10;

const allIssues = await glob('./**/*.json', { cwd: dataInputIssuesPath });
const maxIssueCount = allIssues.length;
const progress = spinner();

await pMap(
  allIssues,
  async (issuePath, issueIndex) => {
    const issueContent = await readJson(issuePath);

    const { number, title, created_at } = issueContent;
    const tickTitle = `[${issueIndex}/${maxIssueCount}] ${title}`;
    progress.tick(tickTitle);

    const commentsContent = await getComments(number);

    const issueDatePath = dayjs(created_at).format('YYYY/MM');
    const commentsPath = absolute(
      dataInputCommentsPath,
      issueDatePath,
      `${number}.json`,
    );

    await writeJson(commentsContent, commentsPath);
    progress.tick(`${tickTitle} (Throttling for rate limit...)`);
    await sleep(1000);
  },
  { concurrency: CONCURRENCY },
);
progress.success('All comments from issues fetched');
