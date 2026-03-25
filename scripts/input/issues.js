import { dayjs, pMap } from 'golgoth';
import { absolute, exists, spinner, writeJson } from 'firost';
import {
  fieldOrder,
  forEachGitHubIssueYear,
  forEachGitHubPageOfYear,
  inputDirectory as issueInputDirectory,
} from '../../lib/helpers/issue.js';

const WRITE_CONCURRENCY = 15;

const progress = spinner();

await forEachGitHubIssueYear(async (year) => {
  return await forEachGitHubPageOfYear(year, async (issues, page) => {
    progress.tick(`Year ${year}, page ${page}`);

    // Save new issues
    let savedCount = 0;
    await pMap(
      issues,
      async (issue) => {
        const { number, created_at } = issue;
        const datePath = dayjs(created_at).format('YYYY/MM');
        const itemPath = absolute(
          issueInputDirectory,
          datePath,
          number,
          'issue.json',
        );

        if (await exists(itemPath)) {
          return;
        }

        await writeJson(issue, itemPath, {
          sort: fieldOrder.input,
        });
        savedCount++;
      },
      { concurrency: WRITE_CONCURRENCY },
    );

    // Continue only if we saved new items
    return savedCount > 0;
  });
});

progress.success('All issues fetched');
