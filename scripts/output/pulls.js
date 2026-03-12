import { spinner, writeJson } from 'firost';
import { outputPullFieldOrder } from '../../lib/config.js';
import {
  forEachInputPull,
  getOutputPath,
  normalizePull,
} from '../../lib/helpers/pull.js';

const progress = spinner();

await forEachInputPull(
  async (inputPull) => {
    const { index, max, data } = inputPull;
    progress.tick(`[${index}/${max}] ${data.title}`);

    const pullData = await normalizePull(data);
    const pullPath = getOutputPath(pullData);

    await writeJson(pullData, pullPath, {
      sort: outputPullFieldOrder,
    });
  },
  { concurrency: 50 },
);
progress.success('All pull requests generated');
