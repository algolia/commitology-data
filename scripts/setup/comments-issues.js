import { dayjs, pMap } from 'golgoth';
import { absolute, glob, readJson, spinner, writeJson } from 'firost';
import {
  dataInputCommentsPath,
  dataInputIssuesPath,
} from '../../lib/config.js';
import { getComments } from '../../lib/github.js';

const CONCURRENCY = 5;

const allIssues = await glob('./**/*.json', { cwd: dataInputIssuesPath });
const progress = spinner(allIssues.length);

await pMap(
  allIssues,
  async (issuePath) => {
    const issueContent = await readJson(issuePath);

    const { number, title, created_at } = issueContent;
    progress.tick(title);

    const commentsContent = await getComments(number);

    const issueDatePath = dayjs(created_at).format('YYYY/MM');
    const commentsPath = absolute(
      dataInputCommentsPath,
      issueDatePath,
      `${number}.json`,
    );

    await writeJson(commentsContent, commentsPath);
  },
  { concurrency: CONCURRENCY },
);
progress.success('All comments from issues fetched');
