import { dayjs, pMap } from 'golgoth';
import { absolute, exists, spinner, writeJson } from 'firost';
import { getPullRequestDetails } from '../../lib/helpers/github.js';
import {
  forEachGitHubPageOfYear,
  forEachGitHubYear,
  inputDirectory as pullInputDirectory,
} from '../../lib/helpers/pull.js';

const WRITE_CONCURRENCY = 15;

const progress = spinner();
let hasNewPulls = false;

await forEachGitHubYear(async (year) => {
  progress.tick(`Year ${year}`);
  return await forEachGitHubPageOfYear(year, async (pulls, page) => {
    progress.tick(`Year ${year}, page ${page}`);

    let pageHasNewPulls = false;
    await pMap(
      pulls,
      async (pull) => {
        const { number, created_at } = pull;
        const datePath = dayjs(created_at).format('YYYY/MM');
        const pullDirectory = absolute(pullInputDirectory, datePath, number);
        const basicPath = absolute(pullDirectory, 'basic.json');
        const detailedPath = absolute(pullDirectory, 'detailed.json');

        // Save basic info
        if (!(await exists(basicPath))) {
          await writeJson(pull, basicPath);
          pageHasNewPulls = true;
        }

        // Fetch and save detailed info
        if (!(await exists(detailedPath))) {
          const detailedData = await getPullRequestDetails(number);
          await writeJson(detailedData, detailedPath);
          pageHasNewPulls = true;
        }
      },
      { concurrency: WRITE_CONCURRENCY },
    );

    if (pageHasNewPulls) {
      hasNewPulls = true;
    }

    return pageHasNewPulls;
  });
});

if (hasNewPulls) {
  progress.success('All pull requests fetched');
} else {
  progress.success('No new pull requests since last fetch');
}
