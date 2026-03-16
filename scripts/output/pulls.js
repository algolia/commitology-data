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
    const { index, max, data } = inputPull;
    progress.tick(`[${index}/${max}] ${data.title}`);

    const pullData = await normalizePull(data);
    const pullPath = getOutputPath(pullData);

    await writeJson(pullData, pullPath, {
      sort: fieldOrder.output,
    });
  },
  { concurrency: 50 },
);
progress.success('All pull requests generated');
