import { exists, spinner, writeJson } from 'firost';
import { getUser } from '../../lib/helpers/github.js';
import {
  fieldOrder,
  forEachGitHubUser,
  getInputPath,
} from '../../lib/helpers/user.js';

const progress = spinner();

// Get all users that ever interacted with the repo through issues, pull
// requests or comments. For each, save a dump of their profile in
// ./input/users.
await forEachGitHubUser(
  async (outputUser) => {
    const { index, max, id } = outputUser;
    progress.tick(`[${index}/${max}] ${id}`);

    const userPath = getInputPath(id);
    if (await exists(userPath)) {
      return;
    }

    const userData = await getUser(id);

    await writeJson(userData, userPath, {
      sort: fieldOrder.input,
    });
  },
  { concurrency: 50 },
);

progress.success('All users extracted');
