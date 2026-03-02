import { _, dayjs, pMap } from 'golgoth';
import { absolute, sleep, spinner, writeJson } from 'firost';
import { dataInputPath, issueFieldOrder } from '../../lib/config.js';
import { getIssuesAndPulls, getIssuesAndPullsCount } from '../../lib/github.js';

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
        const datePath = dayjs(created_at).format('YYYY/MM');

        const itemPath = absolute(
          dataInputPath,
          isPullRequest ? 'pulls' : 'issues',
          datePath,
          `${number}.json`,
        );

        await writeJson(itemContent, itemPath, {
          sort: issueFieldOrder,
        });
      },
      { concurrency: 10 },
    );

    progress.tick(`${tickMessage} (Throttling for rate limit...)`);
    await sleep(1000);
  },
  { concurrency: 5 },
);
progress.success('All issues and pull requests fetched');
