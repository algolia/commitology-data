import { spinner, writeJson } from 'firost';
import { outputIssueFieldOrder } from '../../lib/config.js';
import {
  forEachInputIssue,
  getOutputPath,
  normalizeIssue,
} from '../../lib/helpers/issue.js';

const progress = spinner();

await forEachInputIssue(
  async (inputIssue) => {
    const { index, max, data } = inputIssue;
    progress.tick(`[${index}/${max}] ${data.title}`);

    const issueData = await normalizeIssue(data);
    const issuePath = getOutputPath(issueData);

    await writeJson(issueData, issuePath, {
      sort: outputIssueFieldOrder,
    });
  },
  { concurrency: 50 },
);
progress.success('All issues generated');
