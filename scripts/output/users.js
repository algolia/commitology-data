import { exists, spinner, writeJson } from 'firost';
import {
  fieldOrder,
  forEachGitHubUser,
  getOutputPath,
  normalizeUser,
} from '../../lib/helpers/user.js';

const progress = spinner();

await forEachInputUser(
  async (outputUser) => {
    const { index, max, id } = outputUser;
    progress.tick(`[${index}/${max}] ${id}`);
    console.log(id);

    const userPath = getOutputPath(id);
    if (await exists(userPath)) {
      return;
    }

    const userData = await normalizeUser(id);
    console.log({ userData });

    // await writeJson(userData, userPath, {
    //   sort: fieldOrder,
    // });
  },
  { concurrency: 50 },
);

// TODO: Handle the commits.
// If they have a linked User, add the author as an alias in the User
// If not, add to default user, or manually link them
progress.success('All users generated');
