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
    const { index, max, data } = inputCommit;
    progress.tick(`[${index}/${max}] ${data.subject}`);
    const commitData = normalizeCommit(data);
    console.log(commitData);
    const commitPath = getOutputPath(commitData);

    await writeJson(commitData, commitPath, {
      sort: fieldOrder.output,
    });
  },
  { concurrency: 50 },
);
progress.success('All commits generated');
