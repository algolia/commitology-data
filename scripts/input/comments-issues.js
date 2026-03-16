import { dayjs, pMap } from 'golgoth';
import {
  absolute,
  exists,
  glob,
  readJson,
  sleep,
  spinner,
  writeJson,
} from 'firost';
import { getComments } from '../../lib/helpers/github.js';
import { commentsDirectory, inputDirectory } from '../../lib/helpers/issue.js';

const CONCURRENCY = 10;

const allIssues = await glob('./**/*.json', { cwd: inputDirectory });
const maxIssueCount = allIssues.length;
const progress = spinner();

await pMap(
  allIssues,
  async (issuePath, issueIndex) => {
    const issueContent = await readJson(issuePath);

    const { number, title, created_at } = issueContent;
    const tickTitle = `[${issueIndex}/${maxIssueCount}] ${title}`;
    progress.tick(tickTitle);

    const issueDatePath = dayjs(created_at).format('YYYY/MM');
    const commentsPath = absolute(
      commentsDirectory,
      'issues',
      issueDatePath,
      `${number}.json`,
    );

    if (await exists(commentsPath)) {
      progress.tick(`${tickTitle} (Already exists, skipping)`);
      return;
    }

    const commentsContent = await getComments(number);

    await writeJson(commentsContent, commentsPath);
    progress.tick(`${tickTitle} (Throttling for rate limit...)`);
    await sleep(1000);
  },
  { concurrency: CONCURRENCY },
);
progress.success('All comments from issues fetched');
