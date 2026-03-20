import { _, dayjs, pMap } from 'golgoth';
import { absolute, exists, sleep, spinner, writeJson } from 'firost';
import {
  getIssuesAndPulls,
  getIssuesAndPullsCount,
  getPullRequestDetails,
} from '../../lib/helpers/github.js';
import { inputDirectory as pullInputDirectory } from '../../lib/helpers/pull.js';

const ISSUES_PER_PAGE = 100;

const itemCount = await getIssuesAndPullsCount();
const pageCount = _.ceil(itemCount / ISSUES_PER_PAGE);

const progress = spinner();

await pMap(
  _.range(pageCount),
  async (page) => {
    const tickMessage = `Fetching page ${page}/${pageCount}`;
    progress.tick(tickMessage);

    const items = await getIssuesAndPulls({
      page: page + 1,
      perPage: ISSUES_PER_PAGE,
    });

    await pMap(
      items,
      async (itemContent) => {
        const { pull_request, number, created_at } = itemContent;
        const isPullRequest = !!pull_request;

        // Skip issues
        if (!isPullRequest) {
          return;
        }

        const datePath = dayjs(created_at).format('YYYY/MM');
        const pullDirectory = absolute(
          pullInputDirectory,
          datePath,
          `${number}`,
        );
        const basicPath = absolute(pullDirectory, 'basic.json');
        const detailedPath = absolute(pullDirectory, 'detailed.json');

        // Skip if both files already exist
        if ((await exists(basicPath)) && (await exists(detailedPath))) {
          return;
        }

        // Save basic info
        if (!(await exists(basicPath))) {
          await writeJson(itemContent, basicPath);
        }

        // Fetch and save detailed info
        if (!(await exists(detailedPath))) {
          const detailedData = await getPullRequestDetails(number);
          await writeJson(detailedData, detailedPath);
        }
      },
      { concurrency: 10 },
    );

    progress.tick(`${tickMessage} (Throttling for rate limit...)`);
    await sleep(1000);
  },
  { concurrency: 5 },
);
progress.success('All pull requests fetched');
