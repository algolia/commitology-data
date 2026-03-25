import { dayjs } from 'golgoth';
import { absolute, exists, readJson, spinner, writeJson } from 'firost';
import { getComments } from '../../lib/helpers/github.js';
import { commentsDirectory, forEachInputPull } from '../../lib/helpers/pull.js';

const progress = spinner();
let hasUpdatedComments = false;

await forEachInputPull(
  async ({ data, index, max }) => {
    const { number, title, created_at, comments: commentCount } = data;
    progress.tick(`[${index}/${max}] ${title}`);

    const pullDatePath = dayjs(created_at).format('YYYY/MM');
    const commentsPath = absolute(
      commentsDirectory,
      pullDatePath,
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
  progress.success('All comments from pull requests fetched');
} else {
  progress.success('No updated comments since last fetch');
}
