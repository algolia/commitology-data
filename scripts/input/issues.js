import { dayjs, pMap } from 'golgoth';
import { absolute, exists, spinner, writeJson } from 'firost';
import { getOldestIssue } from '../../lib/helpers/github.js';
import {
  fieldOrder,
  forEachGitHubIssueYear,
  forEachGitHubPageOfYear,
  inputDirectory as issueInputDirectory,
} from '../../lib/helpers/issue.js';

const WRITE_CONCURRENCY = 15;

const progress = spinner();

// Display date range
progress.tick('Finding oldest issue...');
const oldestIssue = await getOldestIssue();
if (!oldestIssue) {
  progress.success('No issues found in repository');
  process.exit(0);
}
const oldestYear = dayjs(oldestIssue.created_at).year();
const currentYear = dayjs().year();
progress.tick(
  `Processing issues from ${currentYear} to ${oldestYear} (oldest: #${oldestIssue.number})`,
);

let currentProcessingYear = null;
let totalSavedCount = 0;

await forEachGitHubIssueYear(async (year) => {
  // Display year change
  if (currentProcessingYear !== year) {
    currentProcessingYear = year;
    progress.tick(`Year ${year} - starting`);
  }

  return await forEachGitHubPageOfYear(year, async (issues, page) => {
    progress.tick(`Year ${year}, page ${page} - ${issues.length} issues`);

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

    totalSavedCount += savedCount;

    if (savedCount === 0) {
      progress.tick(
        `Year ${year}, page ${page} - all ${issues.length} already exist, stopping`,
      );
    } else {
      progress.tick(
        `Year ${year}, page ${page} - saved ${savedCount}/${issues.length} new issues`,
      );
    }

    // Continue only if we saved new items
    return savedCount > 0;
  });
});

if (totalSavedCount === 0) {
  progress.success('No new issues since last fetch');
} else {
  progress.success(`All issues fetched (${totalSavedCount} new)`);
}
