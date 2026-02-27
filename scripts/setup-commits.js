import { pMap } from 'golgoth';
import { absolute, spinner, writeJson } from 'firost';
import { dataInputCommitsPath } from '../lib/config.js';
import { getCommitList } from '../lib/git.js';

// We define the path to instantsearch
// We find all commits in instantsearch
// We create a spinner from 0 to the number of commits
// For each commit, we extract informatoin from it
// We transform that into JSON an save it in ./data/input/commits/
// Because there will be a lot of file, we might need to split into YYYY/MM
// subfolders

const commitList = await getCommitList();
const progress = spinner(commitList.length);

await pMap(
  commitList,
  async (rawCommit) => {
    const { datePath, hash, subject } = rawCommit;
    const commitPath = absolute(dataInputCommitsPath, datePath, `${hash}.json`);
    const commitContent = {
      hash,
      subject,
    };
    await writeJson(commitContent, commitPath);
    progress.tick(subject);
  },
  { concurrency: 10 },
);
progress.success('All commits imported');
