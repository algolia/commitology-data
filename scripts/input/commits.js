import { pMap } from 'golgoth';
import { absolute, exists, spinner, writeJson } from 'firost';
import { fieldOrder, inputDirectory } from '../../lib/helpers/commit.js';
import { getCommitData, getCommitList } from '../../lib/helpers/git.js';

const commitList = await getCommitList();
const progress = spinner(commitList.length);

await pMap(
  commitList,
  async (rawCommit) => {
    const { datePath, hash, subject } = rawCommit;
    progress.tick(subject);

    // Commit path
    const commitPath = absolute(inputDirectory, datePath, `${hash}.json`);

    // Skip if already extracted
    if (await exists(commitPath)) {
      progress.tick(`${subject} (Already exists, skipping)`);
      return;
    }

    // Commit content
    const commitData = await getCommitData(hash);

    await writeJson(commitData, commitPath, {
      sort: fieldOrder.input,
    });
  },
  { concurrency: 50 },
);
progress.success('All commits imported');
