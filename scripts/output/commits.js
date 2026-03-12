import { spinner, writeJson } from 'firost';
import { outputCommitFieldOrder } from '../../lib/config.js';
import {
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
    const commitPath = getOutputPath(commitData);

    await writeJson(commitData, commitPath, {
      sort: outputCommitFieldOrder,
    });
  },
  { concurrency: 50 },
);
progress.success('All commits generated');
