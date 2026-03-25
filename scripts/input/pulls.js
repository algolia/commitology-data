import { dayjs, pMap } from 'golgoth';
import { absolute, exists, readJson, spinner, writeJson } from 'firost';
import { getPullRequestDetails } from '../../lib/helpers/github.js';
import {
  forEachGitHubPageOfYear,
  forEachGitHubYear,
  inputDirectory as pullInputDirectory,
} from '../../lib/helpers/pull.js';

const WRITE_CONCURRENCY = 15;

const progress = spinner();
let hasUpdatedPulls = false;

await forEachGitHubYear(async (year) => {
  progress.tick(`Year ${year}`);
  return await forEachGitHubPageOfYear(year, async (pulls, page) => {
    progress.tick(`Year ${year}, page ${page}`);

    let pageHasUpdatedPulls = false;
    await pMap(
      pulls,
      async (pull) => {
        const { number, created_at, updated_at } = pull;
        const datePath = dayjs(created_at).format('YYYY/MM');
        const pullDirectory = absolute(pullInputDirectory, datePath, number);
        const pullPath = absolute(pullDirectory, 'pull.json');
        const detailedPath = absolute(pullDirectory, 'detailed.json');

        // Save pull info
        if (await exists(pullPath)) {
          const localPull = await readJson(pullPath);
          if (localPull.updated_at === updated_at) {
            return;
          }
        }

        await writeJson(pull, pullPath);
        pageHasUpdatedPulls = true;

        // Fetch and save detailed info
        if (!(await exists(detailedPath))) {
          const detailedData = await getPullRequestDetails(number);
          await writeJson(detailedData, detailedPath);
        }
      },
      { concurrency: WRITE_CONCURRENCY },
    );

    if (pageHasUpdatedPulls) {
      hasUpdatedPulls = true;
    }

    return pageHasUpdatedPulls;
  });
});

if (hasUpdatedPulls) {
  progress.success('All pull requests fetched');
} else {
  progress.success('No updated pull requests since last fetch');
}
