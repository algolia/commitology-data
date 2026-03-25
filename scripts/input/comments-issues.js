import { dayjs } from 'golgoth';
import { absolute, exists, readJson, spinner, writeJson } from 'firost';
import { getComments } from '../../lib/helpers/github.js';
import {
  commentsDirectory,
  forEachInputIssue,
} from '../../lib/helpers/issue.js';

const progress = spinner();
let hasUpdatedComments = false;

await forEachInputIssue(
  async ({ data, index, max }) => {
    const { number, title, created_at, comments: commentCount } = data;
    progress.tick(`[${index}/${max}] ${title}`);

    const issueDatePath = dayjs(created_at).format('YYYY/MM');
    const commentsPath = absolute(
      commentsDirectory,
      issueDatePath,
      number,
      'comments.json',
    );

    // Check if comments file exists and has the same count
    if (await exists(commentsPath)) {
      const localComments = await readJson(commentsPath);
      if (localComments.length === commentCount) {
        return;
      }
    }

    // Fetch and save comments
    const commentsContent = await getComments(number);
    await writeJson(commentsContent, commentsPath);
    hasUpdatedComments = true;
  },
  { concurrency: 10 },
);

if (hasUpdatedComments) {
  progress.success('All comments from issues fetched');
} else {
  progress.success('No updated comments since last fetch');
}
