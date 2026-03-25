import { dayjs } from 'golgoth';
import { absolute, exists, spinner, writeJson } from 'firost';
import { getComments } from '../../lib/helpers/github.js';
import {
  commentsDirectory,
  forEachInputIssue,
} from '../../lib/helpers/issue.js';

const progress = spinner();

await forEachInputIssue(
  async ({ data, index, max }) => {
    const { number, title, created_at } = data;
    progress.tick(`[${index}/${max}] ${title}`);

    const issueDatePath = dayjs(created_at).format('YYYY/MM');
    const commentsPath = absolute(
      commentsDirectory,
      issueDatePath,
      number,
      'comments.json',
    );

    if (await exists(commentsPath)) {
      return;
    }

    const commentsContent = await getComments(number);
    await writeJson(commentsContent, commentsPath);
  },
  { concurrency: 10 },
);

progress.success('All comments from issues fetched');
