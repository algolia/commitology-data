import { dayjs, pMap } from 'golgoth';
import { absolute, exists, readJson, spinner, writeJson } from 'firost';
import {
  fieldOrder,
  forEachGitHubPageOfYear,
  forEachGitHubYear,
  inputDirectory as issueInputDirectory,
} from '../../lib/helpers/issue.js';

const WRITE_CONCURRENCY = 15;

const progress = spinner();
let hasUpdatedIssues = false;

await forEachGitHubYear(async (year) => {
  progress.tick(`Year ${year}`);
  return await forEachGitHubPageOfYear(year, async (issues, page) => {
    progress.tick(`Year ${year}, page ${page}`);

    let pageHasUpdatedIssues = false;
    await pMap(
      issues,
      async (issue) => {
        const { number, created_at, updated_at } = issue;
        const datePath = dayjs(created_at).format('YYYY/MM');
        const itemPath = absolute(
          issueInputDirectory,
          datePath,
          number,
          'issue.json',
        );

        if (await exists(itemPath)) {
          const localIssue = await readJson(itemPath);
          if (localIssue.updated_at === updated_at) {
            return;
          }
        }

        await writeJson(issue, itemPath, {
          sort: fieldOrder.input,
        });
        pageHasUpdatedIssues = true;
      },
      { concurrency: WRITE_CONCURRENCY },
    );

    if (pageHasUpdatedIssues) {
      hasUpdatedIssues = true;
    }

    return pageHasUpdatedIssues;
  });
});

if (hasUpdatedIssues) {
  progress.success('All issues fetched');
} else {
  progress.success('No updated issues since last fetch');
}
