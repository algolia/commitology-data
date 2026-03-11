import { pMap } from 'golgoth';
import { absolute, spinner, writeJson } from 'firost';
import {
  dataInputCommitsPath,
  inputCommitFieldOrder,
} from '../../lib/config.js';
import { getCommitData, getCommitList } from '../../lib/git.js';

const commitList = await getCommitList();
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
      sort: inputCommitFieldOrder,
    });
  },
  { concurrency: 50 },
);
progress.success('All commits imported');
