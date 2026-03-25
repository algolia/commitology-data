import { spinner, writeJson } from 'firost';
import {
  fieldOrder,
  forEachInputCommit,
  getOutputPath,
  normalizeCommit,
} from '../../lib/helpers/commit.js';

const progress = spinner();

await forEachInputCommit(
  async (inputCommit) => {
    const { index, max, filepath } = inputCommit;
    progress.tick(`[${index}/${max}] ${filepath}`);
    const commitData = await normalizeCommit(filepath);
    const commitPath = getOutputPath(commitData);

    await writeJson(commitData, commitPath, {
      sort: fieldOrder.output,
    });
  },
  { concurrency: 50 },
);
progress.success('All commits generated');
