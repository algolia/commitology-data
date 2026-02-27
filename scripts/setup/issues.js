import { _, dayjs, pMap } from 'golgoth';
import { absolute, sleep, spinner, writeJson } from 'firost';
import { dataInputIssuesPath, issueFieldOrder } from '../../lib/config.js';
import { __, getIssueCount, getIssues } from '../../lib/github.js';

// The current code iterates over all search results to filter out just the issues.
// We're hitting rate limits sometimes from making too many calls at once. To
// handle this, we have a retry system that catches 403 errors, waits a bit, and
// retries up to 3 times before moving on. This helps reduce the rate limit issues.
//
// But we're still running into HTTP 422 errors because the search API caps at 1000
// results. So we need to switch to using the issues API instead. From GitHub's
// perspective, issues and pull requests are the same thing - they're all "issues".
// We'll iterate over everything through that endpoint and save them in the right
// places.

const ISSUES_PER_PAGE = 100;

const issueCount = await getIssueCount();
const pageCount = _.ceil(issueCount / ISSUES_PER_PAGE);

const progress = spinner();

await pMap(
  _.range(pageCount),
  async (page) => {
    const issueStart = page * ISSUES_PER_PAGE;
    const issueEnd = issueStart + ISSUES_PER_PAGE;
    const tickMessage = `Fetching issues ${issueStart}-${issueEnd} / ${issueCount}`;
    progress.tick(tickMessage);

    const issues = await getIssues({
      page: page + 1,
      perPage: ISSUES_PER_PAGE,
    });

    await pMap(
      issues,
      async (issueContent) => {
        const { number, createdAt } = issueContent;
        const datePath = dayjs(createdAt).format('YYYY/MM');

        const issuePath = absolute(
          dataInputIssuesPath,
          datePath,
          `${number}.json`,
        );

        await writeJson(issueContent, issuePath, {
          sort: issueFieldOrder,
        });
      },
      { concurrency: 10 },
    );

    progress.tick(`${tickMessage} (Waiting for rate limit...)`);
    await sleep(1000);
  },
  { concurrency: 1 },
);
progress.success('All issues fetched');
