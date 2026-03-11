import { _, pMap } from 'golgoth';
import { absolute, glob, readJson, spinner, writeJson } from 'firost';
import {
  dataInputCommitsPath,
  dataOutputCommitsPath,
  outputCommitFieldOrder,
} from '../../lib/config.js';
import { datePath } from '../../lib/helper.js';

const rawCommitPaths = await glob('./**/*.json', { cwd: dataInputCommitsPath });
const progress = spinner(rawCommitPaths.length);

await pMap(
  rawCommitPaths,
  async (rawCommitPath) => {
    const rawCommitData = await readJson(rawCommitPath);
    const { author, subject, hash, body, date } = rawCommitData;
    progress.tick(subject);

    const shortHash = hash.substring(0, 7);
    const bodyLines = _.split(body, '\n');

    const commitData = {
      hash: shortHash,
      author,
      subject,
      bodyLines,
      date,
    };

    const commitPath = absolute(
      dataOutputCommitsPath,
      datePath(date),
      `${shortHash}.json`,
    );

    await writeJson(commitData, commitPath, {
      sort: outputCommitFieldOrder,
    });
  },
  { concurrency: 50 },
);
progress.success('All commits generated');
