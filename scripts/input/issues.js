import { dayjs, pMap } from 'golgoth';
import { absolute, exists, spinner, writeJson } from 'firost';
import {
  fieldOrder,
  forEachGitHubPageOfYear,
  forEachGitHubYear,
  inputDirectory as issueInputDirectory,
} from '../../lib/helpers/issue.js';

const WRITE_CONCURRENCY = 15;

const progress = spinner();
let totalSavedCount = 0;

await forEachGitHubYear(async (year) => {
  progress.tick(`Year ${year}`);
  return await forEachGitHubPageOfYear(year, async (issues, page) => {
    progress.tick(`Year ${year}, page ${page}`);

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

    totalSavedCount += savedCount;

    return savedCount > 0;
  });
});

if (totalSavedCount === 0) {
  progress.success('No new issues since last fetch');
} else {
  progress.success(`All issues fetched (${totalSavedCount} new)`);
}
