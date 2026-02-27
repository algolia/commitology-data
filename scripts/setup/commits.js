import { _, pMap } from 'golgoth';
import { absolute, spinner, writeJson } from 'firost';
import { commitFieldOrder, dataInputCommitsPath } from '../../lib/config.js';
import { getCommitData, getCommitList } from '../../lib/git.js';

// We define the path to instantsearch
// We find all commits in instantsearch
// We create a spinner from 0 to the number of commits
// For each commit, we extract informatoin from it
// We transform that into JSON an save it in ./data/input/commits/
// Because there will be a lot of file, we might need to split into YYYY/MM
// subfolders

const commitList = _.slice(await getCommitList(), 0, 12000);
const progress = spinner(commitList.length);

await pMap(
  commitList,
  async (rawCommit) => {
    const { datePath, hash, subject } = rawCommit;
    progress.tick(subject);

    // Commit path
    const commitPath = absolute(dataInputCommitsPath, datePath, `${hash}.json`);

    // Commit content
    const commitData = await getCommitData(hash);

    await writeJson(commitData, commitPath, {
      sort: commitFieldOrder,
    });
  },
  { concurrency: 50 },
);
progress.success('All commits imported');
