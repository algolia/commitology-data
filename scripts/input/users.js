import { exists, spinner, writeJson } from 'firost';
import { getUser } from '../../lib/helpers/github.js';
import {
  fieldOrder,
  forEachUserIdEverMentioned,
  getInputPath,
} from '../../lib/helpers/user.js';

const progress = spinner();

// Get all users that ever interacted with the repo, and save a dump of their
// profile
await forEachUserIdEverMentioned(
  async (outputUser) => {
    const { index, max, id } = outputUser;
    progress.tick(`[${index}/${max}] User #${id}`);

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
