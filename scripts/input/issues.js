import { _, dayjs, pMap } from 'golgoth';
import { absolute, exists, sleep, spinner, writeJson } from 'firost';
import {
  getIssuesAndPulls,
  getIssuesAndPullsCount,
} from '../../lib/helpers/github.js';
import {
  fieldOrder,
  inputDirectory as issueInputDirectory,
} from '../../lib/helpers/issue.js';

const ISSUES_PER_PAGE = 100;
const PAGES_CONCURRENCY = 6;
const ITEMS_CONCURRENCY = 15;
const SLEEP_BETWEEN_PAGES = 300;

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

        // Skip pull requests
        if (isPullRequest) {
          return;
        }

        const datePath = dayjs(created_at).format('YYYY/MM');
        const itemPath = absolute(
          issueInputDirectory,
          datePath,
          `${number}.json`,
        );

        if (await exists(itemPath)) {
          return;
        }

        await writeJson(itemContent, itemPath, {
          sort: fieldOrder.input,
        });
      },
      { concurrency: ITEMS_CONCURRENCY },
    );

    progress.tick(`${tickMessage} (Throttling for rate limit...)`);
    await sleep(SLEEP_BETWEEN_PAGES);
  },
  { concurrency: PAGES_CONCURRENCY },
);
progress.success('All issues fetched');
