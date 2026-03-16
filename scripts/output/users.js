import { spinner, writeJson } from 'firost';
import {
  fieldOrder,
  forEachInputUser,
  getOutputPath,
  normalizeUser,
} from '../../lib/helpers/user.js';

const progress = spinner();

await forEachInputUser(
  async (inputUser) => {
    const { index, max, data } = inputUser;
    progress.tick(`[${index}/${max}] ${data.login}`);

    const userData = await normalizeUser(data);
    const userPath = getOutputPath(data.id);

    await writeJson(userData, userPath, {
      sort: fieldOrder.output,
    });
  },
  { concurrency: 50 },
);
progress.success('All users generated');
