import { spinner, writeJson } from 'firost';
import {
  fieldOrder,
  forEachOutputUser,
  getOutputPath,
  normalizePull,
} from '../../lib/helpers/user.js';

const progress = spinner();

await forEachGitHubUser(
  async (outputUser) => {
    const { index, max, id } = outputUser;
    progress.tick(`[${index}/${max}] ${id}`);

    const userData = await normalizeUser(id);
    const userPath = getOutputPath(userData);

    await writeJson(userData, userPath, {
      sort: fieldOrder,
    });
  },
  { concurrency: 50 },
);

// TODO: Handle the commits.
// If they have a linked User, add the author as an alias in the User
// If not, add to default user, or manually link them
progress.success('All users generated');
