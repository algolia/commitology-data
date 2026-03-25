import { spinner, writeJson } from 'firost';
import {
  fieldOrder,
  forEachInputPull,
  getOutputPath,
  normalizePull,
} from '../../lib/helpers/pull.js';

const progress = spinner();

await forEachInputPull(
  async (inputPull) => {
    const { index, max, filepath } = inputPull;
    progress.tick(`[${index}/${max}] ${filepath}`);

    const pullData = await normalizePull(filepath);
    const pullPath = getOutputPath(pullData);

    await writeJson(pullData, pullPath, {
      sort: fieldOrder.output,
    });
  },
  { concurrency: 50 },
);
progress.success('All pull requests generated');
