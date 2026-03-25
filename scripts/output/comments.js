import { spinner, writeJson } from 'firost';
import {
  fieldOrder,
  forEachInputComment,
  getOutputPath,
  normalizeComment,
} from '../../lib/helpers/comment.js';

const progress = spinner();

await forEachInputComment(
  async (inputComment) => {
    const { index, max, data, filepath } = inputComment;
    progress.tick(`[${index}/${max}] Comment #${data.id}`);

    const commentData = await normalizeComment(data, filepath);
    const commentPath = getOutputPath(commentData);

    await writeJson(commentData, commentPath, {
      sort: fieldOrder,
    });
  },
  { concurrency: 50 },
);
progress.success('All comments generated');
