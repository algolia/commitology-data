import { exists, spinner, writeJson } from 'firost';
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

// TODO: Handle the commits.
// If they have a linked User, add the author as an alias in the User
// If not, add to default user, or manually link them
progress.success('All users generated');
