import { spinner, writeJson } from 'firost';
import {
  fieldOrder,
  forEachInputIssue,
  getOutputPath,
  normalizeIssue,
} from '../../lib/helpers/issue.js';

const progress = spinner();

await forEachInputIssue(
  async (inputIssue) => {
    const { index, max, filepath } = inputIssue;
    progress.tick(`[${index}/${max}] ${filepath}`);

    const issueData = await normalizeIssue(filepath);
    const issuePath = getOutputPath(issueData);

    await writeJson(issueData, issuePath, {
      sort: fieldOrder.output,
    });
  },
  { concurrency: 50 },
);
progress.success('All issues generated');
